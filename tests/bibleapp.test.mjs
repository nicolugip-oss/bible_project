import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BIBLE_APP, bibleAppUrl, cleanPastedVerse, parseRef } from '../js/lib/bibleapp.js';
import { flattenPlan } from '../js/lib/plan.js';

test('parseRef liest Kapitel und Verse aus der deutschen Stellenangabe', () => {
  assert.deepEqual(parseRef('1. Johannes 4,7-19'), { chapter: 4, from: 7, to: 19 });
  assert.deepEqual(parseRef('Johannes 3,16'), { chapter: 3, from: 16, to: 16 });
  assert.deepEqual(parseRef('Psalm 23'), { chapter: 23 });
  assert.deepEqual(parseRef('1. Korinther 13'), { chapter: 13 });
  assert.equal(parseRef('Ohne Zahl'), null);
});

test('bibleAppUrl öffnet die Stelle in der Hoffnung für alle', () => {
  assert.equal(BIBLE_APP.abbr, 'HFA');
  assert.equal(bibleAppUrl('John', 'Johannes 3,16'), 'https://www.bible.com/bible/73/JHN.3.16.HFA');
  assert.equal(bibleAppUrl('1John', '1. Johannes 4,7-19'), 'https://www.bible.com/bible/73/1JN.4.7-19.HFA');
  assert.equal(bibleAppUrl('Ps', 'Psalm 23'), 'https://www.bible.com/bible/73/PSA.23.HFA');
  assert.equal(bibleAppUrl('Ps', 'Psalm 46,2'), 'https://www.bible.com/bible/73/PSA.46.2.HFA');
  assert.equal(bibleAppUrl('Unbekannt', 'Buch 1,1'), null);
});

test('jede Bibelstelle und jeder Lernvers des Plans hat einen Link in die Bibel App', async () => {
  const plan = JSON.parse(await readFile(new URL('../data/plan.json', import.meta.url), 'utf8'));
  for (const day of flattenPlan(plan)) {
    assert.match(bibleAppUrl(day.book, day.ref) || '', /^https:\/\/www\.bible\.com\/bible\/73\/[1-3A-Z]{3}\.\d+(\.\d+(-\d+)?)?\.HFA$/, day.ref);
    const verseBook = day.verse.key.split(' ')[0];
    assert.match(bibleAppUrl(verseBook, day.verse.ref) || '', /^https:\/\/www\.bible\.com\/bible\/73\/[1-3A-Z]{3}\.\d+\.\d+(-\d+)?\.HFA$/, day.verse.ref);
  }
});

test('cleanPastedVerse entfernt Stellenangabe, Link und Anführungszeichen', () => {
  const plain = 'Das ist der Wortlaut eines Verses, der hier nur als Beispiel dient.';
  assert.equal(cleanPastedVerse(`„${plain}“\nJohannes 3:16 HFA\n\nhttps://bible.com/bible/73/jhn.3.16.HFA`), plain);
  assert.equal(cleanPastedVerse(`Johannes 3:16 HFA\n${plain}\nhttps://www.bible.com/bible/73/JHN.3.16`), plain);
  assert.equal(cleanPastedVerse(`${plain} (Johannes 3,16)`), plain);
  assert.equal(cleanPastedVerse(`16 ${plain}`), plain);
  assert.equal(cleanPastedVerse(`  ${plain}  `), plain);
  assert.equal(cleanPastedVerse(`«${plain}»\n1. Johannes 4,19`), plain);
});

test('cleanPastedVerse lässt den Verstext selbst unangetastet', () => {
  const quoted = 'Er sagte: „Kommt her zu mir!“ Und sie kamen.';
  assert.equal(cleanPastedVerse(quoted), quoted);
  const twoLines = 'Erste Zeile des Verses,\nzweite Zeile des Verses.';
  assert.equal(cleanPastedVerse(twoLines), 'Erste Zeile des Verses, zweite Zeile des Verses.');
  const numbers = 'Er blieb 40 Tage dort.';
  assert.equal(cleanPastedVerse(numbers), numbers);
  assert.equal(cleanPastedVerse(''), '');
  assert.equal(cleanPastedVerse(null), '');
});
