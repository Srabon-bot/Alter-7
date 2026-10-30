const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Ritual day `YYYY-MM-DD` -> `Fri 30 Oct`. Never shifts with the machine timezone. */
export function formatDay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = String(dateStr).split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const utc = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[utc.getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

/** Stored `HH:MM` (24h) -> `9:00 PM`. */
export function formatTime(value) {
  if (!value) return '';
  const [h, m] = String(value).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}
