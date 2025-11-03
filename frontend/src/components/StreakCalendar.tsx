import { useEffect, useState } from 'react';
import './StreakCalendar.css';

interface CalendarDay {
  date: string;
  hasActivity: boolean;
  tasks: { id: number; title: string }[];
}

interface StreakCalendarProps {
  token: string | null;
}

export default function StreakCalendar({ token }: StreakCalendarProps) {
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    const fetchCalendarData = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/v1/tasks/streak-calendar', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.msg || 'Failed to load calendar data');

        setCalendarData(data.calendarData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch calendar data');
      } finally {
        setLoading(false);
      }
    };

    fetchCalendarData();
  }, [token]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate.getTime() === today.getTime()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (checkDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const getDayLabel = (dateStr: string, index: number) => {
    if (index === calendarData.length - 1) return 'Today';
    if (index === calendarData.length - 2) return 'Yesterday';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayNumber = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getDate();
  };

  const selectedDay = selectedDate
    ? calendarData.find((day) => day.date === selectedDate)
    : null;

  if (loading) {
    return (
      <div className="streak-calendar">
        <h3 className="calendar-title">Weekly Streak</h3>
        <div className="calendar-loading">
          <div className="spinner-small"></div>
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="streak-calendar">
      <h3 className="calendar-title">Weekly Streak</h3>
      {error && <div className="calendar-error">{error}</div>}
      
      <div className="calendar-grid">
        {calendarData.map((day, index) => (
          <div
            key={day.date}
            className={`calendar-day ${day.hasActivity ? 'active' : ''} ${
              selectedDate === day.date ? 'selected' : ''
            }`}
            onClick={() => setSelectedDate(day.date === selectedDate ? null : day.date)}
            title={formatDate(day.date)}
          >
            <div className="day-header">
              <div className="day-label">{getDayLabel(day.date, index)}</div>
              <div className="day-number">{getDayNumber(day.date)}</div>
            </div>
            <div className="day-content">
              {day.hasActivity ? (
                <div className="activity-indicator">
                  <div className="activity-dot"></div>
                  <span className="activity-count">{day.tasks.length}</span>
                </div>
              ) : (
                <div className="no-activity">—</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed height task details panel to prevent resizing */}
      <div className="task-details-panel" style={{ minHeight: selectedDay ? '120px' : '0', maxHeight: selectedDay ? '300px' : '0', opacity: selectedDay ? 1 : 0 }}>
        {selectedDay && (
          <div className="task-details-content">
            <div className="task-details-header">
              <h4 className="task-details-title">
                {formatDate(selectedDay.date)}
              </h4>
              <button 
                className="close-details-btn"
                onClick={() => setSelectedDate(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {selectedDay.tasks.length > 0 ? (
              <ul className="task-list">
                {selectedDay.tasks.map((task) => (
                  <li key={task.id} className="task-item">
                    <span className="task-icon">✓</span>
                    <span className="task-title">{task.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="no-tasks">No tasks completed on this day</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
