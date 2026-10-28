/** Dates are stored as local YYYY-MM-DD strings. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISODate(new Date());
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

export function fmt(s: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  return parseDate(s).toLocaleDateString("en-PH", opts);
}

/** "T-14" style label relative to an event date. */
export function tMinus(date: string, eventDate: string): string {
  const n = daysBetween(eventDate, date);
  if (n === 0) return "T-0";
  return n < 0 ? `T${n}` : `T+${n}`;
}

export function relative(s: string, base = today()): string {
  const n = daysBetween(base, s);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
