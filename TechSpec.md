# InterviewFlow AI - Technical Specification

## 1. Architecture Overview

### 1.1 System Architecture
InterviewFlow AI follows a client-server architecture with the following components:
- **Frontend**: React.js SPA with Tailwind CSS
- **Backend**: Python FastAPI server
- **External Services**: Google Gemini Live API

### 1.2 High-Level Architecture Diagram
```
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│  React.js   │◄────►│ Python      │◄────►│  Google Gemini  │
│  Frontend   │      │ FastAPI     │      │  Live API       │
└─────────────┘      └─────────────┘      └─────────────────┘
       ▲                    ▲
       │                    │
       ▼                    ▼
┌─────────────┐      ┌─────────────┐
│ Web Audio   │      │ Document    │
│ API         │      │ Processing  │
└─────────────┘      └─────────────┘
```

### 1.3 Technology Stack
- **Frontend**:
  - React.js (18.x)
  - TypeScript
  - Tailwind CSS
  - Web Audio API
  - WebSockets API
  - CodeMirror/Monaco Editor (for technical interviews)
  
- **Backend**:
  - Python 3.9+
  - FastAPI
  - WebSockets
  - Google Generative AI SDK
  - PyPDF2/python-docx (for document parsing)

## 2. Frontend Specification

### 2.1 Component Structure
```
src/
├── components/
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── interview/
│   │   ├── AudioRecorder.tsx
│   │   ├── Transcript.tsx
│   │   ├── Feedback.tsx
│   │   ├── CodeEditor.tsx
│   │   └── ...
│   ├── premium/
│   │   ├── DocumentUpload.tsx
│   │   ├── CultureSelector.tsx
│   │   └── ...
│   └── layout/
│       ├── Header.tsx
│       ├── Footer.tsx
│       └── ...
├── hooks/
│   ├── useAudio.ts
│   ├── useWebSocket.ts
│   ├── useInterviewState.ts
│   └── ...
├── contexts/
│   ├── InterviewContext.tsx
│   ├── PlanContext.tsx
│   └── ...
├── pages/
│   ├── Home.tsx
│   ├── Interview.tsx
│   ├── Pricing.tsx
│   └── ...
├── api/
│   ├── websocket.ts
│   ├── interview.ts
│   └── ...
├── types/
│   ├── interview.ts
│   ├── feedback.ts
│   └── ...
├── utils/
│   ├── audio.ts
│   ├── formatting.ts
│   └── ...
├── App.tsx
├── main.tsx
└── index.css
```

### 2.2 Key Components

#### 2.2.1 AudioRecorder Component
- Manages microphone access and recording
- Provides visual feedback for recording status
- Handles audio streaming to backend via WebSocket

#### 2.2.2 Transcript Component
- Displays real-time transcripts of user and AI speech
- Highlights current speaker
- Supports scrolling for longer conversations

#### 2.2.3 Feedback Component
- Shows real-time feedback during interview
- Displays summary feedback at the end
- Adapts display based on user tier (basic vs. detailed)

#### 2.2.4 CodeEditor Component
- Embedded code editor for technical interviews
- Syntax highlighting
- Code submission functionality

#### 2.2.5 DocumentUpload Component
- Handles resume and job description uploads
- Validates file types and sizes
- Provides upload status feedback

### 2.3 Custom Hooks

#### 2.3.1 useAudio Hook
- Manages microphone access
- Handles audio recording and chunking
- Provides audio playback functionality

#### 2.3.2 useWebSocket Hook
- Establishes and maintains WebSocket connection
- Handles message sending and receiving
- Manages connection status and reconnection

#### 2.3.3 useInterviewState Hook
- Tracks current interview state
- Manages interview flow and transitions
- Coordinates between components

### 2.4 Context Providers

#### 2.4.1 InterviewContext
- Provides interview state to all components
- Manages global interview actions
- Stores interview history and settings

#### 2.4.2 PlanContext
- Tracks user plan status (free vs. premium)
- Controls feature access based on plan
- Handles plan upgrade process (mocked)

## 3. Backend Specification

### 3.1 API Endpoints

#### 3.1.1 REST Endpoints
- `POST /start_interview`: Initialize an interview session
  - Request: `{interview_type, plan_status, resume_data?, job_description?, company_culture?}`
  - Response: `{session_id, initial_greeting}`

- `GET /check_usage`: Check remaining free tier usage
  - Response: `{interviews_remaining}`

- `POST /mock_upgrade`: Mock a plan upgrade
  - Request: `{session_id}`
  - Response: `{success, new_plan_status}`

#### 3.1.2 WebSocket Endpoint
- `/ws/{session_id}`: Real-time communication channel
  - Client Messages:
    - Audio chunks (binary)
    - Control messages (JSON)
  - Server Messages:
    - AI audio chunks (binary)
    - Transcripts (JSON)
    - Feedback (JSON)

### 3.2 Session Management
- In-memory dictionary keyed by `session_id`
- Stores:
  - Plan status
  - Interview type
  - Gemini chat history
  - Usage counter
  - Document data (if premium)
  - Company culture (if premium)

### 3.3 Document Processing
- Resume parsing for skills, experience, education
- Job description parsing for requirements, responsibilities
- Text extraction from PDF, DOCX, TXT formats

### 3.4 Gemini Live API Integration
- Dynamic prompt construction based on:
  - Interview type
  - User tier
  - Context (resume/JD for premium)
  - Previous exchanges
- Audio streaming to and from Gemini API
- Processing API responses for feedback generation

## 4. Data Flow

### 4.1 Interview Initialization
1. User selects interview type and options
2. Frontend sends request to `/start_interview`
3. Backend creates session and initializes Gemini chat
4. Backend returns session ID and initial greeting
5. Frontend establishes WebSocket connection

### 4.2 Interview Conversation
1. User speaks into microphone
2. Frontend streams audio chunks to backend via WebSocket
3. Backend forwards audio to Gemini Live API
4. Gemini processes audio and generates response
5. Backend streams AI audio and transcript back to frontend
6. Frontend plays audio and displays transcript
7. Process repeats for each exchange

### 4.3 Feedback Generation
1. Gemini API analyzes user responses
2. Backend extracts and formats feedback based on user tier
3. Basic feedback sent to free users
4. Detailed feedback (content, delivery, sentiment) sent to premium users
5. Summary feedback compiled at end of interview

## 5. Security Considerations

### 5.1 API Key Management
- Gemini API keys stored in environment variables
- No API keys exposed to frontend

### 5.2 Data Handling
- Audio data processed in memory, not persisted
- Document data temporarily stored during session only
- No user accounts or persistent personal data for MVP

### 5.3 Input Validation
- Validate all user inputs
- Sanitize document content before processing
- Implement rate limiting for API endpoints

## 6. Testing Strategy

### 6.1 Frontend Testing
- Unit tests for components and hooks
- Integration tests for key user flows
- Browser compatibility testing

### 6.2 Backend Testing
- Unit tests for API endpoints
- Integration tests for Gemini API interaction
- Load testing for WebSocket connections

### 6.3 End-to-End Testing
- Complete interview flow testing
- Feature access based on user tier
- Error handling and recovery

## 7. Deployment Considerations

### 7.1 Frontend Deployment
- Build optimization with Vite
- Static asset hosting (e.g., Netlify, Vercel)
- Environment-specific configuration

### 7.2 Backend Deployment
- FastAPI server deployment (e.g., Docker container)
- Environment variables for configuration
- Scalability considerations for concurrent users

## 8. Development Roadmap

### 8.1 Phase 1: Core Functionality
- Basic interview flow with speech-to-speech
- Simple feedback system
- MVP UI implementation

### 8.2 Phase 2: Premium Features
- Document upload and processing
- Company culture selection
- Technical interview mode with code editor

### 8.3 Phase 3: Refinement
- UI/UX improvements
- Performance optimization
- Feedback system enhancement

## 9. Dependencies and External Services

### 9.1 Frontend Dependencies
- React 18.x
- TypeScript
- Tailwind CSS
- Lucide React (icons)
- CodeMirror/Monaco Editor (technical interviews)

### 9.2 Backend Dependencies
- FastAPI
- WebSockets
- Google Generative AI SDK
- PyPDF2
- python-docx
- python-dotenv

### 9.3 External Services
- Google Gemini Live API

## 10. Limitations and Constraints

### 10.1 Technical Limitations
- Browser support for Web Audio API
- Real-time audio processing performance
- Gemini API rate limits and quotas

### 10.2 MVP Constraints
- English language only
- No persistent user accounts
- Limited interview types
- Mocked payment processing

## 11. Future Technical Considerations

### 11.1 Scalability
- Database integration for persistent storage
- User authentication system
- Caching strategies for improved performance

### 11.2 Feature Expansion
- Additional interview types
- Multi-language support
- Advanced analytics dashboard
- Integration with job application platforms

---

## Appendix

### A. API Reference
Detailed API documentation for all endpoints

### B. Environment Variables
Required environment variables for frontend and backend

### C. Development Setup
Instructions for local development environment setup