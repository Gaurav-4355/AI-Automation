import React from 'react';
import { motion } from 'framer-motion';
import { User, Users, Brain, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#0D0E1A',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    overflow: 'hidden',
    position: 'relative'
  };

  const cardStyle = {
    backgroundColor: 'rgba(30, 31, 58, 0.6)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(124, 58, 237, 0.3)',
    borderRadius: '24px',
    padding: '40px',
    width: '300px',
    height: '350px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden'
  };

  const gridStyle = {
    display: 'flex',
    gap: '30px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    zIndex: 10
  };

  const backgroundGlow = {
    position: 'absolute',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%)',
    borderRadius: '50%',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none'
  };

  const handleIndividualClick = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'individual') {
      navigate('/dashboard');
    } else {
      navigate('/auth/individual');
    }
  };

  const handleTeamClick = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && (user.role === 'admin' || user.role === 'user')) {
      navigate('/dashboard');
    } else {
      navigate('/auth/team');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={backgroundGlow}></div>
      
      {/* Deep Learning Animation Elements */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
        style={{ position: 'absolute', top: '10%', left: '10%', fontSize: '100px', pointerEvents: 'none' }}
      >
        <Brain color="#7C3AED" strokeWidth={0.5} size={150} />
      </motion.div>

      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{ textAlign: 'center', marginBottom: '60px', zIndex: 10 }}
      >
        <h1 style={{ fontSize: '48px', fontWeight: '900', marginBottom: '10px', background: 'linear-gradient(to right, #7C3AED, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          NovaMind AI
        </h1>
        <p style={{ color: '#9CA3AF', fontSize: '18px' }}>The Future of Cognitive Workflow Automation</p>
      </motion.div>

      <div style={gridStyle}>
        {/* INDIVIDUAL CARD */}
        <motion.div
          whileHover={{ scale: 1.05, borderColor: '#EC4899' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleIndividualClick}
          style={cardStyle}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '50%' }}></div>
          <User size={60} color="#EC4899" style={{ marginBottom: '20px' }} />
          <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>Individual</h2>
          <p style={{ color: '#9CA3AF', fontSize: '14px' }}>
            Personal AI co-pilot for students and pros. Direct access to your cognitive vault.
          </p>
          <Zap size={20} color="#EC4899" style={{ marginTop: '20px' }} />
        </motion.div>

        {/* TEAM CARD */}
        <motion.div
          whileHover={{ scale: 1.05, borderColor: '#7C3AED' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleTeamClick}
          style={cardStyle}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'rgba(124, 58, 237, 0.1)', borderRadius: '50%' }}></div>
          <Users size={60} color="#7C3AED" style={{ marginBottom: '20px' }} />
          <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>Team & Enterprise</h2>
          <p style={{ color: '#9CA3AF', fontSize: '14px' }}>
            Collaborative intelligence. Admin controls, task delegation, and team tracking.
          </p>
          <ShieldCheck size={20} color="#7C3AED" style={{ marginTop: '20px' }} />
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          h1 { font-size: 32px !important; }
          p { font-size: 14px !important; }
          div[style*="gridStyle"] { gap: 20px !important; }
          div[style*="cardStyle"] { width: 260px !important; height: 300px !important; padding: 25px !important; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
