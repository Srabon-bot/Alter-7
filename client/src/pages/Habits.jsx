import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { habitsApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';
import Shell from '../components/Shell.jsx';
import { formatTime } from '../lib/format.js';

const empty = {
  name: '',
  description: '',
  type: 'boolean',
  target: 1,
  unit: '',
  weight: 5,
  targetTime: '',
  window: 'evening',
  core: true,
};

function habitPayload(form) {
  return {
    name: form.name,
    description: form.description,
    type: form.type,
    target: form.type === 'numeric' ? Number(form.target) || 0 : 1,
    unit: form.unit,
    weight: Number(form.weight),
    targetTime: form.targetTime || '',
    window: form.window,
    core: Boolean(form.core),
  };
}

function HabitFields({ form, setForm }) {
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <input
        className="underline-input"
        placeholder="Name"
        value={form.name}
        onChange={set('name')}
        maxLength={80}
        required
      />
      <input
        className="underline-input"
        placeholder="Description"
        value={form.description}
        onChange={set('description')}
        maxLength={400}
      />
      <div className="grid grid-cols-2 gap-6">
        <label>
          <span className="label">Type</span>
          <select className="underline-input bg-void" value={form.type} onChange={set('type')}>
            <option value="boolean">Done or not</option>
            <option value="numeric">Numeric</option>
          </select>
        </label>
        <label>
          <span className="label">Window</span>
          <select className="underline-input bg-void" value={form.window} onChange={set('window')} required>
            <option value="" disabled>
              Choose a window
            </option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <label>
          <span className="label">Weight</span>
          <input
            className="underline-input"
            type="number"
            min="1"
            max="5"
            value={form.weight}
            onChange={set('weight')}
          />
        </label>
        <label>
          <span className="label">Target time</span>
          <input className="underline-input" type="time" value={form.targetTime} onChange={set('targetTime')} />
          <span className="data text-small text-text-dim">
            {form.targetTime ? formatTime(form.targetTime) : '—'}
          </span>
        </label>
      </div>
      <p className="text-small text-text-dim">
        Morning files the wake at the opening check. Evening holds the last work and closes the day.
      </p>
      {form.type === 'numeric' ? (
        <div className="grid grid-cols-2 gap-6">
          <label>
            <span className="label">Target</span>
            <input
              className="underline-input"
              type="number"
              min="0"
              step="any"
              value={form.target}
              onChange={set('target')}
            />
          </label>
          <label>
            <span className="label">Unit</span>
            <input
              className="underline-input"
              placeholder="hours"
              value={form.unit}
              onChange={set('unit')}
              maxLength={32}
            />
          </label>
        </div>
      ) : null}
      <label className="flex min-h-12 items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4"
          style={{ accentColor: 'var(--brass)' }}
          checked={Boolean(form.core)}
          onChange={(e) => setForm({ ...form, core: e.target.checked })}
        />
        <span>
          <span className="label block">Core habit</span>
          <span className="text-small text-text-dim">Core habits decide whether a day is won.</span>
        </span>
      </label>
    </>
  );
}

export default function Habits() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['habits'], queryFn: habitsApi.list });
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(empty);
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState(null);

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['habits'] }),
      qc.invalidateQueries({ queryKey: ['summary'] }),
      qc.invalidateQueries({ queryKey: ['day'] }),
    ]);
  }

  const create = useMutation({
    mutationFn: () => habitsApi.create(habitPayload(form)),
    onSuccess: async () => {
      setForm(empty);
      setError('');
      await refresh();
    },
    onError: (err) => setError(err.uiMessage),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }) => habitsApi.update(id, body),
    onSuccess: async () => {
      setEditId(null);
      setError('');
      await refresh();
    },
    onError: (err) => setError(err.uiMessage),
  });

  const remove = useMutation({
    mutationFn: (id) => habitsApi.remove(id),
    onSuccess: async () => {
      setConfirmId(null);
      setError('');
      await refresh();
    },
    onError: (err) => setError(err.uiMessage),
  });

  function startEdit(habit) {
    setEditId(habit.id);
    setEditForm({
      name: habit.name || '',
      description: habit.description || '',
      type: habit.type || 'boolean',
      target: habit.target ?? 1,
      unit: habit.unit || '',
      weight: habit.weight ?? 5,
      targetTime: habit.targetTime || '',
      window: ['morning', 'evening'].includes(habit.window) ? habit.window : '',
      core: Boolean(habit.core),
    });
    setConfirmId(null);
    setError('');
  }

  return (
    <Shell>
      <div className="mx-auto max-w-chat rise">
        <p className="label">Habits</p>
        <p className="voice mt-4 text-h2">The work, listed.</p>
        <p className="mt-4 text-small text-text-dim">
          Core habits decide whether a day is won. Weight 1 to 5 sets how much a habit counts toward
          the score.
        </p>
        {list.data?.warning ? <p className="mt-6 text-small text-blood">{list.data.warning}</p> : null}
        {error ? <p className="mt-6 text-small text-blood">{error}</p> : null}

        <div className="mt-12">
          {(list.data?.habits || []).map((h) => (
            <div key={h.id} className="flex min-h-12 flex-wrap items-center gap-4 border-b border-line py-4">
              <div className="min-w-0 flex-1">
                <p>{h.name}</p>
                <p className="data text-small text-text-dim">
                  {h.window === 'morning' || h.window === 'evening' ? h.window : 'needs a window'} · w
                  {h.weight}
                  {h.type === 'numeric' ? ` · ${h.target}${h.unit ? ` ${h.unit}` : ''}` : ''}
                  {h.core ? ' · core' : ''}
                  {h.targetTime ? ` · ${formatTime(h.targetTime)}` : ''}
                </p>
              </div>
              <button type="button" className="label text-text-dim hover:text-text" onClick={() => startEdit(h)}>
                Edit
              </button>
              <button
                type="button"
                className="label text-blood"
                onClick={() => {
                  setConfirmId(h.id);
                  setEditId(null);
                  setError('');
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {editId ? (
          <form
            className="mt-8 space-y-6 border-t border-line pt-8"
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              patch.mutate({ id: editId, body: habitPayload(editForm) });
            }}
          >
            <p className="label">Edit habit</p>
            <HabitFields form={editForm} setForm={setEditForm} />
            <div className="flex flex-wrap gap-4">
              <Button type="submit" disabled={patch.isPending}>
                {patch.isPending ? 'Saving.' : 'Save'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditId(null);
                  setError('');
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {confirmId ? (
          <div className="mt-8 border border-blood p-6">
            <p>This cannot be undone.</p>
            <div className="mt-4 flex gap-4">
              <Button variant="blood" onClick={() => remove.mutate(confirmId)} disabled={remove.isPending}>
                Delete
              </Button>
              <Button variant="secondary" onClick={() => setConfirmId(null)}>
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        <form
          className="mt-16 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            create.mutate();
          }}
        >
          <p className="label">New habit</p>
          <HabitFields form={form} setForm={setForm} />
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Saving.' : 'Continue'}
          </Button>
        </form>
      </div>
    </Shell>
  );
}
