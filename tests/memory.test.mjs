import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERVALS, compareTyped, firstLetter, hiddenWords, isDue, normalizeWord, rate, status, tokenize, wordCount,
} from '../js/lib/memory.js';

const VERSE = 'Der HERR ist mein Hirte; mir wird nichts mangeln.';

test('tokenize trennt Wörter und Satzzeichen und setzt sich verlustfrei zusammen', () => {
  const tokens = tokenize(VERSE);
  assert.equal(tokens.map((t) => t.text).join(''), VERSE);
  assert.equal(wordCount(VERSE), 9);
  assert.deepEqual(tokens.filter((t) => t.word).map((t) => t.index), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(wordCount("der wird's auch vollführen"), 4);
});

test('hiddenWords ist reproduzierbar und trifft die gewünschte Menge', () => {
  const a = hiddenWords(20, 0.5, 7);
  const b = hiddenWords(20, 0.5, 7);
  assert.deepEqual([...a].sort(), [...b].sort());
  assert.equal(a.size, 10);
  assert.equal(hiddenWords(20, 1, 3).size, 20);
  assert.equal(hiddenWords(20, 0, 3).size, 0);
  assert.notDeepEqual([...hiddenWords(20, 0.5, 8)].sort(), [...a].sort());
});

test('firstLetter', () => {
  assert.equal(firstLetter('Hirte'), 'H…');
  assert.equal(firstLetter('o'), 'o');
});

test('normalizeWord ignoriert Grossschreibung und ß', () => {
  assert.equal(normalizeWord('Daß'), 'dass');
  assert.equal(normalizeWord("wird's"), 'wirds');
});

test('compareTyped: richtige Eingabe trotz anderer Schreibweise', () => {
  const r = compareTyped('Verlaß dich auf den HERRN, daß es gelinge.', 'verlass dich auf den herrn dass es gelinge');
  assert.equal(r.score, 1);
  assert.equal(r.extra, 0);
});

test('compareTyped: fehlende und falsche Wörter werden markiert', () => {
  const r = compareTyped(VERSE, 'Der Herr ist mein Hirte mir wird nichts fehlen');
  assert.equal(r.correct, 8);
  assert.equal(r.total, 9);
  assert.equal(r.words.at(-1).hit, false);
  assert.equal(r.extra, 1);
  const half = compareTyped(VERSE, 'ist mein Hirte');
  assert.equal(half.correct, 3);
  assert.deepEqual(half.words.map((w) => w.hit), [false, false, true, true, true, false, false, false, false]);
});

test('compareTyped: leere Eingabe', () => {
  const r = compareTyped(VERSE, '   ');
  assert.equal(r.score, 0);
  assert.equal(r.extra, 0);
});

test('rate: «sitzt» verlängert den Abstand Stufe um Stufe', () => {
  let s = rate(undefined, 'good', '2026-11-11');
  assert.deepEqual(s, { box: 1, reps: 1, last: '2026-11-11', due: '2026-11-12' });
  s = rate(s, 'good', '2026-11-12');
  assert.equal(s.box, 2);
  assert.equal(s.due, '2026-11-14');
  s = rate(s, 'good', '2026-11-14');
  assert.equal(s.due, '2026-11-18');
  assert.equal(status(s), 'solid');
});

test('rate: «fast» hält die Stufe, «noch nicht» stuft zurück', () => {
  const base = { box: 4, reps: 5, last: '2026-11-01', due: '2026-11-11' };
  const ok = rate(base, 'ok', '2026-11-11');
  assert.equal(ok.box, 4);
  assert.equal(ok.due, '2026-11-12');
  const again = rate(base, 'again', '2026-11-11');
  assert.equal(again.box, 2);
  assert.equal(again.due, '2026-11-12');
  assert.equal(rate({ box: 1, reps: 1 }, 'again', '2026-11-11').box, 0);
});

test('rate: die höchste Stufe wird nicht überschritten', () => {
  let s;
  for (let i = 0; i < 20; i++) s = rate(s, 'good', '2026-11-11');
  assert.equal(s.box, INTERVALS.length);
  assert.equal(s.due, '2027-03-11');
});

test('status und isDue', () => {
  assert.equal(status(undefined), 'new');
  assert.equal(status({ box: 0 }), 'learning');
  assert.equal(isDue(undefined, '2026-11-11'), false);
  assert.equal(isDue({ due: '2026-11-11' }, '2026-11-11'), true);
  assert.equal(isDue({ due: '2026-11-12' }, '2026-11-11'), false);
});
