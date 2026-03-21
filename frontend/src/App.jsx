import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import NotificationSystem from './components/NotificationSystem';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Check if user is logged in (to handle login/logout across tabs)
    const handleStorageChange = () => {
      const loggedUser = JSON.parse(localStorage.getItem('user'));
      setUser(loggedUser);
    };
    window.addEventListener('storage', handleStorageChange);
    
    // Register Service Worker for background notifications and actions
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('DEBUG: Service Worker registered with scope:', registration.scope);
        })
        .catch(err => {
          console.error('ERROR: Service Worker registration failed:', err);
        });
    }

    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update user state when location changes (to catch navigation from AuthPage)
  useEffect(() => {
    const checkUser = () => {
      const loggedUser = JSON.parse(localStorage.getItem('user'));
      if (JSON.stringify(loggedUser) !== JSON.stringify(user)) {
        setUser(loggedUser);
      }
    };
    checkUser();
  }, [window.location.pathname, user]);

  return (
    <Router>
      <div className="min-h-screen bg-[#0D0E1A] text-white overflow-x-hidden">
        <NotificationSystem notifications={notifications} setNotifications={setNotifications} />
        
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/:mode" element={<AuthPage />} />
          <Route path="/dashboard" element={
            !localStorage.getItem('user') ? <Navigate to="/" replace /> : (
              <Dashboard />
            )
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
