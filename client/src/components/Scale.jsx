export default function Scale({ label, value, onChange }) {
  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="data text-small text-text-dim">{value || '—'}</span>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className="seg min-h-12"
            data-on={value >= n ? 'true' : 'false'}
            onClick={() => onChange(n)}
            aria-label={`${label} ${n}`}
          />
        ))}
      </div>
    </div>
  );
}
