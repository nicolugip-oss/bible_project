import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, exportText, importText, sanitize } from '../js/lib/store.js';

test('sanitize repariert beschädigte Stände', () => {
  const s = sanitize({ start: 'kaputt', done: [1, 2], notes: { 3: 'x' }, translation: 'elb1905' }, '2026-11-11');
  assert.equal(s.start, '2026-11-11');
  assert.deepEqual(s.done, {});
  assert.deepEqual(s.notes, { 3: 'x' });
  assert.equal(s.translation, 'elb1905');
  assert.deepEqual(sanitize(null, '2026-11-11'), defaults('2026-11-11'));
});

test('Sicherung lässt sich wieder einlesen', () => {
  const state = { ...defaults('2026-11-01'), done: { 0: '2026-11-01' }, notes: { 0: 'Notiz «mit» Zeichen' } };
  assert.deepEqual(importText(exportText(state), '2026-11-11'), state);
  assert.throws(() => importText('{"foo":1}', '2026-11-11'));
  assert.throws(() => importText('kein json', '2026-11-11'));
});
