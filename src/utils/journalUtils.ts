export function computeJournalStreak(entries: { entryDate: string }[]): number {
  const dates = new Set(entries.map(e => e.entryDate));
  let streak = 0;
  const d = new Date();
  for (;;) {
    const iso = d.toISOString();
    const dateStr = `${iso.slice(0, 4)}-${iso.slice(5, 7)}-${iso.slice(8, 10)}`;
    if (!dates.has(dateStr)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
