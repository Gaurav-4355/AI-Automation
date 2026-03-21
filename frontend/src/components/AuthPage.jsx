import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, User as UserIcon } from 'lucide-react';
import axios from 'axios';

const getApiBaseUrl = () => {
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://127.0.0.1:8000/api`;
  }
  return `https://sgu-7mjn.onrender.com/api`; 
};

const API_BASE_URL = getApiBaseUrl();

const AuthPage = () => {
  const { mode } = useParams(); // 'individual' or 'team'
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('user'); // 'admin' or 'user' for team mode
  const [error, setError] = useState('');

  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#0D0E1A',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  };

  const formCardStyle = {
    backgroundColor: '#1E1F3A',
    borderRadius: '24px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  };

  const inputGroupStyle = {
    position: 'relative',
    marginBottom: '20px'
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '12px 15px 12px 45px',
    color: 'white',
    fontSize: '16px',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const buttonStyle = {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    backgroundColor: mode === 'team' ? '#7C3AED' : '#EC4899',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
    marginTop: '10px'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const email = e.target.email.value;
    const password = e.target.password.value;
    const fullName = e.target.fullName?.value || '';

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const payload = isLogin 
        ? { email, password } 
        : { email, password, full_name: fullName, role: mode === 'team' ? role : 'individual' };

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload);
      
      // Store user info in localStorage
      localStorage.setItem('user', JSON.stringify(response.data));
      
      // Force refresh or direct navigation
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={formCardStyle}>
        <h2 style={{ fontSize: '28px', textAlign: 'center', marginBottom: '10px' }}>
          {isLogin ? 'Welcome Back' : 'Join NovaMind'}
        </h2>
        <p style={{ textAlign: 'center', color: '#9CA3AF', marginBottom: '30px', fontSize: '14px' }}>
          {mode === 'team' ? 'Enterprise Workflow Intelligence' : 'Personal AI Assistant'}
        </p>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '12px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        {mode === 'team' && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', backgroundColor: 'rgba(0,0,0,0.2)', padding: '5px', borderRadius: '12px' }}>
            <button 
              onClick={() => setRole('user')}
              type="button"
              style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: role === 'user' ? '#7C3AED' : 'transparent', color: 'white', fontSize: '12px' }}
            >
              User
            </button>
            <button 
              onClick={() => setRole('admin')}
              type="button"
              style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: role === 'admin' ? '#7C3AED' : 'transparent', color: 'white', fontSize: '12px' }}
            >
              Admin
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={inputGroupStyle}>
              <UserIcon size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input type="text" name="fullName" placeholder="Full Name" style={inputStyle} required />
            </div>
          )}
          
          <div style={inputGroupStyle}>
            <Mail size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input type="email" name="email" placeholder="Email Address" style={inputStyle} required />
          </div>

          <div style={inputGroupStyle}>
            <Lock size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input type="password" name="password" placeholder="Password" style={inputStyle} required />
          </div>

          <button type="submit" style={buttonStyle}>
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#9CA3AF' }}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <span 
            onClick={() => setIsLogin(!isLogin)}
            style={{ color: mode === 'team' ? '#7C3AED' : '#EC4899', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
