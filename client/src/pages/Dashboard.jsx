import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { daysApi, statsApi } from '../api/endpoints.js';
import Shell from '../components/Shell.jsx';
import { rankClass } from '../lib/rank.js';

export default function Dashboard() {
  const summary = useQuery({ queryKey: ['summary'], queryFn: statsApi.summary });
  const today = summary.data?.today;
  const day = useQuery({
    queryKey: ['day', today],
    queryFn: () => daysApi.get(today),
    enabled: Boolean(today),
  });

  const user = summary.data?.user;
  const habits = day.data?.habits || [];
  const entries = new Map((day.data?.day?.entries || []).map((e) => [e.habitId, e]));

  return (
    <Shell>
      <div className="rise">
        <p className="label">Days unbroken</p>
        <p className="data mt-2 text-[120px] font-light leading-none tracking-tight">
          {user?.currentStreak ?? 0}
        </p>
        <p className={`label mt-6 ${rankClass(user?.rank)}`}>Rank {user?.rank || 'Unranked'}</p>
        <p className="mt-2 data text-small text-text-dim">{user?.totalXp || 0} XP</p>

        <p className="voice mt-16 max-w-chat text-h2 text-text">
          {summary.data?.latestLine || 'Nothing logged. Noted.'}
        </p>

        <section className="mt-16 max-w-chat">
          <p className="label mb-4">Today</p>
          {habits.length === 0 ? (
            <p className="text-text-dim">Nothing logged. Noted.</p>
          ) : (
            habits.map((h) => {
              const entry = entries.get(h.id);
              const done = Boolean(entry?.done);
              const missed = Boolean(entry) && !done;
              return (
                <div
                  key={h.id}
                  className={`flex min-h-12 items-center justify-between border-b border-line py-4 ${
                    done ? 'opacity-50' : ''
                  }`}
                >
                  <span>{h.name}</span>
                  <span
                    className={done ? 'text-brass' : missed ? 'text-blood' : 'text-text-faint'}
                    style={{ fontSize: 13 }}
                  >
                    {done ? '✓' : '—'}
                  </span>
                </div>
              );
            })
          )}
        </section>

        <div className="mt-16 flex gap-2">
          {(summary.data?.strip || []).map((d) => (
            <div
              key={d.date}
              className="h-8 flex-1 border"
              style={{
                borderColor: d.won === false ? '#8E1B1B' : d.won ? '#B89B5E' : '#1E2024',
                background: d.won ? '#B89B5E' : 'transparent',
                opacity: d.closed ? 1 : 0.35,
              }}
              title={d.date}
            />
          ))}
        </div>

        <div className="mt-16 flex flex-wrap gap-4">
          {summary.data?.morningDue ? (
            <Link to="/morning" className="btn btn-primary">
              Report in
            </Link>
          ) : (
            <Link to="/evening" className="btn btn-primary">
              Report in
            </Link>
          )}
          <Link to="/habits" className="btn btn-secondary">
            Habits
          </Link>
        </div>
      </div>
    </Shell>
  );
}
