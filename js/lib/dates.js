// Datumshelfer. Gerechnet wird mit lokalen Kalendertagen im Format JJJJ-MM-TT.

const DAY_MS = 86_400_000;

export function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayISO(now = new Date()) {
  return toISO(now);
}

/** ISO-Datum -> UTC-Mitternacht, damit Sommerzeitwechsel keine Tage verschieben. */
function toUTC(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const t = toUTC(value);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === value;
}

export function daysBetween(fromISO, toISOValue) {
  return Math.round((toUTC(toISOValue) - toUTC(fromISO)) / DAY_MS);
}

export function addDays(iso, days) {
  return new Date(toUTC(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** ISO-Kalenderwoche, z. B. "2026-W46". */
export function isoWeek(iso) {
  const date = new Date(toUTC(iso));
  const weekday = (date.getUTCDay() + 6) % 7; // Montag = 0
  date.setUTCDate(date.getUTCDate() - weekday + 3); // Donnerstag dieser Woche bestimmt das Jahr
  const year = date.getUTCFullYear();
  const jan4 = Date.UTC(year, 0, 4); // liegt immer in Woche 1
  const jan4Weekday = (new Date(jan4).getUTCDay() + 6) % 7;
  const firstThursday = jan4 + (3 - jan4Weekday) * DAY_MS;
  const week = 1 + Math.round((date.getTime() - firstThursday) / (7 * DAY_MS));
  return `${year}-W${String(week).padStart(2, '0')}`;
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

export function formatLong(iso) {
  const d = new Date(toUTC(iso));
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}`;
}

export function formatShort(iso) {
  const d = new Date(toUTC(iso));
  return `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Anzahl aufeinanderfolgender aktiver Tage, die heute oder gestern enden. */
export function streak(activeDates, today) {
  const has = (iso) => Boolean(activeDates[iso]);
  let cursor = has(today) ? today : addDays(today, -1);
  let count = 0;
  while (has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}
