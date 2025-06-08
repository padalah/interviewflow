from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import uvicorn
import os
import logging
import json
import asyncio
import time
import hashlib
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, validator
from dotenv import load_dotenv
import google.generativeai as genai
from collections import defaultdict
import PyPDF2
import docx
from io import BytesIO
import re

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("interviewflow")

# Initialize Google Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    logger.error("GOOGLE_API_KEY not found in environment variables")
    raise ValueError("GOOGLE_API_KEY must be set")

genai.configure(api_key=api_key)

# Initialize FastAPI app
app = FastAPI(
    title="InterviewFlow AI API",
    description="AI-powered interview practice platform",
    version="1.0.0"
)

# Security
security = HTTPBearer(auto_error=False)

# Configure CORS with specific origins for security
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Rate limiting
rate_limit_storage: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"requests": [], "audio_chunks": []})
REQUESTS_PER_MINUTE = int(os.getenv("REQUESTS_PER_MINUTE", "60"))
AUDIO_CHUNKS_PER_MINUTE = int(os.getenv("AUDIO_CHUNKS_PER_MINUTE", "300"))

# In-memory session store (in production, use Redis or database)
active_sessions: Dict[str, Dict[str, Any]] = {}

# Pydantic models for request validation
class StartInterviewRequest(BaseModel):
    interviewType: str
    planTier: str
    resumeData: Optional[str] = None
    jobDescription: Optional[str] = None
    companyCulture: Optional[str] = None

    @validator('interviewType')
    def validate_interview_type(cls, v):
        valid_types = ["general", "behavioral", "technical"]
        if v not in valid_types:
            raise ValueError(f"Interview type must be one of: {valid_types}")
        return v

    @validator('planTier')
    def validate_plan_tier(cls, v):
        valid_tiers = ["free", "premium"]
        if v not in valid_tiers:
            raise ValueError(f"Plan tier must be one of: {valid_tiers}")
        return v

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, session_id: str, client_ip: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        self.connection_metadata[session_id] = {
            "connected_at": time.time(),
            "client_ip": client_ip,
            "last_activity": time.time()
        }
        logger.info(f"WebSocket connected for session: {session_id} from IP: {client_ip}")

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.connection_metadata:
            del self.connection_metadata[session_id]
        logger.info(f"WebSocket disconnected for session: {session_id}")

    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_text(json.dumps(message))
                if session_id in self.connection_metadata:
                    self.connection_metadata[session_id]["last_activity"] = time.time()
            except Exception as e:
                logger.error(f"Error sending message to {session_id}: {e}")
                self.disconnect(session_id)

    async def send_audio(self, session_id: str, audio_data: bytes):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_bytes(audio_data)
                if session_id in self.connection_metadata:
                    self.connection_metadata[session_id]["last_activity"] = time.time()
            except Exception as e:
                logger.error(f"Error sending audio to {session_id}: {e}")
                self.disconnect(session_id)

manager = ConnectionManager()

def get_client_ip(websocket: WebSocket) -> str:
    """Extract client IP for rate limiting"""
    return websocket.client.host if websocket.client else "unknown"

def check_rate_limit(client_id: str, limit_type: str, limit: int) -> bool:
    """Check if client has exceeded rate limits"""
    now = time.time()
    minute_ago = now - 60
    
    # Clean old entries
    rate_limit_storage[client_id][limit_type] = [
        timestamp for timestamp in rate_limit_storage[client_id][limit_type]
        if timestamp > minute_ago
    ]
    
    # Check limit
    if len(rate_limit_storage[client_id][limit_type]) >= limit:
        return False
    
    # Add current request
    rate_limit_storage[client_id][limit_type].append(now)
    return True

def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS and injection attacks"""
    if not text:
        return ""
    
    # Remove potential script tags and SQL injection attempts
    text = re.sub(r'<script.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    text = re.sub(r'on\w+\s*=', '', text, flags=re.IGNORECASE)
    text = re.sub(r'(union|select|insert|update|delete|drop|create|alter)\s+', '', text, flags=re.IGNORECASE)
    
    return text.strip()

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_file = BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return sanitize_input(text)
    except Exception as e:
        logger.error(f"Error extracting PDF text: {e}")
        raise HTTPException(status_code=400, detail="Failed to process PDF file")

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc_file = BytesIO(file_content)
        doc = docx.Document(doc_file)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return sanitize_input(text)
    except Exception as e:
        logger.error(f"Error extracting DOCX text: {e}")
        raise HTTPException(status_code=400, detail="Failed to process DOCX file")

def generate_session_id() -> str:
    """Generate a secure session ID"""
    timestamp = str(int(time.time()))
    random_data = os.urandom(16).hex()
    return f"session_{hashlib.sha256((timestamp + random_data).encode()).hexdigest()[:16]}"

async def generate_gemini_response(session_data: Dict[str, Any], user_input: str) -> str:
    """Generate AI response using Gemini API"""
    try:
        interview_type = session_data.get("interview_type", "general")
        plan_tier = session_data.get("plan_tier", "free")
        
        # Build context based on available data
        context = f"You are conducting a {interview_type} interview. "
        
        if plan_tier == "premium":
            resume_data = session_data.get("resume_data", "")
            job_description = session_data.get("job_description", "")
            company_culture = session_data.get("company_culture", "")
            
            if resume_data:
                context += f"Candidate's resume: {resume_data[:500]}... "
            if job_description:
                context += f"Job description: {job_description[:500]}... "
            if company_culture:
                context += f"Company culture: {company_culture}. "
        
        context += "Ask relevant questions and provide appropriate responses. Keep responses concise and professional."
        
        # For MVP, return mock responses based on interview type
        responses = {
            "general": [
                "That's interesting. Can you tell me more about your experience with that?",
                "How do you think that experience prepared you for this role?",
                "What challenges did you face and how did you overcome them?",
                "Can you give me a specific example of when you demonstrated leadership?",
            ],
            "behavioral": [
                "I'd like to hear about a specific situation. Can you walk me through what happened using the STAR method?",
                "What was the outcome of that situation, and what did you learn?",
                "How would you handle a similar situation differently now?",
                "Tell me about a time when you had to work with a difficult team member.",
            ],
            "technical": [
                "Good approach. How would you optimize that solution for better performance?",
                "What's the time and space complexity of your solution?",
                "Can you think of any edge cases we should consider?",
                "How would you test this code to ensure it works correctly?",
            ]
        }
        
        import random
        return random.choice(responses.get(interview_type, responses["general"]))
        
    except Exception as e:
        logger.error(f"Error generating Gemini response: {e}")
        return "I see. Can you elaborate on that point?"

def generate_feedback(session_data: Dict[str, Any], user_response: str, plan_tier: str) -> Dict[str, Any]:
    """Generate feedback based on user response and plan tier"""
    import random
    
    # Mock feedback generation
    scores = {
        "clarity": random.randint(60, 95),
        "confidence": random.randint(55, 90),
        "relevance": random.randint(65, 95),
        "structure": random.randint(60, 90),
    }
    
    if plan_tier == "premium":
        return {
            "content": "Your response demonstrated good understanding of the topic. Consider providing more specific examples to strengthen your answer.",
            "score": sum(scores.values()) // len(scores),
            "detailed_scores": scores,
            "suggestions": [
                "Use the STAR method for behavioral questions",
                "Include quantifiable results when possible",
                "Practice maintaining eye contact and confident body language",
                "Prepare specific examples that demonstrate your skills"
            ]
        }
    else:
        return {
            "content": "Good response! Consider being more specific with examples.",
            "score": sum(scores.values()) // len(scores)
        }

@app.get("/")
async def root():
    return {
        "message": "Welcome to InterviewFlow AI API",
        "status": "healthy",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": int(time.time()),
        "active_sessions": len(active_sessions),
        "active_connections": len(manager.active_connections)
    }

@app.post("/start_interview")
async def start_interview(request: StartInterviewRequest):
    try:
        # Generate secure session ID
        session_id = generate_session_id()
        
        # Sanitize inputs
        resume_data = sanitize_input(request.resumeData) if request.resumeData else ""
        job_description = sanitize_input(request.jobDescription) if request.jobDescription else ""
        company_culture = sanitize_input(request.companyCulture) if request.companyCulture else ""
        
        # Initialize session with enhanced data
        session_data = {
            "interview_type": request.interviewType,
            "plan_tier": request.planTier,
            "status": "setup",
            "messages": [],
            "created_at": time.time(),
            "resume_data": resume_data,
            "job_description": job_description,
            "company_culture": company_culture,
            "feedback_history": []
        }
        
        active_sessions[session_id] = session_data
        
        # Generate personalized initial greeting
        if request.planTier == "premium" and (resume_data or job_description):
            if request.interviewType == "technical":
                greeting = "Welcome to your technical interview! I've reviewed your background and the role requirements. We'll start with some conceptual questions and then move to coding challenges. Are you ready to begin?"
            elif request.interviewType == "behavioral":
                greeting = "Hi! I'm excited to conduct this behavioral interview with you. I've looked over your experience and the role you're targeting. I'll be asking about specific situations that demonstrate your skills. Shall we start?"
            else:
                greeting = "Hello! Welcome to your personalized interview practice. I've reviewed your background and will tailor my questions accordingly. Let's begin with some general questions about your experience."
        else:
            greetings = {
                "general": "Hello! I'm your AI interviewer. I'm here to help you practice your interview skills with realistic questions. Are you ready to begin?",
                "behavioral": "Hi there! I'll be conducting a behavioral interview with you today, focusing on your past experiences using the STAR method. Shall we start?",
                "technical": "Welcome! I'm here to conduct a technical interview covering both concepts and problem-solving. Ready to dive in?"
            }
            greeting = greetings.get(request.interviewType, greetings["general"])
        
        # Use environment variable for WebSocket URL in production
        ws_host = os.getenv("WEBSOCKET_HOST", "localhost:8000")
        websocket_url = f"ws://{ws_host}/ws/{session_id}"
        
        logger.info(f"Started interview session: {session_id}, type: {request.interviewType}, tier: {request.planTier}")
        
        return {
            "sessionId": session_id,
            "initialGreeting": greeting,
            "websocketUrl": websocket_url
        }
        
    except Exception as e:
        logger.error(f"Error starting interview: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/upload_document")
async def upload_document(file: UploadFile = File(...)):
    """Handle document uploads for premium users"""
    try:
        # Validate file type
        allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Unsupported file type")
        
        # Validate file size (5MB limit)
        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large")
        
        # Extract text based on file type
        if file.content_type == "application/pdf":
            extracted_text = extract_text_from_pdf(file_content)
        elif file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            extracted_text = extract_text_from_docx(file_content)
        else:  # text/plain
            extracted_text = sanitize_input(file_content.decode('utf-8'))
        
        return {
            "success": True,
            "extractedText": extracted_text[:2000],  # Limit text length
            "filename": file.filename
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing document upload: {e}")
        raise HTTPException(status_code=500, detail="Error processing document")

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    client_ip = get_client_ip(websocket)
    
    # Validate session exists
    if session_id not in active_sessions:
        await websocket.close(code=4004, reason="Session not found")
        return
    
    await manager.connect(websocket, session_id, client_ip)
    
    try:
        session = active_sessions[session_id]
        session["status"] = "active"
        
        # Send welcome message
        await manager.send_message(session_id, {
            "type": "control",
            "data": {"status": "connected", "message": "Interview session is ready"},
            "timestamp": int(time.time() * 1000)
        })
        
        while True:
            try:
                data = await websocket.receive()
                
                if data["type"] == "websocket.receive":
                    if "text" in data:
                        # Handle JSON control messages
                        message = json.loads(data["text"])
                        await handle_control_message(session_id, message)
                    elif "bytes" in data:
                        # Check rate limit for audio chunks
                        if not check_rate_limit(client_ip, "audio_chunks", AUDIO_CHUNKS_PER_MINUTE):
                            await manager.send_message(session_id, {
                                "type": "error",
                                "data": {"message": "Rate limit exceeded for audio"},
                                "timestamp": int(time.time() * 1000)
                            })
                            continue
                        
                        # Handle audio data
                        await handle_audio_data(session_id, data["bytes"])
                        
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON received: {e}")
                await manager.send_message(session_id, {
                    "type": "error",
                    "data": {"message": "Invalid message format"},
                    "timestamp": int(time.time() * 1000)
                })
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                break
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session: {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error for session {session_id}: {e}")
    finally:
        manager.disconnect(session_id)
        if session_id in active_sessions:
            active_sessions[session_id]["status"] = "completed"
            active_sessions[session_id]["end_time"] = time.time()

async def handle_control_message(session_id: str, message: dict):
    """Handle control messages from the frontend"""
    try:
        message_type = message.get("type")
        data = message.get("data", {})
        
        if message_type == "control":
            action = data.get("action")
            
            if action == "start_interview":
                await manager.send_message(session_id, {
                    "type": "control",
                    "data": {"status": "started"},
                    "timestamp": int(time.time() * 1000)
                })
                
            elif action == "end_interview":
                await manager.send_message(session_id, {
                    "type": "control",
                    "data": {"status": "ended"},
                    "timestamp": int(time.time() * 1000)
                })
                
        elif message_type == "transcript":
            user_text = sanitize_input(data.get("text", ""))
            if user_text:
                await handle_user_message(session_id, user_text)
                
    except Exception as e:
        logger.error(f"Error handling control message: {e}")
        await manager.send_message(session_id, {
            "type": "error",
            "data": {"message": "Error processing message"},
            "timestamp": int(time.time() * 1000)
        })

async def handle_audio_data(session_id: str, audio_data: bytes):
    """Handle incoming audio data from the user"""
    try:
        logger.info(f"Received audio data for session {session_id}: {len(audio_data)} bytes")
        
        session = active_sessions.get(session_id, {})
        
        # Simulate audio processing (in production, integrate with real STT)
        await asyncio.sleep(0.5)
        
        # Mock transcript generation
        mock_transcripts = [
            "I have experience working with Python and JavaScript",
            "In my previous role, I led a team of five developers",
            "I believe in continuous learning and staying updated with technology",
            "One of my biggest achievements was optimizing the database queries",
            "I'm passionate about creating user-friendly applications"
        ]
        
        import random
        user_transcript = random.choice(mock_transcripts)
        
        # Send user transcript
        await manager.send_message(session_id, {
            "type": "transcript",
            "data": {
                "speaker": "user",
                "text": user_transcript
            },
            "timestamp": int(time.time() * 1000)
        })
        
        # Generate AI response
        await asyncio.sleep(1)
        ai_response = await generate_gemini_response(session, user_transcript)
        
        await manager.send_message(session_id, {
            "type": "transcript",
            "data": {
                "speaker": "ai",
                "text": ai_response
            },
            "timestamp": int(time.time() * 1000)
        })
        
        # Generate feedback
        plan_tier = session.get("plan_tier", "free")
        feedback_data = generate_feedback(session, user_transcript, plan_tier)
        
        await manager.send_message(session_id, {
            "type": "feedback",
            "data": feedback_data,
            "timestamp": int(time.time() * 1000)
        })
        
        # Store feedback in session
        session.setdefault("feedback_history", []).append(feedback_data)
        
    except Exception as e:
        logger.error(f"Error handling audio data: {e}")
        await manager.send_message(session_id, {
            "type": "error",
            "data": {"message": "Error processing audio"},
            "timestamp": int(time.time() * 1000)
        })

async def handle_user_message(session_id: str, text: str):
    """Handle user text messages"""
    try:
        if session_id in active_sessions:
            active_sessions[session_id]["messages"].append({
                "type": "user",
                "content": text,
                "timestamp": time.time()
            })
        
        # Generate AI response
        session = active_sessions.get(session_id, {})
        ai_response = await generate_gemini_response(session, text)
        
        await manager.send_message(session_id, {
            "type": "transcript",
            "data": {
                "speaker": "ai",
                "text": ai_response
            },
            "timestamp": int(time.time() * 1000)
        })
        
    except Exception as e:
        logger.error(f"Error handling user message: {e}")

@app.get("/check_usage/{session_id}")
async def check_usage(session_id: str):
    """Check usage for rate limiting"""
    try:
        # Mock usage data for MVP
        return {
            "interviews_remaining": 2,
            "daily_limit": 3,
            "plan_tier": "free",
            "reset_time": int(time.time()) + 3600  # Reset in 1 hour
        }
    except Exception as e:
        logger.error(f"Error checking usage: {e}")
        raise HTTPException(status_code=500, detail="Error checking usage")

@app.post("/mock_upgrade/{session_id}")
async def mock_upgrade(session_id: str):
    """Mock plan upgrade for testing premium features"""
    try:
        if session_id in active_sessions:
            active_sessions[session_id]["plan_tier"] = "premium"
            logger.info(f"Session {session_id} upgraded to premium")
            return {"success": True, "new_plan_status": "premium"}
        else:
            raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        logger.error(f"Error upgrading plan: {e}")
        raise HTTPException(status_code=500, detail="Error upgrading plan")

@app.get("/session/{session_id}/summary")
async def get_session_summary(session_id: str):
    """Get interview session summary"""
    try:
        if session_id not in active_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = active_sessions[session_id]
        
        return {
            "sessionId": session_id,
            "interviewType": session.get("interview_type"),
            "planTier": session.get("plan_tier"),
            "duration": time.time() - session.get("created_at", 0),
            "messageCount": len(session.get("messages", [])),
            "feedbackHistory": session.get("feedback_history", []),
            "status": session.get("status")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session summary: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving session summary")

if __name__ == "__main__":
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )