import { useEffect, useState } from 'react';
import StreakCalendar from '../components/StreakCalendar';
import './Dashboard.css';

type UserProfile = {
  id: number;
  name: string;
  email: string;
};

type DashboardStats = {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  currentStreak: number;
};

type OverdueTask = {
  id: number;
  title: string;
  description: string;
  subject: string;
  due_date: string;
};

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);

    if (!storedToken) {
      setError('Sign in to see your profile.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch profile
        const profileRes = await fetch('http://localhost:3000/api/v1/user/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        const profileData = await profileRes.json();
        if (!profileRes.ok) throw new Error(profileData.msg || 'Failed to load profile');
        setProfile(profileData);

        // Fetch dashboard stats
        const statsRes = await fetch('http://localhost:3000/api/v1/tasks/dashboard', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        const statsData = await statsRes.json();
        if (!statsRes.ok) throw new Error(statsData.msg || 'Failed to load stats');
        setStats(statsData);

        // Fetch overdue tasks
        const overdueRes = await fetch('http://localhost:3000/api/v1/tasks/overdue', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        const overdueData = await overdueRes.json();
        if (overdueRes.ok) {
          setOverdueTasks(overdueData);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!token || !profile) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-error">
          <p>Please sign in to view your dashboard.</p>
          <a href="/signin">Go to Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-greeting">
          Welcome back, <strong>{profile.name}</strong>!
        </p>
      </div>

      {error && <div className="dashboard-error-banner">{error}</div>}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.totalTasks || 0}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>

        <div className="stat-card stat-pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.pendingTasks || 0}</div>
            <div className="stat-label">Pending Tasks</div>
          </div>
        </div>

        <div className="stat-card stat-completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.completedTasks || 0}</div>
            <div className="stat-label">Completed Tasks</div>
          </div>
        </div>

        <div className="stat-card stat-overdue">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.overdueTasks || 0}</div>
            <div className="stat-label">Overdue Tasks</div>
          </div>
        </div>

        <div className="stat-card stat-streak">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.currentStreak || 0}</div>
            <div className="stat-label">Current Streak</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-main">
        <div className="dashboard-left">
          <div className="overdue-section">
            <h3 className="section-title">⚠️ Overdue Tasks</h3>
            {overdueTasks.length === 0 ? (
              <p className="no-overdue">No overdue tasks! Great job! 🎉</p>
            ) : (
              <ul className="overdue-list">
                {overdueTasks.map((task) => (
                  <li key={task.id} className="overdue-item">
                    <div className="overdue-task-header">
                      <span className="overdue-task-title">{task.title}</span>
                      <span className="overdue-badge">OVERDUE</span>
                    </div>
                    {task.subject && (
                      <span className="overdue-task-subject">{task.subject}</span>
                    )}
                    <span className="overdue-task-date">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="dashboard-right">
          <StreakCalendar token={token} />
        </div>
      </div>

      {/* Quick Links */}
      <div className="dashboard-links">
        <a href="/tasks" className="dashboard-link">View All Tasks</a>
        <a href="/timer" className="dashboard-link">Pomodoro Timer</a>
      </div>
    </div>
  );
}
