import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { daysApi, statsApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';
import HabitRow from '../components/HabitRow.jsx';
import Scale from '../components/Scale.jsx';
import Shell from '../components/Shell.jsx';
import { formatDay } from '../lib/format.js';

const COPY = {
  evening: {
    title: 'Evening confirm',
    section: 'Today',
    heading: 'The work of today.',
    hint: "Today's work. The day closes tomorrow morning.",
    other: 'Phone away, lights out and wake time are filed in the morning report.',
  },
  morning: {
    title: 'Morning report',
    section: 'Last night',
    heading: 'Last night. Then the day closes.',
    hint: '',
    other: 'Morning workout was filed in last night’s confirm.',
  },
};

function statusOf(day) {
  if (!day) return { text: 'Nothing filed', className: 'text-text-faint' };
  if (day.status === 'closed') {
    return {
      text: `${day.won ? 'Won' : 'Lost'} · ${day.score}`,
      className: day.won ? 'text-brass' : 'text-blood',
    };
  }
  return { text: 'Open', className: 'text-text-dim' };
}

export default function Report({ kind }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const summary = useQuery({ queryKey: ['summary'], queryFn: statsApi.summary });
  const copy = COPY[kind] || COPY.evening;

  const defaultDate =
    kind === 'morning'
      ? summary.data?.morningDate || summary.data?.yesterday
      : summary.data?.eveningDate;
  const date = params.get('date') || defaultDate;

  const dayQuery = useQuery({
    queryKey: ['day', date],
    queryFn: () => daysApi.get(date),
    enabled: Boolean(date),
  });

  const day = dayQuery.data?.day;
  const windowName = kind === 'morning' ? 'night' : 'day';
  const habits = useMemo(
    () => (dayQuery.data?.habits || []).filter((h) => h.window === windowName),
    [dayQuery.data, windowName],
  );

  const [done, setDone] = useState({});
  const [mood, setMood] = useState(null);
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(null);

  const isPast = Boolean(date && summary.data?.today && date !== summary.data.today);
  const showTools = toolsOpen ?? isPast;
  const status = statusOf(day);

  useEffect(() => {
    setError('');
    setConfirmDelete(false);
    setDone({});
    setMood(null);
    setEnergy(null);
    setNote('');
    setToolsOpen(null);
  }, [date]);

  useEffect(() => {
    if (!dayQuery.data) return;
    const next = {};
    for (const e of dayQuery.data.day?.entries || []) next[e.habitId] = e.done;
    setDone(next);
    setMood(dayQuery.data.day?.mood || null);
    setEnergy(dayQuery.data.day?.energy || null);
    setNote(dayQuery.data.day?.note || '');
  }, [dayQuery.data]);

  function changeDate(e) {
    const next = e.target.value;
    if (next) setParams({ date: next }, { replace: true });
    else setParams({}, { replace: true });
  }

  const save = useMutation({
    mutationFn: async () => {
      const entries = habits.map((h) => ({ habitId: h.id, done: Boolean(done[h.id]) }));
      if (kind === 'evening') {
        return daysApi.evening(date, { entries, mood, energy, note });
      }
      return daysApi.morning(date, { entries });
    },
    onSuccess: async (data) => {
      await qc.invalidateQueries();
      if (kind === 'morning' && data?.day) {
        navigate('/dashboard', {
          state: {
            justClosed: { date: data.day.date, won: data.day.won, score: data.day.score },
          },
        });
        return;
      }
      navigate('/dashboard');
    },
    onError: (err) => setError(err.uiMessage),
  });

  const remove = useMutation({
    mutationFn: () => daysApi.remove(date),
    onSuccess: async () => {
      await qc.invalidateQueries();
      navigate('/dashboard');
    },
    onError: (err) => setError(err.uiMessage),
  });

  return (
    <Shell>
      <div className="mx-auto max-w-chat rise">
        <p className="label">{copy.title}</p>

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
          <p className="data text-h2 text-text">{date ? formatDay(date) : '—'}</p>
          <p className={`data text-small ${status.className}`}>{status.text}</p>
        </div>

        {copy.hint ? <p className="mt-3 text-small text-text-dim">{copy.hint}</p> : null}
        {isPast ? (
          <p className="mt-3 text-small text-text-dim">
            Backfill. Closed days can be edited for three days.
          </p>
        ) : null}

        <p className="voice mt-8 text-h2">{copy.heading}</p>

        <p className="label mt-12">{copy.section}</p>
        <div className="mt-2">
          {habits.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              done={Boolean(done[h.id])}
              onToggle={(value) => setDone((s) => ({ ...s, [h.id]: value }))}
            />
          ))}
        </div>
        <p className="mt-4 text-small text-text-dim">{copy.other}</p>

        {kind === 'evening' ? (
          <>
            <Scale label="Mood" value={mood} onChange={setMood} />
            <Scale label="Energy" value={energy} onChange={setEnergy} />
            <label className="mt-8 block">
              <span className="label">Note</span>
              <textarea
                className="underline-input min-h-24 resize-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </>
        ) : null}

        {dayQuery.isError ? <p className="mt-6 text-small text-blood">{dayQuery.error.uiMessage}</p> : null}
        {error ? <p className="mt-6 text-small text-blood">{error}</p> : null}

        <Button className="mt-12 w-full" onClick={() => save.mutate()} disabled={save.isPending || !date}>
          {save.isPending ? 'Reviewing the record.' : 'Report in'}
        </Button>

        <div className="mt-16 border-t border-line pt-6">
          <button
            type="button"
            className="label text-text-dim hover:text-text"
            onClick={() => setToolsOpen(!showTools)}
            aria-expanded={showTools}
          >
            {showTools ? 'Close day tools' : 'Change day'}
          </button>

          {showTools ? (
            <div className="mt-6 space-y-8">
              <label className="block">
                <span className="label">Ritual day</span>
                <input
                  type="date"
                  className="underline-input"
                  value={date || ''}
                  max={summary.data?.today || ''}
                  onChange={changeDate}
                />
                <span className="mt-2 block text-small text-text-dim">
                  Older days are backfills. Future days cannot be filed.
                </span>
              </label>

              {day ? (
                confirmDelete ? (
                  <div className="border border-blood p-6">
                    <p>This cannot be undone.</p>
                    <div className="mt-4 flex flex-wrap gap-4">
                      <Button variant="blood" onClick={() => remove.mutate()} disabled={remove.isPending}>
                        Delete
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                        Continue
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="label text-blood"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete this day
                  </button>
                )
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Shell>
  );
}
