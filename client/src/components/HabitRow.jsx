export default function HabitRow({ habit, done, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!done)}
      className={`flex w-full min-h-12 items-center gap-4 border-b border-line px-0 py-4 text-left transition-opacity duration-500 ease-quiet ${
        done ? 'opacity-50' : 'opacity-100'
      }`}
    >
      <span className="flex-1 text-body">{habit.name}</span>
      {habit.targetTime ? (
        <span className="data text-small text-text-dim">{habit.targetTime}</span>
      ) : null}
      <span className="tick" data-on={done ? 'true' : 'false'} aria-hidden="true">
        {done ? '✓' : ''}
      </span>
      <span className="sr-only">{done ? 'done' : 'not done'}</span>
    </button>
  );
}
