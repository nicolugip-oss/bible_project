#!/usr/bin/env node
// Baut die App-Daten aus den Inhalten in content/ und gemeinfreien Bibeltexten.
//
//   node scripts/build-data.mjs            -> schreibt data/plan.json und data/text-*.json
//   node scripts/build-data.mjs --review   -> zeigt zusätzlich alle Lernverse und Stellengrenzen
//
// Die Bibeltexte (Lutherbibel 1912, Elberfelder 1905, beide gemeinfrei) werden einmalig
// aus dem offenen Datensatz github.com/midvash/bible-data geladen und in .cache/ abgelegt.

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = process.env.BIBLE_CACHE || join(ROOT, '.cache', 'bibles');
const SOURCE_BASE = 'https://raw.githubusercontent.com/midvash/bible-data/main/versions/de';

export const TRANSLATIONS = {
  luth1912: { name: 'Lutherbibel 1912', short: 'Luther 1912' },
  elb1905: { name: 'Elberfelder 1905', short: 'Elberfelder 1905' },
};

const DAY_FIELDS = ['ref', 'src', 'title', 'background', 'context', 'insight', 'action', 'prayer'];

// Offensichtliche Tippfehler der Digitalisate (Stellenangabe in der Zählung der Quelle).
// Jeder Eintrag muss greifen, sonst bricht der Build ab – so bleibt die Liste ehrlich.
const SOURCE_FIXES = {
  luth1912: {
    'Ps 1:1': [['auf den Weg Sünder', 'auf den Weg der Sünder']],
    'Ps 8:4': [['daß du sich seiner annimmst', 'daß du dich seiner annimmst']],
    'Ps 119:105': [['meine Fußes Leuchte', 'meines Fußes Leuchte']],
    'Prov 2:4': [['froschest', 'forschest']],
    'Lam 3:25': [['der auf sie harrt', 'der auf ihn harrt']],
    'Matt 5:13': [['denn das man es', 'denn daß man es']],
    'Luke 23:34': [['vergib ihnen sie wissen', 'vergib ihnen; sie wissen']],
    'Luke 23:37': [['so helf dir', 'so hilf dir']],
    'Luke 23:38': [['und lateinische und', 'und lateinischen und']],
    'John 8:12': [['sondern wir das Licht', 'sondern wird das Licht']],
    'John 15:2': [['Eine jeglich Rebe', 'Eine jegliche Rebe']],
    '1Cor 13:1': [['Menschen-und', 'Menschen- und']],
    'Jas 2:14': [['Was hilfst,', "Was hilft's,"]],
    '1Pet 1:8': [['wie wohl ihr ihn', 'wiewohl ihr ihn']],
    '1Pet 2:5': [['zum geistlichem Hause', 'zum geistlichen Hause']],
  },
  elb1905: {
    'Gal 5:22': [['Friede Langmut', 'Friede, Langmut']],
  },
};

// ---------- Quellen laden ----------

async function loadBible(slug) {
  const file = join(CACHE, `${slug}.json`);
  if (!existsSync(file)) {
    const url = `${SOURCE_BASE}/${slug}/${slug}.json`;
    console.log(`Lade ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Download fehlgeschlagen (${res.status}): ${url}`);
    await mkdir(CACHE, { recursive: true });
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  const raw = JSON.parse(await readFile(file, 'utf8'));
  const index = {};
  for (const book of raw.books) {
    index[book.book] = {};
    for (const ch of book.chapters) {
      index[book.book][ch.chapter] = new Map(ch.verses.map((v) => [v.number, v.text]));
    }
  }
  for (const [ref, fixes] of Object.entries(SOURCE_FIXES[slug] || {})) {
    const { book, chapter, from } = parseSrc(ref);
    let text = index[book]?.[chapter]?.get(from);
    for (const [wrong, right] of fixes) {
      if (!text?.includes(wrong)) throw new Error(`Korrektur greift nicht (${slug}, ${ref}): "${wrong}"`);
      text = text.replace(wrong, right);
    }
    index[book][chapter].set(from, text);
  }
  return index;
}

// ---------- Stellenangaben ----------

/** "1John 4:7-19" | "Ps 23" -> { book, chapter, from, to } (to = Infinity für ganzes Kapitel) */
export function parseSrc(src) {
  const m = /^(\S+) (\d+)(?::(\d+)(?:-(\d+))?)?$/.exec(src.trim());
  if (!m) throw new Error(`Ungültige Stellenangabe: "${src}"`);
  const [, book, chapter, from, to] = m;
  return {
    book,
    chapter: Number(chapter),
    from: from ? Number(from) : 1,
    to: to ? Number(to) : from ? Number(from) : Infinity,
  };
}

function versesOf(bible, src) {
  const { book, chapter, from, to } = parseSrc(src);
  const ch = bible[book]?.[chapter];
  if (!ch) throw new Error(`Kapitel nicht gefunden: ${src}`);
  const last = to === Infinity ? Math.max(...ch.keys()) : to;
  const out = [];
  for (let n = from; n <= last; n++) {
    if (!ch.has(n)) throw new Error(`Vers nicht gefunden: ${book} ${chapter}:${n} (${src})`);
    out.push([n, ch.get(n)]);
  }
  return out;
}

// ---------- Textbereinigung ----------

/** Entfernt Artefakte der Digitalisate, ohne den Wortlaut zu verändern. */
export function cleanText(text) {
  return text
    .replace(/\[\d+:\d+\]\s*/g, '') // abweichende Verszählung, z. B. "[4:1]"
    .replace(/[[\]]/g, '') // textkritische Klammern, Inhalt bleibt
    .replace(/\s+-\s*$/, '') // Absatzmarke am Versende
    .replace(/“/g, '«')
    .replace(/”/g, '»')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Entfernt Klammern und Anführungszeichen, deren Gegenstück ausserhalb des Ausschnitts liegt. */
export function dropUnbalanced(text) {
  for (const [open, close] of [['(', ')'], ['«', '»']]) {
    let depth = 0;
    let out = '';
    for (const ch of text) {
      if (ch === open) depth++;
      else if (ch === close) {
        if (depth === 0) continue;
        depth--;
      }
      out += ch;
    }
    // Unpaarig geöffnete Zeichen von hinten entfernen
    while (depth > 0) {
      const i = out.lastIndexOf(open);
      out = out.slice(0, i) + out.slice(i + 1);
      depth--;
    }
    text = out;
  }
  return text.replace(/\s+([.,;:!?])/g, '$1').replace(/\s+/g, ' ').trim();
}

/** Macht aus einem Versausschnitt einen eigenständigen Satz zum Auswendiglernen. */
export function polishVerse(text) {
  let t = dropUnbalanced(text).replace(/[\s,;:–-]+$/, '');
  if (!/[.!?]$/.test(t)) t += '.';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function applyTrim(text, trim, label) {
  if (!trim) return text;
  if (trim.from) {
    const i = text.indexOf(trim.from);
    if (i < 0) throw new Error(`trim.from nicht gefunden (${label}): "${trim.from}"`);
    text = text.slice(i);
  }
  if (trim.to) {
    const i = text.indexOf(trim.to);
    if (i < 0) throw new Error(`trim.to nicht gefunden (${label}): "${trim.to}"`);
    text = text.slice(0, i + trim.to.length);
  }
  return text;
}

/** Markiert Abschnitte, die mitten im Satz beginnen oder enden, mit Auslassungspunkten. */
export function markEdges(verses) {
  if (!verses.length) return verses;
  const out = verses.map((v) => [...v]);
  const first = out[0];
  if (/^[a-zäöü]/.test(first[1])) first[1] = `… ${first[1]}`;
  const last = out[out.length - 1];
  if (/[,;:]$/.test(last[1])) last[1] = `${last[1].slice(0, -1)} …`;
  return out;
}

// ---------- Inhalte ----------

async function loadContent() {
  const dir = join(ROOT, 'content', 'weeks');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  const weeks = [];
  for (const f of files) weeks.push(JSON.parse(await readFile(join(dir, f), 'utf8')));
  const books = JSON.parse(await readFile(join(ROOT, 'content', 'books.json'), 'utf8'));
  return { weeks, books };
}

function validate(weeks, books) {
  const problems = [];
  const weekIds = new Set();
  const verseKeys = new Set();
  for (const week of weeks) {
    const w = `Woche "${week.id}"`;
    for (const f of ['id', 'title', 'theme', 'intro', 'icf']) if (!week[f]) problems.push(`${w}: Feld ${f} fehlt`);
    if (weekIds.has(week.id)) problems.push(`${w}: id doppelt`);
    weekIds.add(week.id);
    if (week.days?.length !== 7) problems.push(`${w}: braucht genau 7 Tage`);
    week.days?.forEach((day, i) => {
      const d = `${w}, Tag ${i + 1}`;
      for (const f of DAY_FIELDS) if (!day[f]) problems.push(`${d}: Feld ${f} fehlt`);
      if (!Array.isArray(day.questions) || day.questions.length < 2) problems.push(`${d}: mindestens 2 Fragen`);
      if (!day.verse?.ref || !day.verse?.src) problems.push(`${d}: Lernvers unvollständig`);
      else if (verseKeys.has(day.verse.src)) problems.push(`${d}: Lernvers ${day.verse.src} doppelt`);
      else verseKeys.add(day.verse.src);
      try {
        const { book } = parseSrc(day.src);
        if (!books[book]) problems.push(`${d}: Buch-Einführung für ${book} fehlt in content/books.json`);
      } catch (e) {
        problems.push(`${d}: ${e.message}`);
      }
    });
  }
  if (problems.length) throw new Error(`Inhalte fehlerhaft:\n- ${problems.join('\n- ')}`);
}

// ---------- Build ----------

async function main() {
  const review = process.argv.includes('--review');
  const { weeks, books } = await loadContent();
  validate(weeks, books);

  const bibles = {};
  for (const slug of Object.keys(TRANSLATIONS)) bibles[slug] = await loadBible(slug);

  const texts = Object.fromEntries(Object.keys(TRANSLATIONS).map((s) => [s, { passages: {}, verses: {} }]));
  const usedBooks = {};
  const plan = { version: 1, translations: TRANSLATIONS, books: usedBooks, weeks: [] };

  for (const week of weeks) {
    const outWeek = { id: week.id, title: week.title, theme: week.theme, intro: week.intro, icf: week.icf, days: [] };
    week.days.forEach((day, i) => {
      const id = `${week.id}-${i + 1}`;
      const { book } = parseSrc(day.src);
      usedBooks[book] = books[book];
      const shift = day.shift || 0;

      for (const slug of Object.keys(TRANSLATIONS)) {
        const label = `${id}/${slug}`;
        const passage = versesOf(bibles[slug], day.src).map(([n, t]) => [n + shift, cleanText(t)]);
        // Klammern/Anführungszeichen über den ganzen Abschnitt hinweg ausbalancieren
        const SEP = '\u0001';
        const balanced = dropUnbalanced(passage.map(([, t]) => t).join(SEP)).split(SEP);
        texts[slug].passages[id] = markEdges(passage.map(([n], k) => [n, balanced[k].trim()]));

        let verse = versesOf(bibles[slug], day.verse.src).map(([, t]) => cleanText(t)).join(' ');
        verse = applyTrim(verse, day.verse.trim?.[slug], label);
        texts[slug].verses[id] = polishVerse(verse);
      }

      outWeek.days.push({
        id,
        ref: day.ref,
        book,
        title: day.title,
        background: day.background,
        context: day.context,
        insight: day.insight,
        questions: day.questions,
        action: day.action,
        prayer: day.prayer,
        verse: { ref: day.verse.ref, key: day.verse.src },
      });
    });
    plan.weeks.push(outWeek);
  }

  await mkdir(join(ROOT, 'data'), { recursive: true });
  await writeFile(join(ROOT, 'data', 'plan.json'), JSON.stringify(plan) + '\n');
  for (const slug of Object.keys(TRANSLATIONS)) {
    await writeFile(join(ROOT, 'data', `text-${slug}.json`), JSON.stringify(texts[slug]) + '\n');
  }

  const days = plan.weeks.reduce((n, w) => n + w.days.length, 0);
  console.log(`OK: ${plan.weeks.length} Wochen, ${days} Tage, ${Object.keys(usedBooks).length} Bücher.`);

  if (review) {
    for (const week of plan.weeks) {
      for (const day of week.days) {
        console.log(`\n== ${day.id} | ${day.ref} | Lernvers ${day.verse.ref}`);
        for (const slug of Object.keys(TRANSLATIONS)) {
          const p = texts[slug].passages[day.id];
          console.log(`  [${slug}] ${p.length} Verse (${p[0][0]}–${p.at(-1)[0]})`);
          console.log(`     Anfang: ${p[0][1].slice(0, 110)}`);
          console.log(`     Ende:   …${p.at(-1)[1].slice(-110)}`);
          console.log(`     Vers:   ${texts[slug].verses[day.id]}`);
        }
      }
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
