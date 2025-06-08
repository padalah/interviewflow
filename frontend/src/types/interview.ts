export interface InterviewSession {
  id: string;
  type: InterviewType;
  status: InterviewStatus;
  planTier: PlanTier;
  startTime: Date;
  endTime?: Date;
  websocketUrl?: string;
}

export interface InterviewMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface InterviewFeedback {
  id: string;
  messageId: string;
  type: FeedbackType;
  content: string;
  score?: number;
  suggestions?: string[];
}

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  isLastChunk: boolean;
}

export interface WebSocketMessage {
  type: 'audio' | 'transcript' | 'feedback' | 'control' | 'error';
  data: any;
  sessionId?: string;
  timestamp: number;
}

export type InterviewType = 'general' | 'behavioral' | 'technical';
export type InterviewStatus = 'setup' | 'active' | 'paused' | 'completed' | 'error';
export type PlanTier = 'free' | 'premium';
export type FeedbackType = 'basic' | 'detailed';

export interface StartInterviewRequest {
  interviewType: InterviewType;
  planTier: PlanTier;
  resumeData?: string;
  jobDescription?: string;
  companyCulture?: string;
}

export interface StartInterviewResponse {
  sessionId: string;
  initialGreeting: string;
  websocketUrl: string;
}