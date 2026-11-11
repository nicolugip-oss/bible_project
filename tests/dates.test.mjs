import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, daysBetween, formatLong, isISODate, isoWeek, streak, toISO } from '../js/lib/dates.js';

test('toISO nutzt das lokale Kalenderdatum', () => {
  assert.equal(toISO(new Date(2026, 10, 11, 23, 59)), '2026-11-11');
  assert.equal(toISO(new Date(2026, 0, 5, 0, 1)), '2026-01-05');
});

test('daysBetween zählt über Sommerzeit- und Jahreswechsel hinweg', () => {
  assert.equal(daysBetween('2026-11-11', '2026-11-11'), 0);
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2); // Zeitumstellung
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
  assert.equal(daysBetween('2026-11-11', '2026-11-10'), -1);
});

test('addDays', () => {
  assert.equal(addDays('2026-11-11', 90), '2027-02-09');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
});

test('isISODate lehnt Unsinn ab', () => {
  assert.equal(isISODate('2026-11-11'), true);
  assert.equal(isISODate('2026-02-30'), false);
  assert.equal(isISODate('11.11.2026'), false);
  assert.equal(isISODate(null), false);
});

test('isoWeek folgt der ISO-Zählung', () => {
  assert.equal(isoWeek('2026-11-11'), '2026-W46');
  assert.equal(isoWeek('2026-01-01'), '2026-W01');
  assert.equal(isoWeek('2027-01-01'), '2026-W53'); // Freitag, gehört noch zu 2026
  assert.equal(isoWeek('2024-12-30'), '2025-W01');
  assert.equal(isoWeek('2026-11-15'), '2026-W46'); // Sonntag
  assert.equal(isoWeek('2026-11-16'), '2026-W47'); // Montag
});

test('formatLong', () => {
  assert.equal(formatLong('2026-11-11'), 'Mittwoch, 11. November');
});

test('streak zählt zusammenhängende Tage bis heute oder gestern', () => {
  const active = { '2026-11-09': true, '2026-11-10': true, '2026-11-11': true, '2026-11-06': true };
  assert.equal(streak(active, '2026-11-11'), 3);
  assert.equal(streak(active, '2026-11-12'), 3); // heute noch offen, Serie bleibt
  assert.equal(streak(active, '2026-11-13'), 0); // ein Tag ausgelassen
  assert.equal(streak({}, '2026-11-11'), 0);
});
