// Leseplan: Zuordnung von Kalendertagen zu Planinhalten und Link-Erzeugung.

import { addDays, daysBetween } from './dates.js';

/** Macht aus den Wochen eine flache Tagesliste mit Wochenbezug. */
export function flattenPlan(plan) {
  const days = [];
  plan.weeks.forEach((week, w) => {
    week.days.forEach((day, d) => {
      days.push({ ...day, week, weekIndex: w, dayInWeek: d, index: days.length });
    });
  });
  return days;
}

/** Laufende Tagesnummer (0 = Starttag); vor dem Start ebenfalls 0. */
export function dayNumber(startISO, todayISOValue) {
  return Math.max(0, daysBetween(startISO, todayISOValue));
}

/** Inhalt für eine laufende Tagesnummer; nach dem letzten Tag beginnt der Plan von vorn. */
export function entryFor(days, n) {
  const len = days.length;
  const index = ((n % len) + len) % len;
  return { day: days[index], index, cycle: Math.floor(n / len) };
}

export function dateFor(startISO, n) {
  return addDays(startISO, n);
}

/** YouTube-Suche nach Beiträgen von ICF Zürich zu einem Thema. */
export function icfSearchUrl(topic) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`ICF Zürich ${topic}`)}`;
}

/** Grobe Lesezeit in Minuten bei ruhigem Lesetempo. */
export function readingMinutes(verses) {
  const words = verses.reduce((n, [, text]) => n + text.split(/\s+/).length, 0);
  return Math.max(1, Math.round(words / 150));
}
