import React from 'react';
import { InterviewFeedback, PlanTier } from '../../types/interview';
import { TrendingUp, Award, Target, MessageSquare, Zap } from 'lucide-react';

interface FeedbackProps {
  feedback: InterviewFeedback[];
  planTier: PlanTier;
}

const Feedback: React.FC<FeedbackProps> = ({ feedback, planTier }) => {
  const latestFeedback = feedback[feedback.length - 1];

  const renderProgressBar = (score: number, label: string, color: string = 'primary') => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">{score}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`bg-${color}-600 h-2 rounded-full transition-all duration-500`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );

  const renderBasicFeedback = () => (
    <div className="space-y-4">
      {latestFeedback ? (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Latest Feedback</h4>
                <p className="text-blue-800 text-sm">{latestFeedback.content}</p>
                {latestFeedback.score && (
                  <div className="mt-2">
                    <span className="text-xs text-blue-700">
                      Overall Score: {latestFeedback.score}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-1">Upgrade for More</h4>
                <p className="text-yellow-800 text-sm">
                  Get detailed analytics, personalized suggestions, and comprehensive feedback with Premium.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p>Feedback will appear here as you practice</p>
          <p className="text-sm mt-2">Keep practicing to see your improvement!</p>
        </div>
      )}
    </div>
  );

  const renderDetailedFeedback = () => (
    <div className="space-y-6">
      {latestFeedback ? (
        <>
          {/* Detailed Scores */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary-600" />
              Performance Metrics
            </h4>
            
            {renderProgressBar(85, 'Clarity', 'blue')}
            {renderProgressBar(78, 'Confidence', 'green')}
            {renderProgressBar(92, 'Relevance', 'purple')}
            {renderProgressBar(80, 'Structure', 'orange')}
          </div>

          {/* Latest Feedback */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 mb-1">Detailed Analysis</h4>
                <p className="text-green-800 text-sm mb-3">{latestFeedback.content}</p>
                
                {latestFeedback.suggestions && (
                  <div>
                    <h5 className="font-medium text-green-900 mb-2">Improvement Suggestions:</h5>
                    <ul className="text-green-800 text-sm space-y-1">
                      {latestFeedback.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">Session Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-purple-700">Total Responses:</span>
                <span className="ml-2 font-medium">{feedback.length}</span>
              </div>
              <div>
                <span className="text-purple-700">Avg Score:</span>
                <span className="ml-2 font-medium">
                  {feedback.length > 0 
                    ? Math.round(feedback.reduce((sum, f) => sum + (f.score || 0), 0) / feedback.length)
                    : 0
                  }%
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p>Detailed feedback will appear here as you practice</p>
          <p className="text-sm mt-2">Premium users get comprehensive analytics</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg h-full">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          Real-time Feedback
          {planTier === 'premium' && (
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              Premium
            </span>
          )}
        </h3>
      </div>
      
      <div className="p-4">
        {planTier === 'premium' ? renderDetailedFeedback() : renderBasicFeedback()}
      </div>
    </div>
  );
};

export default Feedback;