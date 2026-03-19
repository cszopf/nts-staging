import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import CalculatorFlow from './pages/NetToSeller';
import Results from './pages/Results';
import NeighborhoodProspector from './pages/NeighborhoodProspector';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import ContactScrubber from './pages/ContactScrubber';
import { AuthProvider } from './context/AuthContext';
import { UpdatePasswordModal } from './components/UpdatePasswordModal';
import { supabase } from './lib/supabase';

export default function App() {
  const [isRetroMode, setIsRetroMode] = useState(false);
  const [keystrokes, setKeystrokes] = useState<string[]>([]);
  const [showUpdatePassword, setShowUpdatePassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowUpdatePassword(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      
      setKeystrokes(prev => {
        const newKeystrokes = [...prev, key].slice(-10);
        
        const sequence = newKeystrokes.map(k => {
          if (k === 'Up' || k === 'ArrowUp') return 'U';
          if (k === 'Down' || k === 'ArrowDown') return 'D';
          if (k === 'Left' || k === 'ArrowLeft') return 'L';
          if (k === 'Right' || k === 'ArrowRight') return 'R';
          if (k.toLowerCase() === 'b') return 'B';
          if (k.toLowerCase() === 'a') return 'A';
          return k;
        }).join('');

        if (sequence === 'UUDDLRLRBA') {
          setIsRetroMode(prevMode => !prevMode);
          return [];
        }
        return newKeystrokes;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isRetroMode) {
      document.body.classList.add('retro-theme');
    } else {
      document.body.classList.remove('retro-theme');
    }
  }, [isRetroMode]);

  return (
    <AuthProvider>
      <Router>
        <div className={`min-h-screen bg-white selection:bg-[#64CCC9]/30 ${isRetroMode ? 'retro-mode' : ''}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/calculator" element={<CalculatorFlow />} />
            <Route path="/calculator/results/:estimateId" element={<Results />} />
            <Route path="/prospector" element={<NeighborhoodProspector />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/dashboard" element={<AgentDashboard />} />
            <Route path="/scrubber" element={<ContactScrubber />} />
            
            {/* Legacy Redirects */}
            <Route path="/net-to-seller" element={<Navigate to="/calculator" replace />} />
          </Routes>
          <UpdatePasswordModal 
            isOpen={showUpdatePassword} 
            onClose={() => setShowUpdatePassword(false)} 
          />
        </div>
      </Router>
    </AuthProvider>
  );
}
