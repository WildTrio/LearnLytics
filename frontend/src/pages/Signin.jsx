import { useState } from 'react';
import './Signin.css';
import { useNavigate } from 'react-router-dom'; // optional, better than window.location

export default function Signin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch('http://localhost:3000/api/v1/user/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.msg || 'Sign in failed');
        return;
      }

      // Save JWT
      localStorage.setItem('token', data.token);

      // Optionally save user info (id, name, email) for frontend
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      setMessage('Signed in successfully!');

      // Redirect to dashboard
      navigate('/dashboard'); // React Router way
      // window.location.href = '/dashboard'; // fallback option

    } catch (err) {
      console.error(err);
      setMessage('Network error. Try again.');
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Welcome back</h2>
        {message && <div className="auth-message">{message}</div>}
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
        <button className="auth-btn" type="submit">Sign in</button>
        <p className="auth-switch">
          No account? <a href="/signup">Create one</a>
        </p>
      </form>
    </div>
  );
}
