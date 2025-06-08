from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import logging
import json
import asyncio
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import google.generativeai as genai

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
app = FastAPI(title="InterviewFlow AI API")

# Configure CORS with specific origins for security
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# In-memory session store
active_sessions: Dict[str, Dict[str, Any]] = {}

# Rate limiting storage (simple in-memory for MVP)
rate_limit_storage: Dict[str, Dict[str, Any]] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
        logger.info(f"WebSocket connected for session: {session_id}")

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
            logger.info(f"WebSocket disconnected for session: {session_id}")

    async def send_message(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to {session_id}: {e}")
                self.disconnect(session_id)

    async def send_audio(self, session_id: str, audio_data: bytes):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_bytes(audio_data)
            except Exception as e:
                logger.error(f"Error sending audio to {session_id}: {e}")
                self.disconnect(session_id)

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "Welcome to InterviewFlow AI API", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}

@app.post("/start_interview")
async def start_interview(request: dict):
    try:
        # Input validation
        if not isinstance(request, dict):
            raise HTTPException(status_code=400, detail="Invalid request format")
        
        interview_type = request.get("interviewType", "general")
        plan_tier = request.get("planTier", "free")
        
        # Validate inputs
        valid_types = ["general", "behavioral", "technical"]
        valid_tiers = ["free", "premium"]
        
        if interview_type not in valid_types:
            raise HTTPException(status_code=400, detail="Invalid interview type")
        
        if plan_tier not in valid_tiers:
            raise HTTPException(status_code=400, detail="Invalid plan tier")
        
        # Generate session ID
        import time
        session_id = f"session_{int(time.time())}"
        
        # Initialize session
        active_sessions[session_id] = {
            "interview_type": interview_type,
            "plan_tier": plan_tier,
            "status": "setup",
            "messages": [],
            "created_at": time.time()
        }
        
        # Generate initial greeting based on interview type
        greetings = {
            "general": "Hello! I'm your AI interviewer. I'm excited to help you practice your interview skills today. Are you ready to begin?",
            "behavioral": "Hi there! I'll be conducting a behavioral interview with you today, focusing on your past experiences and how they demonstrate your skills. Shall we start?",
            "technical": "Welcome! I'm here to conduct a technical interview. We'll cover both theoretical concepts and practical problem-solving. Ready to begin?"
        }
        
        initial_greeting = greetings.get(interview_type, greetings["general"])
        
        logger.info(f"Started interview session: {session_id}, type: {interview_type}, tier: {plan_tier}")
        
        return {
            "sessionId": session_id,
            "initialGreeting": initial_greeting,
            "websocketUrl": f"ws://localhost:8000/ws/{session_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting interview: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    # Validate session exists
    if session_id not in active_sessions:
        await websocket.close(code=4004, reason="Session not found")
        return
    
    await manager.connect(websocket, session_id)
    
    try:
        # Send initial greeting
        session = active_sessions[session_id]
        session["status"] = "active"
        
        # Send welcome message
        await manager.send_message(session_id, {
            "type": "transcript",
            "data": {
                "speaker": "ai",
                "text": "Hello! I'm ready to begin the interview. Please click the microphone button and start speaking when you're ready."
            },
            "timestamp": int(time.time() * 1000)
        })
        
        while True:
            # Handle both text and binary messages
            try:
                # Try to receive as text first
                data = await websocket.receive()
                
                if data["type"] == "websocket.receive":
                    if "text" in data:
                        # Handle JSON control messages
                        message = json.loads(data["text"])
                        await handle_control_message(session_id, message)
                    elif "bytes" in data:
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
        # Clean up session
        if session_id in active_sessions:
            active_sessions[session_id]["status"] = "completed"

async def handle_control_message(session_id: str, message: dict):
    """Handle control messages from the frontend"""
    try:
        message_type = message.get("type")
        data = message.get("data", {})
        
        if message_type == "control":
            action = data.get("action")
            
            if action == "start_interview":
                # Interview already started, send confirmation
                await manager.send_message(session_id, {
                    "type": "control",
                    "data": {"status": "started"},
                    "timestamp": int(time.time() * 1000)
                })
                
            elif action == "end_interview":
                # End the interview
                await manager.send_message(session_id, {
                    "type": "control",
                    "data": {"status": "ended"},
                    "timestamp": int(time.time() * 1000)
                })
                # Session will be cleaned up in the finally block
                
        elif message_type == "transcript":
            # Handle user transcript (for future STT integration)
            user_text = data.get("text", "")
            if user_text:
                # Echo back user's message and generate AI response
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
        # For MVP, we'll simulate processing audio
        # In full implementation, this would integrate with Gemini Live API
        
        logger.info(f"Received audio data for session {session_id}: {len(audio_data)} bytes")
        
        # Simulate transcript generation
        await asyncio.sleep(0.5)  # Simulate processing time
        
        # Mock transcript
        await manager.send_message(session_id, {
            "type": "transcript",
            "data": {
                "speaker": "user",
                "text": "[Audio received - transcript would appear here]"
            },
            "timestamp": int(time.time() * 1000)
        })
        
        # Simulate AI response
        await asyncio.sleep(1)
        
        session = active_sessions.get(session_id, {})
        interview_type = session.get("interview_type", "general")
        plan_tier = session.get("plan_tier", "free")
        
        # Generate mock AI response based on interview type
        ai_responses = {
            "general": "That's interesting. Can you tell me more about your experience with that?",
            "behavioral": "I'd like to hear about a specific situation. Can you walk me through what happened?",
            "technical": "Good point. How would you approach optimizing that solution?"
        }
        
        ai_response = ai_responses.get(interview_type, ai_responses["general"])
        
        await manager.send_message(session_id, {
            "type": "transcript",
            "data": {
                "speaker": "ai",
                "text": ai_response
            },
            "timestamp": int(time.time() * 1000)
        })
        
        # Generate feedback based on plan tier
        if plan_tier == "premium":
            await manager.send_message(session_id, {
                "type": "feedback",
                "data": {
                    "content": "Your response showed good structure. Consider providing more specific examples to strengthen your answer.",
                    "score": 75,
                    "suggestions": [
                        "Use the STAR method for behavioral questions",
                        "Include quantifiable results when possible",
                        "Speak with confidence and maintain eye contact"
                    ]
                },
                "timestamp": int(time.time() * 1000)
            })
        else:
            await manager.send_message(session_id, {
                "type": "feedback",
                "data": {
                    "content": "Good response! Consider being more specific with examples.",
                    "score": 75
                },
                "timestamp": int(time.time() * 1000)
            })
        
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
        # Add user message to session
        if session_id in active_sessions:
            active_sessions[session_id]["messages"].append({
                "type": "user",
                "content": text,
                "timestamp": time.time()
            })
        
        # Generate AI response (mock for MVP)
        ai_response = "Thank you for sharing that. Can you elaborate on the specific challenges you faced?"
        
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
    """Check usage for rate limiting (MVP implementation)"""
    try:
        # Mock usage check for free tier
        return {
            "interviews_remaining": 2,
            "daily_limit": 3,
            "plan_tier": "free"
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
            return {"success": True, "new_plan_status": "premium"}
        else:
            raise HTTPException(status_code=404, detail="Session not found")
    except Exception as e:
        logger.error(f"Error upgrading plan: {e}")
        raise HTTPException(status_code=500, detail="Error upgrading plan")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)