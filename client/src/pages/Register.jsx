import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await authApi.register({ name, email, password, timezone: 'Asia/Dhaka' });
      navigate('/void');
    } catch (err) {
      setError(err.uiMessage);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-chat flex-col justify-center px-6">
      <p className="voice mb-16 text-center text-h2 tracking-[0.24em]">
        THE <span className="text-brass">7</span>
      </p>
      <form onSubmit={onSubmit} className="space-y-8 rise">
        <label className="block">
          <span className="label">Name</span>
          <input className="underline-input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Email</span>
          <input className="underline-input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input className="underline-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error ? <p className="text-small text-blood">{error}</p> : null}
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
      <p className="mt-8 text-center text-small text-text-dim">
        Already in.{' '}
        <Link to="/login" className="text-text">
          Sign in
        </Link>
      </p>
    </main>
  );
}
