import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { InterviewSession, InterviewMessage, InterviewFeedback, InterviewType, InterviewStatus, PlanTier } from '../types/interview';

interface InterviewState {
  currentSession: InterviewSession | null;
  messages: InterviewMessage[];
  feedback: InterviewFeedback[];
  isRecording: boolean;
  isConnected: boolean;
  error: string | null;
}

type InterviewAction =
  | { type: 'START_SESSION'; payload: InterviewSession }
  | { type: 'END_SESSION' }
  | { type: 'ADD_MESSAGE'; payload: InterviewMessage }
  | { type: 'ADD_FEEDBACK'; payload: InterviewFeedback }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

const initialState: InterviewState = {
  currentSession: null,
  messages: [],
  feedback: [],
  isRecording: false,
  isConnected: false,
  error: null,
};

const interviewReducer = (state: InterviewState, action: InterviewAction): InterviewState => {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...state,
        currentSession: action.payload,
        messages: [],
        feedback: [],
        error: null,
      };
    case 'END_SESSION':
      return {
        ...state,
        currentSession: state.currentSession ? { ...state.currentSession, status: 'completed', endTime: new Date() } : null,
        isRecording: false,
      };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'ADD_FEEDBACK':
      return {
        ...state,
        feedback: [...state.feedback, action.payload],
      };
    case 'SET_RECORDING':
      return {
        ...state,
        isRecording: action.payload,
      };
    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
};

interface InterviewContextType {
  state: InterviewState;
  startSession: (type: InterviewType, planTier: PlanTier) => void;
  endSession: () => void;
  addMessage: (message: Omit<InterviewMessage, 'id' | 'timestamp'>) => void;
  addFeedback: (feedback: Omit<InterviewFeedback, 'id'>) => void;
  setRecording: (recording: boolean) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetState: () => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (context === undefined) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
};

interface InterviewProviderProps {
  children: ReactNode;
}

export const InterviewProvider: React.FC<InterviewProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(interviewReducer, initialState);

  const startSession = (type: InterviewType, planTier: PlanTier) => {
    const session: InterviewSession = {
      id: `session_${Date.now()}`,
      type,
      status: 'setup',
      planTier,
      startTime: new Date(),
    };
    dispatch({ type: 'START_SESSION', payload: session });
  };

  const endSession = () => {
    dispatch({ type: 'END_SESSION' });
  };

  const addMessage = (message: Omit<InterviewMessage, 'id' | 'timestamp'>) => {
    const fullMessage: InterviewMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: fullMessage });
  };

  const addFeedback = (feedback: Omit<InterviewFeedback, 'id'>) => {
    const fullFeedback: InterviewFeedback = {
      ...feedback,
      id: `feedback_${Date.now()}_${Math.random()}`,
    };
    dispatch({ type: 'ADD_FEEDBACK', payload: fullFeedback });
  };

  const setRecording = (recording: boolean) => {
    dispatch({ type: 'SET_RECORDING', payload: recording });
  };

  const setConnected = (connected: boolean) => {
    dispatch({ type: 'SET_CONNECTED', payload: connected });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  const value: InterviewContextType = {
    state,
    startSession,
    endSession,
    addMessage,
    addFeedback,
    setRecording,
    setConnected,
    setError,
    clearError,
    resetState,
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
};