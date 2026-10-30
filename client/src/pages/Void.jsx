import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { statsApi } from '../api/endpoints.js';

export default function Void() {
  const navigate = useNavigate();
  const summary = useQuery({ queryKey: ['summary'], queryFn: statsApi.summary });

  function continueOn() {
    if (summary.data?.morningDue) navigate('/morning');
    else navigate('/dashboard');
  }

  const line = summary.data?.latestLine || 'Report in. The day is waiting.';
  const destination = summary.data?.morningDue ? 'Continue to morning report' : 'Continue to today';

  return (
    <button
      type="button"
      onClick={continueOn}
      className="flex min-h-screen w-full cursor-pointer flex-col items-center justify-center bg-void px-8 text-center"
    >
      <p className="voice rise max-w-chat text-h1 text-text">{summary.isLoading ? 'Reviewing the record.' : line}</p>
      <p className="label mt-16 text-text-dim">{summary.isLoading ? 'Reviewing the record.' : destination}</p>
    </button>
  );
}
