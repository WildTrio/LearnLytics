import AdvancedPomodoroTimer from '../components/AdvancedPomodoroTimer';
import './Timer.css';

export default function Timer() {
  return (
    <div className="timer-page">
      <div className="timer-page-container">
        <AdvancedPomodoroTimer />
      </div>
    </div>
  );
}
