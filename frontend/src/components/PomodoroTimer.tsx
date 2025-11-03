import { useState, useEffect, useRef } from 'react';
import './PomodoroTimer.css';

export default function PomodoroTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
              setIsRunning(false);
              // Play sound or notification when timer ends
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
    setMinutes(25);
    setSeconds(0);
  };

  const formatTime = (value: number) => {
    return value.toString().padStart(2, '0');
  };

  return (
    <div className="pomodoro-timer">
      <h3 className="pomodoro-title">Pomodoro Timer</h3>
      <div className="timer-display">
        <span className="timer-time">
          {formatTime(minutes)}:{formatTime(seconds)}
        </span>
      </div>
      <div className="timer-controls">
        {!isRunning ? (
          <button className="timer-btn timer-btn-start" onClick={handleStart}>
            Start
          </button>
        ) : (
          <button className="timer-btn timer-btn-pause" onClick={handlePause}>
            Pause
          </button>
        )}
        <button className="timer-btn timer-btn-reset" onClick={resetTimer}>
          Reset
        </button>
      </div>
    </div>
  );
}

