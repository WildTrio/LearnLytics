import { useState } from 'react';
import './Signup.css';
import { useNavigate } from 'react-router-dom'; // for redirecting

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch('http://localhost:3000/api/v1/user/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(
          data.msg || (data.errors && data.errors.join(', ')) || 'Signup failed'
        );
        return;
      }

      // Store JWT token
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Store user info for frontend
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setMessage('Account created! Redirecting to dashboard...');
      
      // Reset form
      setName('');
      setEmail('');
      setPassword('');

      // Redirect to dashboard
      setTimeout(() => navigate('/dashboard'), 1000); // slight delay to show message

    } catch (err) {
      console.error(err);
      setMessage('Network error. Try again.');
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Create account</h2>
        {message && <div className="auth-message">{message}</div>}
        <label>
          <span>Name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            required
          />
        </label>
        <label>
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
          />
        </label>
        <label>
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>
        <button className="auth-btn" type="submit">Sign up</button>
        <p className="auth-switch">
          Already have an account? <a href="/signin">Sign in</a>
        </p>
      </form>
    </div>
  );
}
