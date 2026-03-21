import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const getApiBaseUrl = () => {
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://127.0.0.1:8000/api`;
  }
  return `https://sguhackathon-backend.onrender.com/api`; 
};

const API_BASE_URL = getApiBaseUrl();

const NotificationSystem = ({ notifications, setNotifications }) => {
  const [lastChecked, setLastChecked] = useState({});

  const addLocalNotification = useCallback((message, type = 'info', taskId = null) => {
    const id = Date.now();
    setNotifications(prev => {
      // Limit to MAX 3 notifications
      const newNotifications = [...prev, { id, message, type }];
      if (newNotifications.length > 3) {
        return newNotifications.slice(-3);
      }
      return newNotifications;
    });
    
    if (Notification.permission === 'granted') {
      // Try Service Worker first for interactive buttons
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification("NovaMind Reminder", {
            body: message,
            icon: "/favicon.svg",
            vibrate: [200, 100, 200],
            tag: taskId ? `task-${taskId}` : `notification-${id}`,
            data: { taskId },
            requireInteraction: true, // This keeps the notification on screen until user acts
            actions: taskId ? [
              { action: 'mark_done', title: '✅ Mark as Done' },
              { action: 'view', title: '🔍 View' }
            ] : []
          }).catch(err => {
            console.warn("SW notification failed, falling back to simple notification", err);
            new Notification("NovaMind", { body: message, requireInteraction: true });
          });
        });
      } else {
        // Simple fallback
        new Notification("NovaMind", { body: message, requireInteraction: true });
      }
    }
  }, [setNotifications]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, [setNotifications]);

  const clearAll = () => {
    setNotifications([]);
  };

  // Auto dismiss after 5 seconds each
  useEffect(() => {
    if (notifications.length > 0) {
      const timers = notifications.map(n => {
        return setTimeout(() => {
          removeNotification(n.id);
        }, 5000);
      });
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [notifications, removeNotification]);

  // Check deadlines every 10 SECONDS for hackathon demo
  useEffect(() => {
    const checkDeadlines = async () => {
      try {
        console.log("DEBUG: Reminder system checking deadlines (10 sec interval)...");
        const res = await axios.get(`${API_BASE_URL}/tasks`);
        const tasks = res.data;
        const now = new Date();

        tasks.forEach(task => {
          if (!task.deadline || task.status === 'completed') return;
          
          const deadline = new Date(task.deadline);
          const diffMs = deadline - now;
          const diffHours = diffMs / (1000 * 60 * 60);

          // DEBUG: Log time difference for near-deadline tasks
          if (diffHours < 0.5) {
            console.log(`DEBUG: Task "${task.title}" is due in ${Math.round(diffHours * 60)} minutes (diffMs: ${diffMs})`);
          }

          // No duplicate notifications for same task per status
          const taskKey = `${task.id}-${task.status}`;
          
          // FOR HACKATHON DEMO: Trigger if due in next 10 minutes OR if already past due but not notified
          if (diffMs > -60000 && diffMs <= 600000) { // From 1 min past to 10 mins future
            if (lastChecked[taskKey] !== 'imminent') {
              addLocalNotification(`DUE NOW: "${task.title}"!`, 'error', task.id);
              setLastChecked(prev => ({ ...prev, [taskKey]: 'imminent' }));
            }
          } else if (diffHours > 0 && diffHours <= 1) {
            if (lastChecked[taskKey] !== 'urgent') {
              addLocalNotification(`URGENT: "${task.title}" is due within 1 hour!`, 'error', task.id);
              setLastChecked(prev => ({ ...prev, [taskKey]: 'urgent' }));
            }
          } else if (diffHours > 0 && diffHours <= 24) {
            if (lastChecked[taskKey] !== 'reminder') {
              addLocalNotification(`Reminder: "${task.title}" is due within 24 hours.`, 'info', task.id);
              setLastChecked(prev => ({ ...prev, [taskKey]: 'reminder' }));
            }
          }
        });
      } catch (error) {
        console.error("Reminder check failed:", error);
      }
    };

    const interval = setInterval(checkDeadlines, 10000); // Check every 10 seconds for hackathon demo
    checkDeadlines(); // Initial check

    return () => clearInterval(interval);
  }, [lastChecked, addLocalNotification]);

  // Inline Styles
  const containerStyle = {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '12px',
    pointerEvents: 'none',
    maxWidth: '320px'
  };

  const notificationStyle = (type) => {
    // Small compact size - not full width
    // Urgent = red border (deadline within 1 hour)
    // Normal = blue border (deadline within 24 hours)
    let borderColor = 'rgba(255,255,255,0.1)';
    let bgColor = '#1E1F3A';
    
    if (type === 'error') borderColor = '#EF4444'; // Red for urgent
    else if (type === 'info') borderColor = '#3B82F6'; // Blue for normal
    else if (type === 'success') borderColor = '#10B981';

    return {
      padding: '12px 16px',
      borderRadius: '12px',
      backgroundColor: bgColor,
      border: `2px solid ${borderColor}`,
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      pointerEvents: 'auto',
      color: 'white',
      animation: 'slideIn 0.3s ease-out'
    };
  };

  const clearAllButtonStyle = {
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#9CA3AF',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    cursor: 'pointer',
    pointerEvents: 'auto',
    marginBottom: '4px',
    transition: 'all 0.2s'
  };

  return (
    <div style={containerStyle}>
      {notifications.length > 1 && (
        <button 
          onClick={clearAll} 
          style={clearAllButtonStyle}
          onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
        >
          Clear All
        </button>
      )}
      {notifications.map((n) => (
        <div key={n.id} style={notificationStyle(n.type)}>
          <div style={{ fontSize: '18px' }}>
            {n.type === 'error' ? '⚠️' : n.type === 'success' ? '✅' : '🔔'}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: '500', margin: 0, lineHeight: '1.4' }}>{n.message}</p>
          </div>
          <button
            onClick={() => removeNotification(n.id)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: '#9CA3AF', 
              cursor: 'pointer', 
              fontSize: '16px',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default NotificationSystem;