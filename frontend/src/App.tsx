import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-primary-600 mb-6">
          InterviewFlow AI
        </h1>
        <p className="text-gray-600 mb-4 text-center">
          Your AI-powered interview practice platform
        </p>
        <div className="flex justify-center">
          <button className="btn btn-primary">Get Started</button>
        </div>
      </div>
    </div>
  );
}

export default App;