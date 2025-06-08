import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Mic, Brain, Target, Star } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/interview');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative pt-20 pb-16 sm:pt-24 sm:pb-20">
            <div className="text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Master Your
                <span className="text-primary-600 block">Interview Skills</span>
              </h1>
              <p className="text-xl sm:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Practice with AI-powered mock interviews that adapt to your industry, role, and experience level. Get real-time feedback and build confidence for your next opportunity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
                <Button
                  variant="primary"
                  size="lg"
                  icon={Mic}
                  onClick={handleGetStarted}
                  className="w-full sm:w-auto text-lg px-8 py-4"
                >
                  Start Practicing Now
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-lg px-8 py-4"
                  onClick={() => navigate('/pricing')}
                >
                  View Pricing
                </Button>
              </div>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span>Free to get started</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary-500" />
                  <span>AI-powered feedback</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-secondary-500" />
                  <span>Industry-specific practice</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything you need to ace your interview
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our AI interviewer provides realistic practice sessions with immediate feedback to help you improve.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                <Mic className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Speech-to-Speech AI
              </h3>
              <p className="text-gray-600">
                Natural conversation flow with voice input and audio responses, just like a real interview.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary-100 rounded-full mb-4">
                <Brain className="h-8 w-8 text-secondary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Real-time Feedback
              </h3>
              <p className="text-gray-600">
                Get immediate insights on your responses, body language, and communication style.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Target className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Personalized Practice
              </h3>
              <p className="text-gray-600">
                Upload your resume and job descriptions for tailored interview questions and scenarios.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gray-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to transform your interview performance?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of job seekers who have improved their interview skills with InterviewFlow AI.
          </p>
          <Button
            variant="primary"
            size="lg"
            icon={Mic}
            onClick={handleGetStarted}
            className="text-lg px-8 py-4"
          >
            Start Your First Interview
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;