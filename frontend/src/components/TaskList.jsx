import React from 'react';

const TaskList = ({ tasks, onToggleStatus, onDelete, onTaskClick, highlightedTaskId }) => {
  const [expandedInsights, setExpandedInsights] = React.useState({});

  if (!tasks || tasks.length === 0) {
    return (
      <div style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '40px' }}>
        No tasks found in this view.
      </div>
    );
  }

  const toggleInsights = (e, taskId) => {
    e.stopPropagation();
    setExpandedInsights(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Group tasks by parent
  const parentTasks = tasks.filter(t => !t.parent_id);
  const subTasksMap = tasks.reduce((acc, t) => {
    if (t.parent_id) {
      if (!acc[t.parent_id]) acc[t.parent_id] = [];
      acc[t.parent_id].push(t);
    }
    return acc;
  }, {});

  // Styles
  const cardStyle = (status, isSubTask = false, isHighlighted = false) => ({
    backgroundColor: isSubTask ? 'rgba(255,255,255,0.02)' : '#1E1F3A',
    padding: isSubTask ? '12px 20px' : '20px',
    borderRadius: '12px',
    marginBottom: isSubTask ? '8px' : '0', // Sub-tasks have margin, parent handled by container
    marginLeft: isSubTask ? '15px' : '0',
    border: isHighlighted ? '2px solid #7C3AED' : (isSubTask ? '1px dashed rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.05)'),
    boxShadow: isHighlighted ? '0 0 20px rgba(124, 58, 237, 0.4)' : 'none',
    display: 'flex',
    flexDirection: 'column',
    opacity: status === 'completed' ? 0.6 : 1,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    animation: isHighlighted ? 'pulseGlow 2s infinite' : 'none'
  });

  const badgeStyle = (priority) => ({
    fontSize: '10px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    padding: '4px 8px',
    borderRadius: '6px',
    backgroundColor: priority === 'high' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(124, 58, 237, 0.1)',
    color: priority === 'high' ? '#F87171' : '#7C3AED',
  });

  const titleStyle = (status, isSubTask) => ({
    fontSize: isSubTask ? '14px' : '16px',
    fontWeight: '600',
    margin: 0,
    color: status === 'completed' ? '#666' : 'white',
    textDecoration: status === 'completed' ? 'line-through' : 'none',
  });

  const descriptionStyle = {
    color: '#9CA3AF',
    margin: '5px 0 10px 0',
    lineHeight: '1.4',
  };

  const dateStyle = {
    fontSize: '11px',
    color: '#555',
    fontWeight: '600',
  };

  const buttonStyle = (status) => ({
    backgroundColor: status === 'completed' ? '#059669' : '#7C3AED',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  });

  const deleteButtonStyle = {
    backgroundColor: 'transparent',
    color: '#4B5563',
    border: '1px solid #374151',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  };

  const renderTask = (task, index, isSubTask = false) => {
    const isHighlighted = highlightedTaskId === task.id;
    const hasInsights = task.summary || task.key_insights;

    return (
      <div 
        key={task.id} 
        id={`task-${task.id}`}
        style={{ ...cardStyle(task.status, isSubTask, isHighlighted), cursor: 'pointer' }}
        onClick={() => onTaskClick && onTaskClick(task)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, marginRight: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '8px' }}>
              {!isSubTask && <div style={badgeStyle(task.priority)}>{task.priority}</div>}
              {isSubTask && <span style={{ color: '#7C3AED', fontWeight: 'bold', fontSize: '12px' }}>{index + 1}.</span>}
              {!isSubTask && (
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#7C3AED', textTransform: 'uppercase', backgroundColor: 'rgba(124, 58, 237, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  {task.source_type || 'Direct'}
                </span>
              )}
              <h3 style={titleStyle(task.status, isSubTask)}>{task.title}</h3>
            </div>
            {task.description && <p style={{ ...descriptionStyle, fontSize: isSubTask ? '12px' : '14px' }}>{task.description}</p>}
            
            {!isSubTask && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                {task.tags && (() => {
                  try {
                    const tags = typeof task.tags === 'string' ? JSON.parse(task.tags) : task.tags;
                    return Array.isArray(tags) ? tags.map((tag, i) => (
                      <span key={i} style={{ fontSize: '10px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: '#888' }}>
                        #{tag}
                      </span>
                    )) : null;
                  } catch (e) {
                    return null;
                  }
                })()}
              </div>
            )}

            <div style={dateStyle}>
              {task.deadline ? `Deadline: ${new Date(task.deadline).toLocaleDateString()}` : ''}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              style={{ ...buttonStyle(task.status), padding: isSubTask ? '4px 10px' : '8px 15px', fontSize: isSubTask ? '10px' : '12px' }} 
              onClick={(e) => { e.stopPropagation(); onToggleStatus(task); }}
            >
              {task.status === 'completed' ? 'Done' : 'Mark Complete'}
            </button>
            {!isSubTask && (
              <button 
                style={{ ...deleteButtonStyle, padding: '8px 15px' }} 
                onClick={(e) => { e.stopPropagation(); onDelete && onDelete(task.id); }}
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Intelligence Insights Button & Dropdown */}
        {!isSubTask && hasInsights && (
          <div style={{ marginTop: '15px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
            <button 
              onClick={(e) => toggleInsights(e, task.id)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#7C3AED', 
                fontSize: '12px', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 0',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textShadow: '0 0 10px rgba(124, 58, 237, 0.5)'
              }}
            >
              {expandedInsights[task.id] ? '▼ Hide Insights' : '💡 Intelligence Insights'}
            </button>
            
            {expandedInsights[task.id] && (
              <div style={{ 
                marginTop: '10px', 
                padding: '15px', 
                backgroundColor: 'rgba(124, 58, 237, 0.05)', 
                borderRadius: '10px',
                border: '1px solid rgba(124, 58, 237, 0.1)',
                animation: 'slideDown 0.3s ease-out'
              }}>
                <p style={{ fontSize: '13px', color: 'white', lineHeight: '1.5', margin: '0 0 10px 0' }}>{task.summary}</p>
                {task.key_insights && (() => {
                  try {
                    const insights = typeof task.key_insights === 'string' ? JSON.parse(task.key_insights) : task.key_insights;
                    return Array.isArray(insights) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {insights.map((ki, i) => (
                          <div key={i} style={{ fontSize: '12px', color: '#9CA3AF' }}>• {ki}</div>
                        ))}
                      </div>
                    ) : null;
                  } catch (e) {
                    return null;
                  }
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {parentTasks.map((task) => (
        <div key={task.id} style={{ position: 'relative', marginBottom: '15px' }}>
          {renderTask(task)}
          {subTasksMap[task.id] && subTasksMap[task.id].length > 0 && (
            <div style={{ 
              marginTop: '-10px', 
              marginBottom: '10px', 
              paddingTop: '10px',
              borderLeft: '2px solid rgba(124, 58, 237, 0.2)',
              marginLeft: '25px'
            }}>
              {subTasksMap[task.id].map((st, idx) => renderTask(st, idx, true))}
            </div>
          )}
        </div>
      ))}
      <style>{`
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 10px rgba(124, 58, 237, 0.4); }
          50% { box-shadow: 0 0 25px rgba(124, 58, 237, 0.7); }
          100% { box-shadow: 0 0 10px rgba(124, 58, 237, 0.4); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default TaskList;
