// A ritual day runs from waking to lights out: the `morning` window opens it, the `evening`
// window closes it. Inside a window, empty target times come first (the workout happens right
// after waking), then the clock, then the stored order.
const WINDOW_ORDER = { morning: 0, evening: 1 };

export function sortHabits(habits) {
  return [...habits].sort((a, b) => {
    const wa = WINDOW_ORDER[a.window] ?? 2;
    const wb = WINDOW_ORDER[b.window] ?? 2;
    if (wa !== wb) return wa - wb;
    const at = a.targetTime || '';
    const bt = b.targetTime || '';
    if (!at && bt) return -1;
    if (at && !bt) return 1;
    if (at !== bt) return at < bt ? -1 : 1;
    return (a.order || 0) - (b.order || 0);
  });
}
