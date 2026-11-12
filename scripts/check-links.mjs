#!/usr/bin/env node
// Prüft stichprobenartig, ob die Links in die Bibel App an der richtigen Stelle landen
// und ob die verlinkten Seiten von ICF Zürich erreichbar sind.
//
//   node scripts/check-links.mjs
//
// Gedacht für den Ablauf «Links prüfen» auf GitHub (von Hand gestartet), nicht für den Alltag.

import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bibleAppUrl } from '../js/lib/bibleapp.js';
import { flattenPlan } from '../js/lib/plan.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HEADERS = {
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'accept-language': 'de-CH,de;q=0.9',
};

// Stellen, bei denen die Verszählung oder die Form des Links am ehesten danebenliegen könnte
const SAMPLE = [
  'geliebt-1', 'geliebt-5', 'gebet-1', 'gebet-4', 'gebet-5', 'vertrauen-2', 'vertrauen-5',
  'gnade-2', 'gnade-5', 'anbetung-1', 'anbetung-4', 'anbetung-5', 'heiliger-geist-2', 'hoffnung-4',
];

async function check(label, url) {
  try {
    const res = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
    const html = await res.text();
    const title = (/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 110);
    console.log(`${res.status} | ${label} | ${url}${res.url !== url ? ` -> ${res.url}` : ''} | ${title}`);
    return res.ok;
  } catch (err) {
    console.log(`FEHLER | ${label} | ${url} | ${err.message}`);
    return false;
  }
}

const plan = JSON.parse(await readFile(join(ROOT, 'data', 'plan.json'), 'utf8'));
const icf = JSON.parse(await readFile(join(ROOT, 'content', 'icf.json'), 'utf8'));
const days = flattenPlan(plan);
let failed = 0;

for (const id of SAMPLE) {
  const day = days.find((d) => d.id === id);
  if (!(await check(day.ref, bibleAppUrl(day.book, day.ref)))) failed++;
  if (!(await check(day.verse.ref, bibleAppUrl(day.verse.key.split(' ')[0], day.verse.ref)))) failed++;
  await new Promise((resolve) => setTimeout(resolve, 400));
}
for (const link of icf.links) {
  if (!(await check(link.label, link.url))) failed++;
}

console.log(failed ? `${failed} Links nicht erreichbar.` : 'Alle geprüften Links erreichbar.');
process.exit(failed ? 1 : 0);
