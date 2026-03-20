import React, { useState, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const InputHub = ({ onProcessed }) => {
  const [inputType, setInputType] = useState('text');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [isNovaActive, setIsNovaActive] = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const autoSubmitTimeoutRef = useRef(null);

  const handleFileChange = (e) => {
    const droppedFile = e.target.files[0];
    if (!droppedFile) return;
    setFile(droppedFile);
    if (droppedFile.type.includes('image')) {
      setInputType('image');
    } else if (droppedFile.type.includes('pdf')) {
      setInputType('pdf');
    }
  };

  const handleSubmit = async (overrideContent = null) => {
    const finalContent = typeof overrideContent === 'string' ? overrideContent : content;
    if (!finalContent && !file) {
      console.warn("DEBUG: No content or file to submit");
      return;
    }

    console.log("DEBUG: Starting submission...", { inputType, hasContent: !!finalContent, hasFile: !!file });
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('input_type', inputType);
    
    if (file) {
      formData.append('file', file);
    }
    if (finalContent) {
      formData.append('raw_content', finalContent);
    }

    try {
      console.log("DEBUG: Sending POST request to:", `${API_BASE_URL}/input/process`);
      const response = await axios.post(`${API_BASE_URL}/input/process`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log("DEBUG: Backend response received:", response.data);
      setContent('');
      setFile(null);
      if (onProcessed) onProcessed();
      
      // Voice feedback for Hands-Free mode
      if (isHandsFree && 'speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance("Task processed successfully, bhai!");
        window.speechSynthesis.speak(msg);
      }
    } catch (error) {
      console.error("DEBUG: Error processing input:", error);
      alert(`Failed to process input: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setIsNovaActive(false);
    }
  };

  const handleVoiceInput = (handsFreeMode = false) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (isRecording && !handsFreeMode) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = handsFreeMode;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log(`DEBUG: Voice recording started (Hands-Free: ${handsFreeMode})`);
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }

      const lowerTranscript = currentTranscript.toLowerCase();
      
      if (handsFreeMode) {
        if (lowerTranscript.includes("hey nova")) {
          if (!isNovaActive) {
            setIsNovaActive(true);
            console.log("DEBUG: WAKE WORD DETECTED: Hey Nova");
          }
          
          const command = currentTranscript.split(/hey nova/i)[1]?.trim();
          if (command) {
            setContent(command);
            
            // Auto-submit after 2.5 seconds of silence after the command
            if (autoSubmitTimeoutRef.current) clearTimeout(autoSubmitTimeoutRef.current);
            autoSubmitTimeoutRef.current = setTimeout(() => {
              console.log("DEBUG: Auto-submitting command:", command);
              handleSubmit(command);
            }, 2500);
          }
        }
      } else {
        setContent(currentTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error("DEBUG: Voice recognition error:", event.error);
      if (!handsFreeMode) setIsRecording(false);
    };

    recognition.onend = () => {
      console.log("DEBUG: Voice recording ended");
      if (isHandsFree) {
        // Restart listening automatically in hands-free mode
        try { recognition.start(); } catch(e) {}
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const toggleHandsFree = () => {
    const newMode = !isHandsFree;
    setIsHandsFree(newMode);
    if (newMode) {
      setInputType('voice');
      handleVoiceInput(true);
    } else {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      setIsNovaActive(false);
    }
  };

  const tabs = [
    { id: 'text', label: 'Text' },
    { id: 'image', label: 'Image/OCR' },
    { id: 'pdf', label: 'PDF' },
    { id: 'voice', label: 'Voice' },
  ];

  // Inline Styles
  const glassCardStyle = {
    backgroundColor: '#1E1F3A',
    borderRadius: '24px',
    padding: '20px', // Reduced padding for mobile
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  };

  const tabButtonStyle = (isActive, isRec) => ({
    padding: '8px 16px', // Slightly smaller
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: isRec ? '#EF4444' : (isActive ? '#7C3AED' : 'rgba(255,255,255,0.05)'),
    color: isActive || isRec ? 'white' : '#9CA3AF',
    marginRight: '8px',
    marginBottom: '8px' // Added for wrapping
  });

  const textAreaStyle = {
    width: '100%',
    height: '200px', // Slightly shorter for mobile
    padding: '16px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    outline: 'none',
    resize: 'none',
    fontSize: '16px',
    color: 'white',
    fontFamily: 'inherit',
    boxSizing: 'border-box' // Important for width calculation
  };

  const uploadBoxStyle = {
    border: '2px dashed rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '40px 10px', // Much smaller for mobile
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: 'rgba(255,255,255,0.02)'
  };

  const submitButtonStyle = {
    width: '100%',
    padding: '14px',
    borderRadius: '16px',
    backgroundColor: '#7C3AED',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '16px',
    border: 'none',
    cursor: (isProcessing || (!content && !file)) ? 'not-allowed' : 'pointer',
    opacity: (isProcessing || (!content && !file)) ? 0.5 : 1,
    marginTop: '20px'
  };

  return (
    <div style={{ maxWidth: '896px', margin: '0 auto', width: '100%' }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div style={glassCardStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {tabs.map((tab) => (
              <button 
                key={tab.id}
                onClick={() => {
                  setInputType(tab.id);
                  if (tab.id === 'voice') handleVoiceInput();
                }}
                style={tabButtonStyle(inputType === tab.id, tab.id === 'voice' && isRecording)}
              >
                {tab.id === 'voice' && isRecording ? 'Recording...' : tab.label}
              </button>
            ))}
          </div>

          {/* Hands-Free Mode Toggle */}
          <button 
            onClick={toggleHandsFree}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isHandsFree ? '#34D399' : '#4B5563',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: isHandsFree ? '0 0 15px rgba(52, 211, 153, 0.4)' : 'none'
            }}
          >
            {isHandsFree ? '🟢 Nova Assistant: ON' : '⚪ Nova Assistant: OFF'}
          </button>
        </div>

        <div style={{ marginTop: '24px' }}>
          {isHandsFree && (
            <div style={{ 
              backgroundColor: 'rgba(52, 211, 153, 0.1)', 
              padding: '12px', 
              borderRadius: '12px', 
              marginBottom: '16px',
              border: '1px solid rgba(52, 211, 153, 0.2)',
              fontSize: '13px',
              color: '#34D399',
              textAlign: 'center',
              animation: 'pulse 2s infinite'
            }}>
              {isNovaActive ? '📢 Nova is listening to your command...' : '🎙️ Say "Hey Nova" followed by your task'}
            </div>
          )}
          {(inputType === 'text' || inputType === 'voice') && (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your notes or speak to NovaMind..."
              style={textAreaStyle}
            />
          )}

          {(inputType === 'image' || inputType === 'pdf') && (
            <div 
              style={uploadBoxStyle}
              onClick={() => fileInputRef.current.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept={inputType === 'image' ? 'image/*' : '.pdf'}
              />
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📁</div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
                {file ? file.name : `Upload ${inputType.toUpperCase()}`}
              </h3>
              <p style={{ color: '#9CA3AF' }}>Click to select a file from your computer</p>
            </div>
          )}

          {file && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(124, 58, 237, 0.1)', borderRadius: '16px', marginTop: '16px', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>{file.name}</span>
              <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontWeight: 'bold' }}>Remove</button>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isProcessing || (!content && !file)}
            style={submitButtonStyle}
          >
            {isProcessing ? 'AI is Processing...' : 'Analyze with NovaMind'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginTop: '48px' }}>
        {[
          { title: 'Intelligent OCR', desc: 'Handwritten notes to text instantly.' },
          { title: 'Semantic Search', desc: 'Find insights across all inputs.' },
          { title: 'Task Automation', desc: 'Auto-extract deadlines and tasks.' }
        ].map((feature, i) => (
          <div key={i} style={{ backgroundColor: '#1E1F3A', padding: '24px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>{feature.title}</h3>
            <p style={{ color: '#9CA3AF', fontSize: '14px', lineHeight: '1.6' }}>{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InputHub;
