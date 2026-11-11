import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, dropUnbalanced, markEdges, parseSrc, polishVerse } from '../scripts/build-data.mjs';

test('parseSrc', () => {
  assert.deepEqual(parseSrc('1John 4:7-19'), { book: '1John', chapter: 4, from: 7, to: 19 });
  assert.deepEqual(parseSrc('John 3:16'), { book: 'John', chapter: 3, from: 16, to: 16 });
  assert.deepEqual(parseSrc('Ps 23'), { book: 'Ps', chapter: 23, from: 1, to: Infinity });
  assert.throws(() => parseSrc('Johannes 3,16'));
});

test('cleanText entfernt Artefakte der Digitalisate', () => {
  assert.equal(cleanText('[4:1] Denn siehe, in den Tagen'), 'Denn siehe, in den Tagen');
  assert.equal(cleanText('Gehet [nun] hin'), 'Gehet nun hin');
  assert.equal(cleanText('gerade machen deine Pfade. -'), 'gerade machen deine Pfade.');
  assert.equal(cleanText('sprach: “Komm!”'), 'sprach: «Komm!»');
});

test('dropUnbalanced entfernt verwaiste Klammern und Anführungszeichen', () => {
  assert.equal(dropUnbalanced('hin! Amen.)'), 'hin! Amen.');
  assert.equal(dropUnbalanced('Kräften.» Das ist'), 'Kräften. Das ist');
  assert.equal(dropUnbalanced('er sprach: «Folge mir'), 'er sprach: Folge mir');
  assert.equal(dropUnbalanced('(Sela.) und «so» bleibt es'), '(Sela.) und «so» bleibt es');
});

test('polishVerse macht einen ganzen Satz', () => {
  assert.equal(polishVerse('denn der HERR ist bei dir,'), 'Denn der HERR ist bei dir.');
  assert.equal(polishVerse('Fürchte dich nicht!'), 'Fürchte dich nicht!');
  assert.equal(polishVerse('die an seinen Namen glauben;'), 'Die an seinen Namen glauben.');
});

test('markEdges kennzeichnet angeschnittene Sätze', () => {
  assert.deepEqual(markEdges([[4, 'zu welchem ihr gekommen seid'], [5, 'und Verstand wird dich behüten,']]), [
    [4, '… zu welchem ihr gekommen seid'],
    [5, 'und Verstand wird dich behüten …'],
  ]);
  assert.deepEqual(markEdges([[1, 'Am Anfang.']]), [[1, 'Am Anfang.']]);
});
