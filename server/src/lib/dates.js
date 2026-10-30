const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(value) {
  return DATE_RE.test(value);
}

export function dateInTz(date = new Date(), tz = 'Asia/Dhaka') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function partsInTz(date = new Date(), tz = 'Asia/Dhaka') {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    date: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const yyyy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function compareDates(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function datesBetween(from, to) {
  const out = [];
  let cur = from;
  while (compareDates(cur, to) <= 0) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Morning report for ritual day D is due on D+1. Auto-close at 12:00 noon on D+1. */
export function isOverdueForAutoClose(ritualDate, now = new Date(), tz = 'Asia/Dhaka') {
  const nowParts = partsInTz(now, tz);
  const closeAfter = addDays(ritualDate, 1);
  if (compareDates(nowParts.date, closeAfter) > 0) return true;
  if (nowParts.date === closeAfter && nowParts.hour >= 12) return true;
  return false;
}

export function minutesBetweenTimes(fromHHMM, toHHMM) {
  const [fh, fm] = fromHHMM.split(':').map(Number);
  const [th, tm] = toHHMM.split(':').map(Number);
  const from = fh * 60 + fm;
  let to = th * 60 + tm;
  if (to <= from) to += 24 * 60;
  return to - from;
}

export function sleepHours(lightsOut, wake) {
  if (!lightsOut || !wake) return null;
  return minutesBetweenTimes(lightsOut, wake) / 60;
}
