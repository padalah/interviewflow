# InterviewFlow AI

InterviewFlow AI is a web application designed to help job seekers practice and improve their interview skills through AI-powered mock interviews. The application provides real-time speech-to-speech interaction, simulating realistic interview scenarios with immediate feedback.

## Project Structure

```
/interviewflow-ai
├── frontend/              # React.js SPA with Tailwind CSS
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React context providers
│   │   ├── pages/         # Page components
│   │   ├── api/           # API client code
│   │   ├── App.tsx        # Main App component
│   │   └── main.tsx       # Entry point
│   └── .env.example       # Example environment variables
├── backend/               # Python FastAPI server
│   ├── api/               # API routes and handlers
│   ├── services/          # Business logic services
│   ├── models/            # Data models
│   ├── main.py            # Entry point
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Example environment variables
└── README.md              # Project documentation
```

## Features

- AI-Powered Interviews: Conduct realistic mock interviews with an AI interviewer
- Speech-to-Speech Interaction: Natural conversation through voice input and output
- Real-Time Feedback: Immediate feedback on responses during the interview
- Interview Types: General, behavioral, and technical interview options
- Premium Features: Resume/JD upload, company culture selection, and advanced feedback
- Freemium Model: Basic functionality available for free with premium features requiring upgrade

## Getting Started

### Frontend Setup

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure variables
4. Start the development server: `npm run dev`

### Backend Setup

1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and configure variables
6. Start the server: `python main.py`

## Technologies

- Frontend: React.js, TypeScript, Tailwind CSS, Web Audio API, WebSockets
- Backend: Python, FastAPI, WebSockets, Google Generative AI SDK
- External Services: Google Gemini Live API