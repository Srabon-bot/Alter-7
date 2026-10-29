import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const status = useQuery({ queryKey: ['auth-status'], queryFn: authApi.status });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await authApi.login({ email, password });
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
          <span className="label">Email</span>
          <input className="underline-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input
            className="underline-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-small text-blood">{error}</p> : null}
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
      {status.data?.allowRegistration ? (
        <p className="mt-8 text-center text-small text-text-dim">
          First report.{' '}
          <Link to="/register" className="text-text">
            Register
          </Link>
        </p>
      ) : null}
    </main>
  );
}
