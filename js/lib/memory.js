// Auswendiglernen: Lückentext, Tipp-Prüfung und Wiederholungsplan (Karteikasten-Prinzip).

import { addDays } from './dates.js';

// ---------- Text in Wörter zerlegen ----------

const TOKEN = /[\p{L}\p{N}'’]+|[^\p{L}\p{N}'’]+/gu;

/** Zerlegt einen Vers in Wort- und Zwischenraum-Teile. */
export function tokenize(text) {
  const tokens = [];
  let wordIndex = 0;
  for (const part of text.match(TOKEN) || []) {
    const isWord = /[\p{L}\p{N}]/u.test(part);
    tokens.push(isWord ? { word: true, text: part, index: wordIndex++ } : { word: false, text: part });
  }
  return tokens;
}

export function wordCount(text) {
  return tokenize(text).filter((t) => t.word).length;
}

// ---------- Lückentext ----------

/** Kleiner, reproduzierbarer Zufallsgenerator (mulberry32). */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Wählt reproduzierbar aus, welche Wörter verdeckt werden (ratio 0…1). */
export function hiddenWords(count, ratio, seed = 1) {
  const target = Math.min(count, Math.max(0, Math.round(count * ratio)));
  const order = Array.from({ length: count }, (_, i) => i);
  const random = rng(seed);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return new Set(order.slice(0, target));
}

/** "Hirte" -> "H…" */
export function firstLetter(word) {
  return word.length <= 1 ? word : `${word[0]}…`;
}

// ---------- Getippten Vers prüfen ----------

/** Vergleichsform: Gross-/Kleinschreibung, ß/ss und Satzzeichen spielen keine Rolle. */
export function normalizeWord(word) {
  return word.toLowerCase().replace(/ß/g, 'ss').replace(/[’']/g, '');
}

function wordsOf(text) {
  return tokenize(text).filter((t) => t.word).map((t) => t.text);
}

/**
 * Vergleicht eine Eingabe mit dem Vers (längste gemeinsame Wortfolge).
 * Liefert je Verswort, ob es getroffen wurde, sowie die Trefferquote.
 */
export function compareTyped(target, typed) {
  const a = wordsOf(target);
  const b = wordsOf(typed);
  const an = a.map(normalizeWord);
  const bn = b.map(normalizeWord);
  const lcs = Array.from({ length: an.length + 1 }, () => new Uint16Array(bn.length + 1));
  for (let i = an.length - 1; i >= 0; i--) {
    for (let j = bn.length - 1; j >= 0; j--) {
      lcs[i][j] = an[i] === bn[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const hits = new Array(a.length).fill(false);
  let i = 0;
  let j = 0;
  while (i < an.length && j < bn.length) {
    if (an[i] === bn[j]) {
      hits[i] = true;
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  const correct = hits.filter(Boolean).length;
  return {
    words: a.map((text, k) => ({ text, hit: hits[k] })),
    correct,
    total: a.length,
    extra: b.length - correct,
    score: a.length ? correct / a.length : 0,
  };
}

// ---------- Wiederholungsplan ----------

/** Abstand in Tagen bis zur nächsten Wiederholung, je Stufe. */
export const INTERVALS = [1, 2, 4, 7, 14, 30, 60, 120];
export const SOLID_BOX = 3;

/**
 * Verarbeitet eine Selbsteinschätzung.
 * rating: 'good' (sitzt) | 'ok' (fast) | 'again' (noch nicht)
 */
export function rate(state, rating, today) {
  const prev = state || { box: 0, reps: 0 };
  let box = prev.box;
  let gap = 1;
  if (rating === 'good') {
    box = Math.min(box + 1, INTERVALS.length);
    gap = INTERVALS[box - 1];
  } else if (rating === 'again') {
    box = Math.max(0, box - 2);
  }
  return { box, reps: prev.reps + 1, last: today, due: addDays(today, gap) };
}

/** 'new' | 'learning' | 'solid' */
export function status(state) {
  if (!state) return 'new';
  return state.box >= SOLID_BOX ? 'solid' : 'learning';
}

export function isDue(state, today) {
  return Boolean(state) && state.due <= today;
}
