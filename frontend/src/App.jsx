import React, { useState, useEffect } from 'react';
import InputHub from './components/InputHub';
import Dashboard from './components/Dashboard';
import NotificationSystem from './components/NotificationSystem';

function App() {
  const [activeTab, setActiveTab] = useState('input');
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'info') => {
    console.log(`DEBUG: Adding notification: ${message} (${type})`);
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    if (Notification.permission === 'granted') {
      new Notification("NovaMind", { body: message });
    }
  };

  useEffect(() => {
    console.log(`DEBUG: activeTab changed to: ${activeTab}`);
  }, [activeTab]);

  useEffect(() => {
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
  }, []);

  // Inline Styles
  const navStyle = {
    position: 'fixed',
    top: 0,
    width: '100%',
    zIndex: 50,
    backgroundColor: 'rgba(30, 31, 58, 0.8)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    height: '80px',
    display: 'flex',
    alignItems: 'center'
  };

  const navContainerStyle = {
    maxWidth: '1280px',
    margin: '0 auto',
    width: '100%',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  };

  const logoStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#7C3AED',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const tabButtonStyle = (isActive) => ({
    padding: '10px 24px',
    borderRadius: '9999px',
    fontSize: '14px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
    color: isActive ? 'white' : '#9CA3AF',
    marginLeft: '8px'
  });

  const mainStyle = {
    paddingTop: '128px',
    paddingBottom: '80px',
    maxWidth: '1280px',
    margin: '0 auto',
    paddingLeft: '20px',
    paddingRight: '20px',
    position: 'relative',
    zIndex: 10
  };

  const heroStyle = {
    textAlign: 'center',
    marginBottom: '64px'
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Simple Background Animation - CSS Only */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
        .particle {
          position: fixed;
          background: white;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>
      
      {[...Array(15)].map((_, i) => (
        <div 
          key={i} 
          className="particle" 
          style={{
            left: `${Math.random() * 100}%`,
            bottom: `-20px`,
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            animation: `float ${Math.random() * 10 + 10}s linear infinite`,
            animationDelay: `${Math.random() * 20}s`
          }}
        />
      ))}

      {/* Navigation */}
      <nav style={navStyle}>
        <div style={navContainerStyle}>
          <div style={logoStyle}>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#7C3AED', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '18px' }}>N</div>
            NovaMind
          </div>
          
          <div style={{ display: 'flex' }}>
            <button
              onClick={() => setActiveTab('input')}
              style={tabButtonStyle(activeTab === 'input')}
            >
              Input Hub
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={tabButtonStyle(activeTab === 'dashboard')}
            >
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={mainStyle}>
        {activeTab === 'input' && (
          <div style={heroStyle}>
            <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)', color: '#A5B4FC', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px' }}>
              AI-Powered Cognitive Assistant
            </div>
            <h1 style={{ fontSize: '64px', fontWeight: '900', marginBottom: '24px', letterSpacing: '-2px' }}>
              Amplify Your <span style={{ color: '#7C3AED' }}>Cognitive Workflow</span>
            </h1>
            <p style={{ color: '#9CA3AF', fontSize: '20px', maxWidth: '672px', margin: '0 auto', lineHeight: '1.6' }}>
              Transform scattered notes, voice memos, and documents into structured intelligence. 
              Powered by Llama 3.3 via Groq.
            </p>
          </div>
        )}

        <div style={{ transition: 'opacity 0.4s ease' }}>
          {activeTab === 'input' ? (
            <InputHub onProcessed={() => {
              console.log("DEBUG: Input processed, navigating to dashboard");
              addNotification("Input processed successfully!", "success");
              setActiveTab('dashboard');
            }} />
          ) : (
            <Dashboard />
          )}
        </div>
      </main>

      <NotificationSystem notifications={notifications} setNotifications={setNotifications} />
    </div>
  );
}

export default App;
