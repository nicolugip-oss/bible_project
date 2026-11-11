import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bibleServerUrl, dayNumber, entryFor, flattenPlan, icfSearchUrl, readingMinutes } from '../js/lib/plan.js';

const plan = JSON.parse(await readFile(new URL('../data/plan.json', import.meta.url), 'utf8'));
const days = flattenPlan(plan);

test('der Plan hat 13 Wochen zu je 7 Tagen', () => {
  assert.equal(plan.weeks.length, 13);
  assert.equal(days.length, 91);
  assert.equal(days[7].weekIndex, 1);
  assert.equal(days[7].dayInWeek, 0);
});

test('dayNumber beginnt am Starttag bei 0 und wird nie negativ', () => {
  assert.equal(dayNumber('2026-11-11', '2026-11-11'), 0);
  assert.equal(dayNumber('2026-11-11', '2026-11-18'), 7);
  assert.equal(dayNumber('2026-11-11', '2026-11-01'), 0);
});

test('entryFor beginnt nach dem letzten Tag von vorn', () => {
  assert.equal(entryFor(days, 0).day.id, 'geliebt-1');
  assert.equal(entryFor(days, 90).day.id, 'hoffnung-7');
  const again = entryFor(days, 91);
  assert.equal(again.day.id, 'geliebt-1');
  assert.equal(again.cycle, 1);
});

test('jeder Tag hat Text und Lernvers in allen Übersetzungen', async () => {
  for (const slug of Object.keys(plan.translations)) {
    const text = JSON.parse(await readFile(new URL(`../data/text-${slug}.json`, import.meta.url), 'utf8'));
    for (const day of days) {
      assert.ok(text.passages[day.id]?.length > 0, `${slug}: Text für ${day.id} fehlt`);
      assert.ok(text.verses[day.id]?.length > 10, `${slug}: Lernvers für ${day.id} fehlt`);
      assert.match(text.verses[day.id], /^\p{Lu}.*[.!?]$/u, `${slug}: Lernvers ${day.id} ist kein ganzer Satz`);
      assert.ok(plan.books[day.book], `Buch-Einführung für ${day.book} fehlt`);
    }
  }
});

test('Lernverse sind eindeutig', () => {
  const keys = days.map((d) => d.verse.key);
  assert.equal(new Set(keys).size, keys.length);
});

test('bibleServerUrl', () => {
  assert.equal(bibleServerUrl('1. Johannes 4,7-19', 'HFA'), 'https://www.bibleserver.com/HFA/1.Johannes4%2C7-19');
  assert.equal(bibleServerUrl('Psalm 23', 'NGÜ'), 'https://www.bibleserver.com/NG%C3%9C/Psalm23');
});

test('icfSearchUrl', () => {
  assert.equal(icfSearchUrl('Gebet'), 'https://www.youtube.com/results?search_query=ICF%20Z%C3%BCrich%20Gebet');
});

test('readingMinutes', () => {
  assert.equal(readingMinutes([[1, 'eins zwei drei']]), 1);
  assert.equal(readingMinutes([[1, Array(450).fill('wort').join(' ')]]), 3);
});
