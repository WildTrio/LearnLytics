import { useState, useEffect, useRef } from 'react';
import './AdvancedPomodoroTimer.css';

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

export default function AdvancedPomodoroTimer() {
  const [settings, setSettings] = useState<PomodoroSettings>({
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4,
  });
  const [currentMode, setCurrentMode] = useState<TimerMode>('pomodoro');
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Update timer when mode or settings change
    if (currentMode === 'pomodoro') {
      setMinutes(settings.pomodoro);
    } else if (currentMode === 'shortBreak') {
      setMinutes(settings.shortBreak);
    } else {
      setMinutes(settings.longBreak);
    }
    setSeconds(0);
  }, [currentMode, settings]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev > 0) {
            return prev - 1;
          } else {
            if (minutes > 0) {
              setMinutes((prev) => prev - 1);
              return 59;
            } else {
              // Timer completed
              handleTimerComplete();
              return 0;
            }
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, minutes]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    if (currentMode === 'pomodoro') {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);
      
      // Check if it's time for long break
      if (newCount % settings.longBreakInterval === 0) {
        setCurrentMode('longBreak');
      } else {
        setCurrentMode('shortBreak');
      }
    } else {
      // Break completed, go back to pomodoro
      setCurrentMode('pomodoro');
    }

    // Play notification sound (if needed)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Timer Complete!', {
        body: `${currentMode === 'pomodoro' ? 'Time for a break!' : 'Back to work!'}`,
      });
    }
  };

  const handleStart = () => {
    if (minutes === 0 && seconds === 0) {
      resetTimer();
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    if (currentMode === 'pomodoro') {
      setMinutes(settings.pomodoro);
    } else if (currentMode === 'shortBreak') {
      setMinutes(settings.shortBreak);
    } else {
      setMinutes(settings.longBreak);
    }
    setSeconds(0);
  };

  const switchMode = (mode: TimerMode) => {
    if (isRunning) setIsRunning(false);
    setCurrentMode(mode);
    if (mode === 'pomodoro') {
      setMinutes(settings.pomodoro);
    } else if (mode === 'shortBreak') {
      setMinutes(settings.shortBreak);
    } else {
      setMinutes(settings.longBreak);
    }
    setSeconds(0);
  };

  const handleSettingChange = (key: keyof PomodoroSettings, value: number) => {
    if (value < 1 || value > 60) return;
    setSettings({ ...settings, [key]: value });
  };

  const formatTime = (value: number) => {
    return value.toString().padStart(2, '0');
  };

  const getModeLabel = () => {
    if (currentMode === 'pomodoro') return 'Focus Time';
    if (currentMode === 'shortBreak') return 'Short Break';
    return 'Long Break';
  };

  const getModeColor = () => {
    if (currentMode === 'pomodoro') return 'var(--pomodoro-color)';
    if (currentMode === 'shortBreak') return 'var(--short-break-color)';
    return 'var(--long-break-color)';
  };

  return (
    <div className="advanced-pomodoro-timer">
      <div className="timer-header">
        <h2 className="timer-title">Pomodoro Timer</h2>
        <button
          className="settings-btn"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Settings"
        >
          ⚙️
        </button>
      </div>

      {showSettings && (
        <div className="settings-panel">
          <h3 className="settings-title">Timer Settings</h3>
          <div className="settings-grid">
            <div className="setting-item">
              <label>Pomodoro (min)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.pomodoro}
                onChange={(e) => handleSettingChange('pomodoro', parseInt(e.target.value) || 1)}
                disabled={isRunning}
              />
            </div>
            <div className="setting-item">
              <label>Short Break (min)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.shortBreak}
                onChange={(e) => handleSettingChange('shortBreak', parseInt(e.target.value) || 1)}
                disabled={isRunning}
              />
            </div>
            <div className="setting-item">
              <label>Long Break (min)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.longBreak}
                onChange={(e) => handleSettingChange('longBreak', parseInt(e.target.value) || 1)}
                disabled={isRunning}
              />
            </div>
            <div className="setting-item">
              <label>Long Break Interval</label>
              <input
                type="number"
                min="2"
                max="10"
                value={settings.longBreakInterval}
                onChange={(e) => handleSettingChange('longBreakInterval', parseInt(e.target.value) || 2)}
                disabled={isRunning}
              />
            </div>
          </div>
        </div>
      )}

      <div className="mode-selector">
        <button
          className={`mode-btn ${currentMode === 'pomodoro' ? 'active' : ''}`}
          onClick={() => switchMode('pomodoro')}
          disabled={isRunning}
        >
          Pomodoro
        </button>
        <button
          className={`mode-btn ${currentMode === 'shortBreak' ? 'active' : ''}`}
          onClick={() => switchMode('shortBreak')}
          disabled={isRunning}
        >
          Short Break
        </button>
        <button
          className={`mode-btn ${currentMode === 'longBreak' ? 'active' : ''}`}
          onClick={() => switchMode('longBreak')}
          disabled={isRunning}
        >
          Long Break
        </button>
      </div>

      <div className="timer-display-wrapper">
        <div className="mode-label">{getModeLabel()}</div>
        <div className="timer-display" style={{ color: getModeColor() }}>
          <span className="timer-time">
            {formatTime(minutes)}:{formatTime(seconds)}
          </span>
        </div>
        <div className="pomodoro-count">
          Completed: {pomodoroCount} pomodoro{pomodoroCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="timer-controls">
        {!isRunning ? (
          <button className="timer-btn timer-btn-start" onClick={handleStart}>
            ▶ Start
          </button>
        ) : (
          <button className="timer-btn timer-btn-pause" onClick={handlePause}>
            ⏸ Pause
          </button>
        )}
        <button className="timer-btn timer-btn-reset" onClick={resetTimer}>
          ⟲ Reset
        </button>
      </div>

      <div className="timer-info">
        <p>Next: {currentMode === 'pomodoro' ? 'Short Break' : 'Pomodoro'}</p>
        <p>Long break after {settings.longBreakInterval - (pomodoroCount % settings.longBreakInterval)} more pomodoro{settings.longBreakInterval - (pomodoroCount % settings.longBreakInterval) !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}

