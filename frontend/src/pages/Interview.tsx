import React, { useState, useEffect } from 'react';
import { useInterview } from '../contexts/InterviewContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { Button } from '../components/common/Button';
import AudioRecorder from '../components/interview/AudioRecorder';
import Transcript from '../components/interview/Transcript';
import Feedback from '../components/interview/Feedback';
import DocumentUpload from '../components/premium/DocumentUpload';
import CultureSelector from '../components/premium/CultureSelector';
import CodeEditor from '../components/interview/CodeEditor';
import { Play, Square, Zap, AlertCircle } from 'lucide-react';
import { InterviewType, PlanTier, WebSocketMessage } from '../types/interview';

// Define types for API requests/responses
interface StartInterviewRequest {
  interviewType: string;
  planTier: string;
  resumeData?: string;
  jobDescription?: string;
  companyCulture?: string;
}

interface StartInterviewResponse {
  sessionId: string;
  initialGreeting: string;
  websocketUrl: string;
}

const Interview: React.FC = () => {
  const { state, startSession, endSession, addMessage, addFeedback, setRecording, setConnected, setError, clearError } = useInterview();
  const [selectedType, setSelectedType] = useState<InterviewType>('general');
  const [planTier] = useState<PlanTier>('free');
  const [isStarting, setIsStarting] = useState(false);
  const [resumeData, setResumeData] = useState<string>('');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [companyCulture, setCompanyCulture] = useState<string>('');

  // Get API URL with fallback
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // WebSocket connection for real-time communication
  const { isConnected, connect, disconnect, sendAudio, sendMessage } = useWebSocket({
    onMessage: (message: WebSocketMessage) => {
      switch (message.type) {
        case 'transcript':
          addMessage({
            type: message.data.speaker === 'user' ? 'user' : 'ai',
            content: message.data.text,
            audioUrl: message.data.audioUrl,
          });
          break;
        case 'feedback':
          addFeedback({
            messageId: message.data.messageId || '',
            type: planTier === 'premium' ? 'detailed' : 'basic',
            content: message.data.content,
            score: message.data.score,
            suggestions: message.data.suggestions,
          });
          break;
        case 'audio':
          if (message.data instanceof ArrayBuffer || message.data instanceof Blob) {
            playAudioResponse(message.data);
          }
          break;
        case 'error':
          setError(message.data.message);
          break;
        case 'control':
          if (message.data.status === 'ended') {
            endSession();
          }
          break;
      }
    },
    onConnect: () => {
      setConnected(true);
      clearError();
    },
    onDisconnect: () => {
      setConnected(false);
    },
    onError: () => {
      setError('Connection error occurred');
    },
  });

  const playAudioResponse = (audioData: ArrayBuffer | Blob) => {
    try {
      const blob = audioData instanceof Blob ? audioData : new Blob([audioData], { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.play().catch(err => {
        console.error('Error playing AI audio:', err);
      });
    } catch (err) {
      console.error('Error creating audio from response:', err);
    }
  };

  const handleStartInterview = async () => {
    console.log('handleStartInterview called!'); // Debug log
    setIsStarting(true);
    clearError();
    
    try {
      console.log('API URL:', API_URL);
      
      const requestData: StartInterviewRequest = {
        interviewType: selectedType,
        planTier: planTier,
        resumeData: planTier === 'premium' ? resumeData : undefined,
        jobDescription: planTier === 'premium' ? jobDescription : undefined,
        companyCulture: planTier === 'premium' ? companyCulture : undefined,
      };

      console.log('Request data:', requestData);

      const response = await fetch(`${API_URL}/start_interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: StartInterviewResponse = await response.json();
      console.log('Response data:', data);
      
      // Start the session with the received data
      startSession(selectedType, planTier, data.sessionId, data.websocketUrl);
      
      // Add the initial greeting message
      addMessage({
        type: 'ai',
        content: data.initialGreeting,
      });

      // Connect to WebSocket
      console.log('Connecting to WebSocket:', data.websocketUrl);
      connect(data.websocketUrl);
      
    } catch (error) {
      console.error('Failed to start interview:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start interview';
      
      // Provide more specific error messages
      if (errorMessage.includes('Failed to fetch')) {
        setError('Unable to connect to the server. Please make sure the backend is running on ' + API_URL);
      } else if (errorMessage.includes('NetworkError')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsStarting(false);
    }
  };

  // Simple test function to verify button works
  const testButtonClick = () => {
    console.log('Test button clicked!');
    alert('Button is working!');
  };

  const handleEndInterview = () => {
    if (isConnected) {
      sendMessage({
        type: 'control',
        data: { action: 'end_interview' },
        timestamp: Date.now(),
      });
    }
    
    disconnect();
    endSession();
  };

  const handleAudioChunk = (audioData: ArrayBuffer) => {
    if (isConnected && audioData.byteLength > 0) {
      sendAudio(audioData);
    }
  };

  const handleRecordingChange = (isRecording: boolean) => {
    setRecording(isRecording);
  };

  useEffect(() => {
    setConnected(isConnected);
  }, [isConnected, setConnected]);

  const renderSetupPhase = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Start Your Interview Practice
        </h1>
        
        {/* API Connection Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>API Endpoint:</span>
            <code className="bg-gray-200 px-2 py-1 rounded text-xs">{API_URL}</code>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Interview Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { type: 'general' as InterviewType, label: 'General', description: 'Common interview questions' },
              { type: 'behavioral' as InterviewType, label: 'Behavioral', description: 'STAR method practice' },
              { type: 'technical' as InterviewType, label: 'Technical', description: 'Coding & technical skills', premium: true },
            ].map(({ type, label, description, premium }) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                disabled={premium && planTier === 'free'}
                className={`p-4 border rounded-lg text-left transition-all ${
                  selectedType === type
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-gray-300'
                } ${premium && planTier === 'free' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900">{label}</h3>
                  {premium && planTier === 'free' && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Premium
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Premium Features */}
        {planTier === 'premium' && (
          <div className="space-y-6 mb-6">
            <DocumentUpload
              onResumeUpload={setResumeData}
              onJobDescriptionUpload={setJobDescription}
            />
            <CultureSelector
              selectedCulture={companyCulture}
              onCultureChange={setCompanyCulture}
            />
          </div>
        )}

        {planTier === 'free' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">Free Tier Benefits</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 3 practice interviews per day</li>
              <li>• Basic feedback on your responses</li>
              <li>• General and behavioral interview types</li>
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-blue-700 border-blue-300 hover:bg-blue-100"
              onClick={() => window.location.href = '/pricing'}
              icon={Zap}
            >
              Upgrade for Premium Features
            </Button>
          </div>
        )}

        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-900 mb-1">Error</h4>
                <p className="text-red-800 text-sm">{state.error}</p>
                {state.error.includes('Unable to connect') && (
                  <div className="mt-2 text-sm text-red-700">
                    <p className="font-medium">Troubleshooting steps:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Make sure the backend server is running</li>
                      <li>Check that the API URL is correct</li>
                      <li>Verify your internet connection</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-4">
          {/* Test button to verify clicking works */}
          <button
            onClick={testButtonClick}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Test Button
          </button>
          
          {/* Main start button */}
          <Button
            variant="primary"
            size="lg"
            icon={Play}
            onClick={handleStartInterview}
            disabled={isStarting}
            className="px-8"
            loading={isStarting}
          >
            {isStarting ? 'Starting...' : 'Start Interview'}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderActiveInterview = () => (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Interview Area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg h-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Interview
                </h2>
                <div className="flex items-center gap-2">
                  {state.isConnected ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm">Connected</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-sm">Connecting...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Audio Recorder */}
              <AudioRecorder
                isActive={state.currentSession?.status === 'active' || true}
                onAudioChunk={handleAudioChunk}
                onRecordingChange={handleRecordingChange}
              />

              {/* Technical Interview Code Editor */}
              {selectedType === 'technical' && (
                <CodeEditor
                  onCodeSubmit={(code) => {
                    addMessage({
                      type: 'user',
                      content: `Code submission:\n\`\`\`\n${code}\n\`\`\``,
                    });
                  }}
                />
              )}

              {state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <p className="text-red-800 text-sm">{state.error}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  icon={Square}
                  onClick={handleEndInterview}
                >
                  End Interview
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Transcript
            messages={state.messages}
            className="h-64"
          />

          <Feedback
            feedback={state.feedback}
            planTier={planTier}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(!state.currentSession || state.currentSession.status === 'setup')
          ? renderSetupPhase()
          : renderActiveInterview()
        }
      </div>
    </div>
  );
};

export default Interview;