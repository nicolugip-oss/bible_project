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

// Vorübergehende Diagnose: Wie verhält sich bible.com bei Versbereichen?
for (const url of [
  'https://www.bible.com/bible/73/1JN.4.7-19.HFA',
  'https://www.bible.com/bible/73/1JN.4.7.HFA',
  'https://www.bible.com/bible/73/1JN.4.HFA',
  'https://www.bible.com/bible/73/PSA.23.1-4.HFA',
  'https://www.bible.com/bible/73/JHN.3.16-17.HFA',
  'https://www.bible.com/de/bible/73/JHN.3.16-17.HFA',
  'https://www.bible.com/bible/111/JHN.3.16-17.NIV',
]) {
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  const html = await res.text();
  const pick = (re) => (re.exec(html)?.[1] || '').slice(0, 90);
  console.log(`DIAG ${res.status} ${url} -> ${res.url}`);
  console.log(`  bytes=${html.length} usfm=${(html.match(/data-usfm="/g) || []).length} canonical=${pick(/<link rel="canonical" href="([^"]+)"/)} og=${pick(/property="og:title" content="([^"]+)"/)} h1=${pick(/<h1[^>]*>([^<]*)</)} notfound=${/404|nicht gefunden|not found/i.test(html)}`);
}

console.log(failed ? `${failed} Links nicht erreichbar.` : 'Alle geprüften Links erreichbar.');
process.exit(failed ? 1 : 0);
