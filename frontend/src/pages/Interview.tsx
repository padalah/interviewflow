import React, { useState } from 'react';
import { useInterview } from '../contexts/InterviewContext';
import { Button } from '../components/common/Button';
import { Play, Pause, Square, Settings } from 'lucide-react';
import { InterviewType, PlanTier, StartInterviewRequest, StartInterviewResponse } from '../types/interview';

const Interview: React.FC = () => {
  const { state, startSession, endSession, addMessage, setError } = useInterview();
  const [selectedType, setSelectedType] = useState<InterviewType>('general');
  const [planTier] = useState<PlanTier>('free'); // For MVP, default to free
  const [isStarting, setIsStarting] = useState(false);

  const handleStartInterview = async () => {
    setIsStarting(true);
    try {
      const requestData: StartInterviewRequest = {
        interviewType: selectedType,
        planTier: planTier,
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/start_interview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: StartInterviewResponse = await response.json();
      
      // Start the session with the received sessionId and websocketUrl
      startSession(selectedType, planTier, data.sessionId, data.websocketUrl);
      
      // Add the initial greeting as the first AI message
      addMessage({
        type: 'ai',
        content: data.initialGreeting,
      });

      // Connect to WebSocket using the dynamic URL
      // Note: This assumes useWebSocket hook exists and has a connect function
      // The actual WebSocket connection should be handled in the component that uses useWebSocket
      
    } catch (error) {
      console.error('Failed to start interview:', error);
      setError(error instanceof Error ? error.message : 'Failed to start interview');
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndInterview = () => {
    endSession();
  };

  const renderSetupPhase = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">
          Start Your Interview Practice
        </h1>
        
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
              onClick={() => {/* Navigate to pricing */}}
            >
              Upgrade for Premium Features
            </Button>
          </div>
        )}

        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{state.error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <Button
            variant="primary"
            size="lg"
            icon={Play}
            onClick={handleStartInterview}
            disabled={isStarting}
            className="px-8"
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

            <div className="p-6">
              {/* Audio Recorder Placeholder */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {state.isRecording ? (
                    <div className="w-8 h-8 bg-red-500 rounded-full animate-pulse"></div>
                  ) : (
                    <Settings className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <p className="text-gray-600">
                  {state.isRecording ? 'Listening...' : 'Click to start speaking'}
                </p>
              </div>

              {/* Messages Display */}
              <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto mb-4">
                {state.messages.length > 0 ? (
                  <div className="space-y-4">
                    {state.messages.map((message) => (
                      <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.type === 'user' 
                            ? 'bg-primary-500 text-white' 
                            : 'bg-white text-gray-800 border'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center">
                    Interview transcript will appear here...
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-3">
                <Button
                  variant={state.isRecording ? 'secondary' : 'primary'}
                  icon={state.isRecording ? Pause : Play}
                  onClick={() => {/* Toggle recording */}}
                >
                  {state.isRecording ? 'Pause' : 'Speak'}
                </Button>
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

        {/* Feedback Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg h-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Real-time Feedback
              </h3>
            </div>
            <div className="p-6">
              <div className="text-center text-gray-500">
                <p className="mb-4">Feedback will appear here as you practice</p>
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{width: '0%'}}></div>
                    </div>
                    <p className="text-sm text-gray-600">Clarity</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{width: '0%'}}></div>
                    </div>
                    <p className="text-sm text-gray-600">Confidence</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{width: '0%'}}></div>
                    </div>
                    <p className="text-sm text-gray-600">Relevance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {state.currentSession?.status === 'setup' || !state.currentSession
          ? renderSetupPhase()
          : renderActiveInterview()
        }
      </div>
    </div>
  );
};

export default Interview;