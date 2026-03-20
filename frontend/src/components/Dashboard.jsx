import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TaskList from './TaskList';
import CalendarView from './CalendarView';

const API_BASE_URL = 'http://localhost:8000/api';

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total_tasks: 0, completed_tasks: 0, high_priority_tasks: 0 });
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [agentGoal, setGoal] = useState('');
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [workspace, setWorkspace] = useState('personal'); // 'personal' or 'team'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        alert("Awesome! You'll now receive real-time updates and reminders.");
        // Test notification immediately to confirm
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification("NovaMind", {
              body: "Notifications are successfully enabled!",
              icon: "/favicon.svg"
            });
          });
        }
      } else if (permission === 'denied') {
        alert("Notifications are blocked. Please enable them in your browser settings to get reminders.");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log("DEBUG: Dashboard fetching tasks...");
      const tasksRes = await axios.get(`${API_BASE_URL}/tasks`);
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);

      console.log("DEBUG: Dashboard fetching stats...");
      const statsRes = await axios.get(`${API_BASE_URL}/dashboard/stats`);
      setStats(statsRes.data || { total_tasks: 0, completed_tasks: 0, high_priority_tasks: 0 });

      console.log("DEBUG: Dashboard fetching insights...");
      const insightsRes = await axios.get(`${API_BASE_URL}/dashboard/insights`);
      setInsights(Array.isArray(insightsRes.data) ? insightsRes.data : []);
    } catch (error) {
      console.error("DEBUG: Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for messages from service worker (e.g. background task updates)
    if ('serviceWorker' in navigator) {
      const handleMessage = (event) => {
        if (event.data && event.data.type === 'TASK_UPDATED') {
          console.log(`DEBUG: Dashboard received TASK_UPDATED from Service Worker for task ${event.data.taskId}`);
          fetchData();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  }, []);

  const handleAgentAutomate = async () => {
    if (!agentGoal) return;
    setIsAgentLoading(true);
    try {
      console.log(`DEBUG: Agent planning goal: ${agentGoal}`);
      await axios.post(`${API_BASE_URL}/agent/automate`, { goal: agentGoal });
      setGoal('');
      fetchData();
      alert("AI Agent has planned your tasks!");
    } catch (error) {
      console.error("Agent error:", error);
      alert("Agent failed to automate tasks.");
    } finally {
      setIsAgentLoading(false);
    }
  };

  const handleToggleStatus = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      console.log(`DEBUG: Toggling status for task ${task.id} to ${newStatus}`);
      await axios.put(`${API_BASE_URL}/tasks/${task.id}`, { status: newStatus });
      fetchData();
    } catch (error) {
      console.error("DEBUG: Error toggling status:", error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      console.log(`DEBUG: Deleting task ${taskId}`);
      await axios.delete(`${API_BASE_URL}/tasks/${taskId}`);
      fetchData();
    } catch (error) {
      console.error("DEBUG: Error deleting task:", error);
    }
  };

  const handleDateClick = (date) => {
    console.log("DEBUG: Date clicked in calendar:", date);
    setSelectedDate(date);
  };

  const isSameDate = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const handleSearch = () => {
    if (!searchQuery) return;
    
    // Find the first task that matches the query
    const query = searchQuery.toLowerCase();
    const foundTask = tasks.find(t => 
      (t.title && t.title.toLowerCase().includes(query)) || 
      (t.description && t.description.toLowerCase().includes(query)) ||
      (t.tags && typeof t.tags === 'string' && t.tags.toLowerCase().includes(query))
    );

    if (foundTask) {
      setHighlightedTaskId(foundTask.id);
      // Clear highlight after 5 seconds
      setTimeout(() => setHighlightedTaskId(null), 5000);
      
      const element = document.getElementById(`task-${foundTask.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const filteredTasks = tasks.filter(t => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (t.title && t.title.toLowerCase().includes(query)) || 
                          (t.description && t.description.toLowerCase().includes(query)) ||
                          (t.tags && typeof t.tags === 'string' && t.tags.toLowerCase().includes(query));
    const matchesDate = selectedDate ? isSameDate(t.deadline, selectedDate) : true;
    return matchesSearch && matchesDate;
  });

  // PROBLEM 4 - KNOWLEDGE LINKING (Group tasks by tags or keywords)
  const groupTasksByKnowledge = () => {
    const groups = {};
    
    tasks.forEach(task => {
      let tags = [];
      try {
        if (task.tags) {
          tags = JSON.parse(task.tags);
        }
      } catch (e) {
        console.error("Error parsing tags:", e);
      }

      // If no tags, fallback to keyword matching
      if (tags.length === 0) {
        const keywords = ['project', 'exam', 'meeting', 'study', 'code', 'report', 'assignment'];
        const titleLower = task.title.toLowerCase();
        keywords.forEach(kw => {
          if (titleLower.includes(kw)) tags.push(kw);
        });
      }

      if (tags.length > 0) {
        tags.forEach(tag => {
          if (!groups[tag]) groups[tag] = [];
          // Avoid duplicate tasks in same group
          if (!groups[tag].find(t => t.id === task.id)) {
            groups[tag].push(task);
          }
        });
      } else {
        if (!groups['General']) groups['General'] = [];
        groups['General'].push(task);
      }
    });
    return groups;
  };

  const knowledgeGroups = groupTasksByKnowledge();

  // Styles
  const containerStyle = {
    backgroundColor: '#0D0E1A',
    color: 'white',
    minHeight: '100vh',
    padding: '20px',
    fontFamily: 'sans-serif'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  };

  const statCardContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  };

  const statCardStyle = {
    backgroundColor: '#1E1F3A',
    padding: '20px',
    borderRadius: '15px',
    border: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center'
  };

  const accentTextStyle = {
    color: '#7C3AED',
    fontSize: '32px',
    fontWeight: 'bold',
    margin: '10px 0'
  };

  const refreshButtonStyle = {
    backgroundColor: '#7C3AED',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold'
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: 'white', minHeight: '100vh', position: 'relative' }}>
      {/* Top Bar - Search & Workspace Switch */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, background: 'linear-gradient(to right, #7C3AED, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            NovaMind
          </h1>
          
          {/* Notification Permission Button */}
          {notificationPermission !== 'granted' && (
            <button 
              onClick={requestNotificationPermission}
              style={{ 
                padding: '8px 16px', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(236, 72, 153, 0.1)', 
                border: '1px solid #EC4899', 
                color: '#EC4899', 
                fontSize: '12px', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                animation: 'pulse 2s infinite'
              }}
            >
              🔔 Enable Notifications
            </button>
          )}

          <div style={{ display: 'flex', backgroundColor: '#1E1F3A', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <button 
              onClick={() => setWorkspace('personal')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: workspace === 'personal' ? '#7C3AED' : 'transparent', color: 'white' }}
            >
              Personal
            </button>
            <button 
              onClick={() => setWorkspace('team')}
              style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', backgroundColor: workspace === 'team' ? '#7C3AED' : 'transparent', color: 'white' }}
            >
              Team (B2B)
            </button>
          </div>
        </div>
        
        <div style={{ flex: 1, maxWidth: '400px', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Search tasks, dates, or keywords..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1, padding: '10px 15px', borderRadius: '10px', backgroundColor: '#1E1F3A', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '14px' }}
          />
          <button 
            onClick={handleSearch}
            style={{ 
              padding: '10px 15px', 
              borderRadius: '10px', 
              backgroundColor: 'rgba(124, 58, 237, 0.2)', 
              border: '1px solid #7C3AED', 
              color: 'white', 
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            Search
          </button>
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{ padding: '10px 20px', borderRadius: '10px', backgroundColor: '#7C3AED', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {isSidebarOpen ? 'Close Vault' : '🧠 Insights Vault'}
        </button>
      </div>

      {/* Intelligence Insights Sidebar/Drawer */}
      {isSidebarOpen && (
        <div style={{ 
          position: 'fixed', 
          right: 0, 
          top: 0, 
          width: 'min(350px, 100%)', 
          height: '100vh', 
          backgroundColor: '#0F172A', 
          zIndex: 1500, 
          borderLeft: '1px solid rgba(255,255,255,0.1)', 
          padding: '20px', 
          overflowY: 'auto', 
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', 
          animation: 'slideLeft 0.3s ease-out' 
        }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Intelligence Vault
            <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '24px', cursor: 'pointer' }}>×</button>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {insights.map((insight) => (
              <div key={insight.id} style={{ ...statCardStyle, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#7C3AED', textTransform: 'uppercase' }}>{insight.type}</span>
                  <span style={{ fontSize: '10px', color: '#555' }}>{new Date(insight.timestamp).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>{insight.summary}</p>
                
                {/* PROACTIVE AUTOMATIONS SECTION */}
                {insight.proactive_automations && insight.proactive_automations.length > 0 && (
                  <div style={{ marginTop: '10px', backgroundColor: 'rgba(52, 211, 153, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#34D399', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      🚀 Proactive Automation Suggestion
                    </div>
                    {insight.proactive_automations.map((auto, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ fontSize: '12px', color: 'white' }}>{auto.action}</div>
                        <button 
                          onClick={() => {
                            if (auto.content) {
                              navigator.clipboard.writeText(auto.content);
                              alert("Draft copied to clipboard! You can now paste it in your email.");
                            } else {
                              alert(`Executing: ${auto.action}`);
                            }
                          }}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #34D399', backgroundColor: 'transparent', color: '#34D399', fontSize: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          {auto.type === 'email' ? 'Copy Email Draft' : 'Execute Action'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {insight.key_insights && insight.key_insights.map((ki, idx) => (
                  <div key={idx} style={{ fontSize: '11px', color: '#9CA3AF' }}>• {ki}</div>
                ))}
                
                {insight.proactive_automations && insight.proactive_automations.length > 0 && (
                  <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(124, 58, 237, 0.1)', borderRadius: '8px', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#7C3AED', marginBottom: '5px', textTransform: 'uppercase' }}>Proactive Agent Suggestions</div>
                    {insight.proactive_automations.map((auto, idx) => (
                      <div key={idx} style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600' }}>{auto.action}</div>
                        <button 
                          onClick={() => alert(`Executing: ${auto.action}\n\nContent: ${auto.content || 'N/A'}`)}
                          style={{ marginTop: '5px', padding: '4px 8px', fontSize: '10px', backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Execute Action
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid - Responsive */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={statCardStyle}>
          <div style={{ color: '#888', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Tasks</div>
          <div style={accentTextStyle}>{stats.total_tasks}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ color: '#F87171', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>High Priority</div>
          <div style={accentTextStyle}>{stats.high_priority_tasks}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ color: '#34D399', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>Completed</div>
          <div style={accentTextStyle}>{stats.completed_tasks}</div>
        </div>
      </div>

      {/* PROBLEM 3 - AI AGENT UI */}
      <div style={{ ...statCardStyle, textAlign: 'left', marginBottom: '40px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>🤖 AI Agent: Auto-Plan</h3>
          <p style={{ color: '#888', fontSize: '14px' }}>Enter a major goal and let NovaMind break it down into tasks.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
          <input 
            type="text" 
            value={agentGoal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Prepare for Monday exam"
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
          <button 
            onClick={handleAgentAutomate}
            disabled={isAgentLoading || !agentGoal}
            style={{ ...refreshButtonStyle, whiteSpace: 'nowrap', opacity: (isAgentLoading || !agentGoal) ? 0.5 : 1 }}
          >
            {isAgentLoading ? 'Planning...' : 'Auto-Plan'}
          </button>
        </div>
      </div>

      {/* Intelligence Insights Vault (Original Section Removed, now in Sidebar) */}

      {/* PROBLEM 4 - KNOWLEDGE LINKING (Related Tasks) */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          🔗 Semantic Knowledge Linking 
          <span style={{ fontSize: '10px', backgroundColor: 'rgba(124, 58, 237, 0.2)', padding: '4px 8px', borderRadius: '4px', color: '#7C3AED' }}>Context-Aware Map</span>
        </h2>
        <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px', scrollbarWidth: 'thin' }}>
          {Object.entries(knowledgeGroups).map(([tag, groupedTasks]) => (
            groupedTasks.length > 0 && (
              <div 
                key={tag} 
                onClick={() => setSearchQuery(tag)}
                style={{ 
                  minWidth: '280px', 
                  backgroundColor: '#1E1F3A', 
                  padding: '20px', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(124, 58, 237, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#7C3AED';
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '60px', height: '60px', background: 'radial-gradient(circle, rgba(124, 58, 237, 0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                <h4 style={{ textTransform: 'uppercase', color: '#7C3AED', fontSize: '13px', fontWeight: '800', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', letterSpacing: '1px' }}>
                  <span>{tag}</span>
                  <span style={{ fontSize: '11px', color: '#555', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>{groupedTasks.length} NODES</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {groupedTasks.slice(0, 4).map(gt => (
                    <div key={gt.id} style={{ fontSize: '13px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: gt.status === 'completed' ? '#34D399' : '#7C3AED' }}></div>
                      <span style={{ textDecoration: gt.status === 'completed' ? 'line-through' : 'none', opacity: gt.status === 'completed' ? 0.5 : 1 }}>
                        {gt.title}
                      </span>
                    </div>
                  ))}
                  {groupedTasks.length > 4 && (
                    <div style={{ fontSize: '11px', color: '#555', marginTop: '5px' }}>+ {groupedTasks.length - 4} more connections...</div>
                  )}
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* Middle - Task List */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
          Recent Intelligence {selectedDate && `(Due ${selectedDate.toLocaleDateString()})`}
          {selectedDate && (
            <span 
              style={{ marginLeft: '15px', fontSize: '12px', color: '#7C3AED', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => setSelectedDate(null)}
            >
              Clear Filter
            </span>
          )}
        </h2>
        <TaskList 
          tasks={filteredTasks} 
          onToggleStatus={handleToggleStatus} 
          onDelete={handleDeleteTask}
          onTaskClick={setSelectedTask} 
          highlightedTaskId={highlightedTaskId}
        />
      </div>

      {/* Bottom - Calendar */}
      <div>
        <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Schedule View</h2>
        <CalendarView tasks={tasks} onDateClick={handleDateClick} selectedDate={selectedDate} />
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setSelectedTask(null)}>
          <div style={{ backgroundColor: '#1E1F3A', borderRadius: '24px', padding: '40px', maxWidth: '600px', width: '100%', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedTask(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#9CA3AF', fontSize: '24px', cursor: 'pointer' }}>×</button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#7C3AED', textTransform: 'uppercase', backgroundColor: 'rgba(124, 58, 237, 0.1)', padding: '4px 12px', borderRadius: '6px' }}>
                Intelligence Detail
              </span>
              <span style={{ color: selectedTask.priority === 'high' ? '#F87171' : '#34D399', fontSize: '12px', fontWeight: 'bold' }}>
                {selectedTask.priority.toUpperCase()} Priority
              </span>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: 'white' }}>{selectedTask.title}</h2>
            <p style={{ color: '#9CA3AF', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>{selectedTask.description}</p>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'white', marginBottom: '12px' }}>Semantic Context</h4>
              <p style={{ fontSize: '14px', color: '#888', fontStyle: 'italic', margin: 0 }}>{selectedTask.summary}</p>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#555', fontSize: '12px', fontWeight: 'bold' }}>
                {selectedTask.deadline ? `Deadline: ${new Date(selectedTask.deadline).toLocaleString()}` : 'No deadline set'}
              </div>
              <button 
                onClick={() => { handleToggleStatus(selectedTask); setSelectedTask(null); }}
                style={{ ...refreshButtonStyle, backgroundColor: selectedTask.status === 'completed' ? '#34D399' : '#7C3AED' }}
              >
                {selectedTask.status === 'completed' ? 'Re-open Task' : 'Mark as Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(236, 72, 153, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(236, 72, 153, 0); }
        }
        @keyframes slideLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
