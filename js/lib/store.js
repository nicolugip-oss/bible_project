// Persönlicher Stand (Fortschritt, Notizen, Einstellungen) im Speicher des Browsers.

import { isISODate } from './dates.js';

const KEY = 'manna:v1';

export function defaults(today) {
  return {
    v: 1,
    start: today,
    translation: 'luth1912',
    showText: false, // Bibeltext in der App aufgeklappt?
    done: {}, // laufende Tagesnummer -> Datum, an dem gelesen wurde
    active: {}, // Datum -> true, sobald an dem Tag gelesen oder geübt wurde
    notes: {}, // laufende Tagesnummer -> Text
    verses: {}, // Vers-Schlüssel -> Lernstand
    sermon: {}, // Kalenderwoche -> Predigtnotiz
    custom: {}, // Vers-Schlüssel -> selbst eingefügter Wortlaut (z. B. aus der Hoffnung für alle)
  };
}

/** Füllt fehlende oder beschädigte Felder auf, damit die App immer startet. */
export function sanitize(raw, today) {
  const base = defaults(today);
  if (!raw || typeof raw !== 'object') return base;
  const out = { ...base };
  if (isISODate(raw.start)) out.start = raw.start;
  if (typeof raw.translation === 'string') out.translation = raw.translation;
  if (typeof raw.showText === 'boolean') out.showText = raw.showText;
  for (const key of ['done', 'active', 'notes', 'verses', 'sermon', 'custom']) {
    if (raw[key] && typeof raw[key] === 'object' && !Array.isArray(raw[key])) out[key] = raw[key];
  }
  out.custom = Object.fromEntries(Object.entries(out.custom).filter(([, text]) => typeof text === 'string' && text.trim()));
  return out;
}

function storage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function load(today) {
  try {
    const text = storage()?.getItem(KEY);
    return sanitize(text ? JSON.parse(text) : null, today);
  } catch {
    return defaults(today);
  }
}

/** Speichert den Stand; gibt false zurück, wenn der Browser das Speichern verweigert. */
export function save(state) {
  try {
    const s = storage();
    if (!s) return false;
    s.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Sicherung als Text – zum Kopieren auf ein anderes Gerät. */
export function exportText(state) {
  return JSON.stringify(state);
}

export function importText(text, today) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || parsed.v !== 1) throw new Error('Keine gültige Sicherung');
  return sanitize(parsed, today);
}
