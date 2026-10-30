import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { daysApi, statsApi, verdictApi } from '../api/endpoints.js';
import Shell from '../components/Shell.jsx';
import { formatDay, formatTime } from '../lib/format.js';
import { sortHabits } from '../lib/habits.js';
import { rankClass } from '../lib/rank.js';

function nextAction(summary, day) {
  if (!summary) {
    return { label: 'Reviewing the record', detail: 'One moment.', to: null };
  }
  if (day?.status === 'closed') {
    return {
      label: day.won ? 'Closed · won' : 'Closed · lost',
      detail: `${day.score} of 100`,
      to: null,
      closed: true,
    };
  }
  if (summary.closingDue) {
    return {
      label: 'Close the day',
      detail: 'Every evening habit is filed.',
      to: '/evening',
      cta: 'Close the day',
    };
  }
  if (summary.openingDue) {
    return {
      label: 'Opening check due',
      detail: 'File the wake for today.',
      to: '/morning',
      cta: 'Report in',
    };
  }
  if (summary.eveningDue) {
    return {
      label: 'Evening confirm open',
      detail: 'File the last work, then close the day.',
      to: '/evening',
      cta: 'Report in',
    };
  }
  return {
    label: 'Day open',
    detail: 'Evening filed. Close the day when you go down.',
    to: '/evening',
    cta: 'Continue',
  };
}

export default function Dashboard() {
  const summary = useQuery({ queryKey: ['summary'], queryFn: statsApi.summary });
  const today = summary.data?.today;
  const day = useQuery({
    queryKey: ['day', today],
    queryFn: () => daysApi.get(today),
    enabled: Boolean(today),
  });
  const latestVerdict = useQuery({ queryKey: ['verdict-latest'], queryFn: verdictApi.latest });

  const user = summary.data?.user;
  const log = day.data?.day;
  const habits = sortHabits(day.data?.habits || []);
  const entries = new Map((log?.entries || []).map((e) => [e.habitId, e]));
  const doneCount = habits.filter((h) => entries.get(h.id)?.done).length;
  const closedToday = log?.status === 'closed';

  const strip = summary.data?.strip || [];
  const lastClosed = [...strip].reverse().find((d) => d.closed);
  const verdict = latestVerdict.data?.verdict;
  const action = nextAction(summary.data, log);
  const showLastClosed = Boolean(lastClosed) && lastClosed.date !== log?.date;

  return (
    <Shell>
      <div className="rise">
        <section
          className={`border-l-2 pl-4 ${action.closed ? (log?.won ? 'border-brass' : 'border-blood') : 'border-brass'}`}
          style={{ backgroundColor: 'var(--ink-2)' }}
        >
          <p className={`label ${action.closed ? (log?.won ? 'text-brass' : 'text-blood') : ''}`}>
            {action.label}
          </p>
          <p className="mt-1 text-small text-text-dim">{action.detail}</p>
          {action.to ? (
            <Link to={action.to} className="btn btn-primary mt-6">
              {action.cta}
            </Link>
          ) : null}
          {action.closed && verdict?.verdict ? (
            <>
              <p className="voice mt-6 text-h2 text-text">{verdict.verdict}</p>
              {verdict.question ? <p className="mt-3 text-small text-text-dim">{verdict.question}</p> : null}
            </>
          ) : null}
        </section>

        <div className="mt-16">
          <p className="label">Days unbroken</p>
          <p className="data mt-2 text-[120px] font-light leading-none tracking-tight">
            {user?.currentStreak ?? 0}
          </p>
          <p className={`label mt-6 ${rankClass(user?.rank)}`}>Rank {user?.rank || 'Unranked'}</p>
          <p className="mt-2 data text-small text-text-dim">{user?.totalXp || 0} XP</p>
        </div>

        {showLastClosed ? (
          <section className="mt-16 max-w-chat">
            <p className="label">Last closed · {formatDay(lastClosed.date)}</p>
            <p className={`data mt-2 text-h2 ${lastClosed.won ? 'text-brass' : 'text-blood'}`}>
              {lastClosed.won ? 'Won' : 'Lost'} · {lastClosed.score}
            </p>
            {verdict?.date === lastClosed.date && verdict?.verdict ? (
              <p className="voice mt-6 text-h2 text-text">{verdict.verdict}</p>
            ) : null}
            {verdict?.date === lastClosed.date && verdict?.question ? (
              <p className="mt-3 text-small text-text-dim">{verdict.question}</p>
            ) : null}
          </section>
        ) : null}

        <section className="mt-16 max-w-chat">
          <div className="flex items-baseline justify-between gap-4">
            <p className="label">Today</p>
            {habits.length ? (
              <p className="data text-small text-text-dim">
                {doneCount} of {habits.length} filed
              </p>
            ) : null}
          </div>
          <div className="mt-2">
            {habits.length === 0 ? (
              <p className="text-text-dim">Nothing logged. Noted.</p>
            ) : (
              habits.map((h) => {
                const done = Boolean(entries.get(h.id)?.done);
                const missed = closedToday && !done;
                return (
                  <div
                    key={h.id}
                    className={`flex min-h-12 items-center justify-between gap-4 border-b border-line py-4 ${
                      done ? 'opacity-50' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block">{h.name}</span>
                      {h.targetTime ? (
                        <span className="data text-small text-text-dim">{formatTime(h.targetTime)}</span>
                      ) : null}
                    </span>
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
          </div>
          {habits.length ? (
            <p className="mt-4 text-small text-text-dim">
              The day runs from the wake to lights out. Nothing is late until it closes.
            </p>
          ) : null}
        </section>

        <section className="mt-16">
          <p className="label">Last seven days</p>
          <div className="mt-4 flex gap-2">
            {strip.map((d) => (
              <div key={d.date} className="flex-1">
                <div
                  className="h-8 border"
                  title={`${formatDay(d.date)} · ${d.closed ? (d.won ? 'won' : 'lost') : 'open'}`}
                  style={{
                    borderColor: d.won === false ? '#8E1B1B' : d.won ? '#B89B5E' : '#1E2024',
                    background: d.won ? '#B89B5E' : 'transparent',
                    opacity: d.closed ? 1 : 0.35,
                  }}
                />
                <p className="data mt-2 text-center text-small text-text-dim">
                  {Number(d.date.slice(-2))}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2" style={{ background: '#B89B5E' }} />
              <span className="label">Won</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 border" style={{ borderColor: '#8E1B1B' }} />
              <span className="label">Lost</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 border" style={{ borderColor: '#1E2024' }} />
              <span className="label">Open</span>
            </span>
          </div>
        </section>
      </div>
    </Shell>
  );
}
