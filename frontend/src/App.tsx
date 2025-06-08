import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { InterviewProvider } from './contexts/InterviewContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Interview from './pages/Interview';
import Pricing from './pages/Pricing';

function App() {
  return (
    <InterviewProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/interview" element={<Interview />} />
              <Route path="/pricing" element={<Pricing />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </InterviewProvider>
  );
}

export default App;