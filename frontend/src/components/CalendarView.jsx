import React, { useState } from 'react';

const CalendarView = ({ tasks, onDateClick, selectedDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const days = [];
  // Add empty slots for the beginning of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Add actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  const getTasksForDate = (date) => {
    if (!date) return [];
    return tasks.filter(t => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      return d.getDate() === date.getDate() &&
             d.getMonth() === date.getMonth() &&
             d.getFullYear() === date.getFullYear();
    });
  };

  // Styles
  const containerStyle = {
    backgroundColor: '#1E1F3A',
    borderRadius: '15px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)'
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '5px'
  };

  const dayHeaderStyle = {
    textAlign: 'center',
    fontSize: '12px',
    color: '#666',
    fontWeight: 'bold',
    padding: '10px 0'
  };

  const cellStyle = (date) => ({
    aspectRatio: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    cursor: date ? 'pointer' : 'default',
    backgroundColor: isSelected(date) ? '#7C3AED' : isToday(date) ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
    border: isToday(date) ? '1px solid #7C3AED' : 'none',
    color: date ? 'white' : 'transparent',
    transition: 'all 0.2s ease',
    position: 'relative'
  });

  const dotStyle = (priority) => {
    let color = '#7C3AED';
    if (priority === 'high') color = '#F87171';
    if (priority === 'medium') color = '#FBBF24';
    if (priority === 'low') color = '#34D399';

    return {
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      backgroundColor: color,
      margin: '0 1px'
    };
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <button 
          onClick={handlePrevMonth}
          style={{ background: 'none', border: 'none', color: '#7C3AED', cursor: 'pointer', fontWeight: 'bold' }}
        >
          &lt; Prev
        </button>
        <h3 style={{ margin: 0 }}>{monthNames[month]} {year}</h3>
        <button 
          onClick={handleNextMonth}
          style={{ background: 'none', border: 'none', color: '#7C3AED', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Next &gt;
        </button>
      </div>

      <div style={gridStyle}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={dayHeaderStyle}>{d}</div>
        ))}
        {days.map((date, i) => {
          const dayTasks = getTasksForDate(date);
          return (
            <div 
              key={i} 
              style={cellStyle(date)}
              onClick={() => date && onDateClick(date)}
            >
              <span style={{ fontSize: '14px', fontWeight: isToday(date) || isSelected(date) ? 'bold' : 'normal' }}>
                {date ? date.getDate() : ''}
              </span>
              <div style={{ display: 'flex', position: 'absolute', bottom: '5px' }}>
                {dayTasks.slice(0, 3).map((t, idx) => (
                  <div key={idx} style={dotStyle(t.priority)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
