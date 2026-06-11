export function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateFromString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number): string {
  const d = dateFromString(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const msA = Date.UTC(ay, am - 1, ad);
  const msB = Date.UTC(by, bm - 1, bd);
  return Math.round((msB - msA) / 86400000);
}

export function getMonthDays(year: number, month: number): string[] {
  const days: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

// "2026-06-11" → "6/11/26"
export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return `${m}/${d}/${String(y).slice(-2)}`;
}

// "2026-06-11" → "6/11"
export function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return `${m}/${d}`;
}

export function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-US', { month: 'long' });
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayString();
}

// "2026-05-22" → "5/22/26"
export function formatCompactDate(dateStr: string): string {
  return formatDisplayDate(dateStr);
}

// "09:00" → "9:00 AM",  "13:30" → "1:30 PM"
export function formatTime12h(time: string): string {
  const [h, min] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(min).padStart(2, '0')} ${period}`;
}

export function getWeekStart(dateStr: string): string {
  const d = dateFromString(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatDate(d);
}
