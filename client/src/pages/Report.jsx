import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { daysApi, statsApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';
import HabitRow from '../components/HabitRow.jsx';
import Scale from '../components/Scale.jsx';
import Shell from '../components/Shell.jsx';

export default function Report({ kind }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const summary = useQuery({ queryKey: ['summary'], queryFn: statsApi.summary });

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

  useEffect(() => {
    setError('');
    setConfirmDelete(false);
    setDone({});
    setMood(null);
    setEnergy(null);
    setNote('');
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
    onSuccess: async () => {
      await qc.invalidateQueries();
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
        <p className="label">{kind === 'morning' ? 'Morning report' : 'Evening confirm'}</p>
        <div className="mt-2 flex items-end justify-between gap-6">
          <label className="flex-1">
            <span className="label">Ritual day</span>
            <input
              type="date"
              className="underline-input"
              value={date || ''}
              max={summary.data?.today || ''}
              onChange={changeDate}
            />
          </label>
          {day ? (
            <p
              className={`data pb-3 text-small ${
                day.status === 'closed' ? (day.won ? 'text-brass' : 'text-blood') : 'text-text-dim'
              }`}
            >
              {day.status === 'closed' ? `${day.won ? 'Won' : 'Lost'} · ${day.score}` : 'Open'}
            </p>
          ) : null}
        </div>
        {day?.status === 'closed' ? (
          <p className="mt-2 text-small text-text-dim">Edits to a closed day are limited to three days.</p>
        ) : null}

        <p className="voice mt-8 text-h2">
          {kind === 'morning' ? 'Last night. Then the day closes.' : 'The work of today.'}
        </p>

        <div className="mt-12">
          {habits.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              done={Boolean(done[h.id])}
              onToggle={(value) => setDone((s) => ({ ...s, [h.id]: value }))}
            />
          ))}
        </div>

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

        {day ? (
          confirmDelete ? (
            <div className="mt-12 border border-blood p-6">
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
            <button type="button" className="label mt-12 text-blood" onClick={() => setConfirmDelete(true)}>
              Delete this day
            </button>
          )
        ) : null}
      </div>
    </Shell>
  );
}
