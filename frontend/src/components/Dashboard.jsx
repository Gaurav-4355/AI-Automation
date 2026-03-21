import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import TaskList from './TaskList';
import CalendarView from './CalendarView';
import InputHub from './InputHub';

const getApiBaseUrl = () => {
  const { hostname } = window.location;
  // If we are on localhost, use 127.0.0.1 to avoid IPv6 issues on Windows
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://127.0.0.1:8000/api`;
  }
  // For production (Render/Vercel), use the backend URL from environment or logic
   // Update this to your Render URL after deployment
   return `https://sgu-7mjn.onrender.com/api`; 
 };

const API_BASE_URL = getApiBaseUrl();

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const currentUser = JSON.parse(localStorage.getItem('user')) || { role: 'individual' };
  const [teamEfficiency, setTeamEfficiency] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        // Test notification immediately to confirm
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification("NovaMind", {
              body: "Notifications are successfully enabled!",
              icon: "/favicon.svg"
            });
          });
        }
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  };

  const handleAssignTask = async (taskId, userId) => {
    try {
      await axios.post(`${API_BASE_URL}/admin/assign`, 
        { task_id: taskId, user_id: userId },
        { headers: { 'X-User-ID': currentUser.id } }
      );
      fetchData();
      alert("Task assigned successfully!");
    } catch (error) {
      console.error("Error assigning task:", error);
      alert("Failed to assign task.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const fetchData = useCallback(async () => {
    try {
      const headers = { 'X-User-ID': currentUser.id };
      
      if (currentUser.role === 'admin') {
        const effRes = await axios.get(`${API_BASE_URL}/admin/efficiency`, { headers });
        setTeamEfficiency(effRes.data);
        const usersRes = await axios.get(`${API_BASE_URL}/admin/users`, { headers });
        setAllUsers(usersRes.data);
      }
      
      const tasksRes = await axios.get(`${API_BASE_URL}/tasks`, { headers });
      setTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
      
      const statsRes = await axios.get(`${API_BASE_URL}/dashboard/stats`, { headers });
      setStats(statsRes.data || { total_tasks: 0, completed_tasks: 0, high_priority_tasks: 0 });
      
      const insightsRes = await axios.get(`${API_BASE_URL}/dashboard/insights`, { headers });
      setInsights(Array.isArray(insightsRes.data) ? insightsRes.data : []);
    } catch (error) {
      console.error("DEBUG: Error fetching dashboard data:", error);
      // Optional: alert user if the error is critical, but silences for now
    }
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    fetchData();
    if ('serviceWorker' in navigator) {
      const handleMessage = (event) => {
        if (event.data && event.data.type === 'TASK_UPDATED') {
          fetchData();
        }
      };
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  }, [fetchData]);

  const handleAgentAutomate = async () => {
    if (!agentGoal) return;
    setIsAgentLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/agent/automate`, 
        { goal: agentGoal },
        { headers: { 'X-User-ID': currentUser.id } }
      );
      setGoal('');
      fetchData();
      alert("AI Agent has planned your tasks!");
    } catch (error) {
      console.error("Agent error:", error);
    } finally {
      setIsAgentLoading(false);
    }
  };

  const handleToggleStatus = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await axios.put(`${API_BASE_URL}/tasks/${task.id}`, 
        { status: newStatus },
        { headers: { 'X-User-ID': currentUser.id } }
      );
      fetchData();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${taskId}`, {
        headers: { 'X-User-ID': currentUser.id }
      });
      fetchData();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const handleDateClick = (date) => setSelectedDate(date);

  const isSameDate = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getDate() === date2.getDate() && date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
  };

  const handleSearch = () => {
    if (!searchQuery) return;
    const query = searchQuery.toLowerCase();
    const foundTask = tasks.find(t => 
      (t.title && t.title.toLowerCase().includes(query)) || 
      (t.description && t.description.toLowerCase().includes(query)) ||
      (t.tags && (typeof t.tags === 'string' ? t.tags.toLowerCase().includes(query) : t.tags.some(tag => tag.toLowerCase().includes(query))))
    );
    if (foundTask) {
      setHighlightedTaskId(foundTask.id);
      setTimeout(() => setHighlightedTaskId(null), 5000);
      const element = document.getElementById(`task-${foundTask.id}`);
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const filteredTasks = tasks.filter(t => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (t.title && t.title.toLowerCase().includes(query)) || (t.description && t.description.toLowerCase().includes(query));
    const matchesDate = selectedDate ? isSameDate(t.deadline, selectedDate) : true;
    return matchesSearch && matchesDate;
  });

  const groupTasksByKnowledge = () => {
    const groups = {};
    tasks.forEach(task => {
      let tags = [];
      try { if (task.tags) tags = typeof task.tags === 'string' ? JSON.parse(task.tags) : task.tags; } catch {
        // Silently handle JSON parse errors
      }
      if (tags.length === 0) {
        ['project', 'exam', 'meeting', 'study', 'code', 'report'].forEach(kw => { if (task.title.toLowerCase().includes(kw)) tags.push(kw); });
      }
      if (tags.length > 0) {
        tags.forEach(tag => {
          if (!groups[tag]) groups[tag] = [];
          if (!groups[tag].find(t => t.id === task.id)) groups[tag].push(task);
        });
      } else {
        if (!groups['General']) groups['General'] = [];
        groups['General'].push(task);
      }
    });
    return groups;
  };

  const knowledgeGroups = groupTasksByKnowledge();

  const statCardStyle = { 
    backgroundColor: '#1E1F3A', 
    padding: '15px 10px', 
    borderRadius: '15px', 
    border: '1px solid rgba(255,255,255,0.1)', 
    textAlign: 'center',
    overflow: 'hidden' 
  };
  const accentTextStyle = { color: '#7C3AED', fontSize: '24px', fontWeight: 'bold', margin: '5px 0' };
  const refreshButtonStyle = { backgroundColor: '#7C3AED', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' };

  return (
    <div style={{ padding: '20px', maxWidth: '100%', margin: '0 auto', color: 'white', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ position: 'relative' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, background: 'linear-gradient(to right, #7C3AED, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', cursor: 'pointer' }} onClick={() => window.location.href = '/'}>NovaMind</h1>
            <div style={{ position: 'absolute', bottom: '-12px', left: '0', fontSize: '8px', fontWeight: '900', color: '#7C3AED', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.8 }}>Made with TRAE</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '6px 15px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: currentUser.role === 'admin' ? '#7C3AED' : (currentUser.role === 'user' ? '#34D399' : '#EC4899'), boxShadow: '0 0 10px currentColor' }}></div>
            <span style={{ fontSize: '13px', fontWeight: '800', color: 'white' }}>
              {currentUser.full_name} 
              <span style={{ color: '#9CA3AF', fontWeight: 'normal', marginLeft: '5px' }}>
                ({currentUser.role === 'individual' ? 'INDIVIDUAL' : (currentUser.role === 'admin' ? 'ADMIN' : 'USER')})
              </span>
            </span>
            <button onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#EF4444', fontSize: '11px', cursor: 'pointer', marginLeft: '15px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '15px' }}>Logout</button>
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: '400px', display: 'flex', gap: '10px' }}>
          <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSearch()} style={{ flex: 1, padding: '10px 15px', borderRadius: '10px', backgroundColor: '#1E1F3A', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
          <button onClick={handleSearch} style={{ padding: '10px 15px', borderRadius: '10px', backgroundColor: 'rgba(124, 58, 237, 0.2)', border: '1px solid #7C3AED', color: 'white', fontWeight: 'bold' }}>Search</button>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ padding: '10px 20px', borderRadius: '10px', backgroundColor: '#7C3AED', border: 'none', color: 'white', fontWeight: 'bold' }}>{isSidebarOpen ? 'Close Vault' : '🧠 Insights Vault'}</button>
      </div>

      {isSidebarOpen && (
        <div style={{ position: 'fixed', right: 0, top: 0, width: 'min(350px, 100%)', height: '100vh', backgroundColor: '#0F172A', zIndex: 1500, borderLeft: '1px solid rgba(255,255,255,0.1)', padding: '20px', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>Intelligence Vault <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: '24px' }}>×</button></h2>
          {notificationPermission !== 'granted' && (
            <div style={{ marginBottom: '20px', padding: '15px', borderRadius: '12px', backgroundColor: 'rgba(236, 72, 153, 0.1)', border: '1px solid #EC4899', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#EC4899', fontWeight: 'bold' }}>Enable notifications!</p>
              <button onClick={requestNotificationPermission} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#EC4899', color: 'white', fontWeight: 'bold' }}>🔔 Enable Now</button>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {insights.length > 0 ? insights.map((insight, idx) => (
              <div key={insight.id || idx} style={{ ...statCardStyle, textAlign: 'left', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}><span style={{ color: '#7C3AED' }}>{insight.type}</span><span>{new Date(insight.timestamp).toLocaleDateString()}</span></div>
                <p style={{ fontSize: '13px', fontWeight: '600' }}>{insight.summary}</p>
                {insight.proactive_automations && insight.proactive_automations.length > 0 && (
                  <div style={{ marginTop: '10px', backgroundColor: 'rgba(52, 211, 153, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    {insight.proactive_automations.map((auto, i) => (
                      <div key={i} style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '12px' }}>{auto.action}</div>
                        <button onClick={() => { if (auto.content) { navigator.clipboard.writeText(auto.content); alert("Copied!"); } }} style={{ color: '#34D399', fontSize: '10px', background: 'none', border: '1px solid #34D399', borderRadius: '4px', padding: '2px 5px' }}>Copy Draft</button>
                      </div>
                    ))}
                  </div>
                )}
                {insight.key_insights && insight.key_insights.map((ki, i) => <div key={i} style={{ fontSize: '11px', color: '#9CA3AF' }}>• {ki}</div>)}
              </div>
            )) : (
              <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>No intelligence gathered yet.</p>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '30px' }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '5px' }}>Intelligence Nodes</div>
          <div style={accentTextStyle}>{stats.total_tasks}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '5px' }}>Critical Actions</div>
          <div style={{ ...accentTextStyle, color: '#F87171' }}>{stats.high_priority_tasks}</div>
        </div>
        <div style={statCardStyle}>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '5px' }}>Cognitive Wins</div>
          <div style={{ ...accentTextStyle, color: '#34D399' }}>{stats.completed_tasks}</div>
        </div>
        {currentUser.role === 'admin' && (
          <div style={statCardStyle}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '5px' }}>Active Members</div>
            <div style={{ ...accentTextStyle, color: '#60A5FA' }}>{allUsers.filter(u => u.role === 'user').length}</div>
          </div>
        )}
      </div>

      {/* AI Team Analytics & Productivity Graph (ONLY ADMIN) */}
      {currentUser.role === 'admin' && (
        <div style={{ marginBottom: '40px', backgroundColor: '#1E1F3A', padding: '25px', borderRadius: '20px', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '20px', margin: 0 }}>📊 AI Team Analytics & Productivity Graph</h2>
              <p style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '5px' }}>AI-powered performance tracking and automated nudges.</p>
            </div>
            <button 
                onClick={async () => {
                  const msg = prompt("Enter announcement/alert for the team:");
                  if (msg) {
                    try {
                      const res = await axios.post(`${API_BASE_URL}/admin/broadcast`, 
                        { message: msg },
                        { headers: { 'X-User-ID': currentUser.id } }
                      );
                      alert(`AI Refined & Sent: ${res.data.refined_message}`);
                    } catch (e) {
                      alert("Failed to send broadcast.");
                    }
                  }
                }}
                style={{ ...refreshButtonStyle, backgroundColor: 'rgba(236, 72, 153, 0.2)', border: '1px solid #EC4899', color: '#EC4899' }}
              >
                📢 AI Broadcast
              </button>
            </div>

            {/* Simple AI Productivity Graph (Visual Component) */}
            <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '30px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, color: '#666', fontSize: '10px' }}>Productivity Index</div>
              {teamEfficiency.map((user, idx) => (
                <div key={`graph-${idx}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '100%', backgroundColor: '#7C3AED', borderRadius: '4px 4px 0 0', height: `${Math.max(user.percentage, 10)}%`, transition: 'height 1s ease-in-out', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '-20px', width: '100%', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>{Math.round(user.percentage)}%</div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center' }}>{user.user.split(' ')[0]}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              {teamEfficiency.map((user, idx) => (
                <div key={idx} style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{user.user}</span>
                    <span style={{ fontSize: '10px', backgroundColor: 'rgba(124, 58, 237, 0.1)', color: '#7C3AED', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                      Focus: {user.focus_area}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#7C3AED' }}>{Math.round(user.percentage)}%</div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>Completion</div>
                  </div>

                  <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                    <div style={{ width: `${user.percentage}%`, height: '100%', backgroundColor: '#7C3AED', transition: 'width 1s ease-in-out' }}></div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px', marginBottom: '15px' }}>
                    {user.categories && Object.entries(user.categories).map(([cat, count]) => (
                      <span key={cat} style={{ fontSize: '10px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#888' }}>
                        {cat}: {count}
                      </span>
                    ))}
                  </div>

                  <button 
                    onClick={() => {
                      axios.post(`${API_BASE_URL}/admin/nudge`, 
                        { user_id: user.id, message: "AI Agent: Please check your pending high-priority tasks." },
                        { headers: { 'X-User-ID': currentUser.id } }
                      ).then(() => alert(`AI Nudge sent to ${user.user}!`));
                    }}
                    style={{ width: '100%', fontSize: '11px', backgroundColor: 'rgba(124, 58, 237, 0.1)', border: '1px solid #7C3AED', color: '#7C3AED', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    🤖 Send AI Nudge
                  </button>
                </div>
              ))}
            </div>
        </div>
      )}

      {/* AI Agent (Strictly hide for TEAM USER) */}
      {(currentUser.role === 'admin' || currentUser.role === 'individual') && (
        <div style={{ ...statCardStyle, textAlign: 'left', marginBottom: '40px', display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}><h3>🤖 AI Agent: Auto-Plan</h3><p style={{ color: '#888', fontSize: '14px' }}>Break down goals into tasks.</p></div>
          <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
            <input type="text" value={agentGoal} onChange={(e) => setGoal(e.target.value)} placeholder="Enter goal..." style={{ flex: 1, padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.2)', color: 'white' }} />
            <button onClick={handleAgentAutomate} disabled={isAgentLoading || !agentGoal} style={refreshButtonStyle}>{isAgentLoading ? '...' : 'Auto-Plan'}</button>
          </div>
        </div>
      )}

      {/* Input Hub (Strictly hide for TEAM USER) */}
      {(currentUser.role === 'admin' || currentUser.role === 'individual') && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>🧠 Cognitive Input Hub</h2>
          <InputHub onProcessed={fetchData} />
        </div>
      )}

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>🔗 Semantic Knowledge Map</h2>
        <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px' }}>
          {Object.entries(knowledgeGroups).map(([tag, groupedTasks]) => (
            groupedTasks.length > 0 && (
              <div key={tag} onClick={() => setSearchQuery(tag)} style={{ minWidth: '280px', backgroundColor: '#1E1F3A', padding: '20px', borderRadius: '16px', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                <h4 style={{ color: '#7C3AED', fontSize: '13px', marginBottom: '15px' }}>{tag} ({groupedTasks.length} NODES)</h4>
                {groupedTasks.slice(0, 3).map(gt => <div key={gt.id} style={{ fontSize: '12px', color: '#9CA3AF' }}>• {gt.title}</div>)}
              </div>
            )
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Recent Intelligence</h2>
        <TaskList tasks={filteredTasks} onToggleStatus={handleToggleStatus} onDelete={handleDeleteTask} onTaskClick={setSelectedTask} highlightedTaskId={highlightedTaskId} currentUser={currentUser} />
      </div>

      <div>
        <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Schedule View</h2>
        <CalendarView tasks={tasks} onDateClick={handleDateClick} selectedDate={selectedDate} />
      </div>

      {selectedTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedTask(null)}>
          <div style={{ backgroundColor: '#1E1F3A', borderRadius: '24px', padding: '40px', maxWidth: '600px', width: '100%', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedTask(null)} style={{ position: 'absolute', top: '20px', right: '20px', color: '#9CA3AF', fontSize: '24px', background: 'none', border: 'none' }}>×</button>
            <h2>{selectedTask.title}</h2>
            <p>{selectedTask.description}</p>
            {currentUser.role === 'admin' && allUsers.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <select onChange={(e) => handleAssignTask(selectedTask.id, e.target.value)} value={selectedTask.assigned_to_id || ''} style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#0D0E1A', color: 'white' }}>
                  <option value="">Assign to...</option>
                  {allUsers.filter(u => u.role === 'user').map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            )}
            <button onClick={() => { handleToggleStatus(selectedTask); setSelectedTask(null); }} style={refreshButtonStyle}>{selectedTask.status === 'completed' ? 'Re-open' : 'Complete'}</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideLeft { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
};

export default Dashboard;
