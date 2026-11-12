// Bereich «Lernvers»: Trainer zum Auswendiglernen und Wiederholen.

import { BIBLE_APP, bibleAppUrl, cleanPastedVerse } from '../lib/bibleapp.js';
import { extLink, h, icon } from '../lib/dom.js';
import { formatShort } from '../lib/dates.js';
import { INTERVALS, compareTyped, firstLetter, hiddenWords, isDue, rate, status, tokenize, wordCount } from '../lib/memory.js';


const MODES = [
  { id: 'read', label: 'Lesen', hint: 'Lies den Vers dreimal laut – langsam, Satzteil für Satzteil.' },
  { id: 'gaps', label: 'Lücken', hint: 'Sprich den Vers laut und fülle die Lücken aus dem Kopf. Tippe auf eine Lücke, um sie aufzudecken.' },
  { id: 'letters', label: 'Anfänge', hint: 'Nur die Anfangsbuchstaben bleiben stehen. Tippe auf ein Wort, wenn du hängen bleibst.' },
  { id: 'blind', label: 'Auswendig', hint: 'Sag den Vers auf, ohne hinzusehen. Decke ihn danach auf und vergleiche.' },
  { id: 'type', label: 'Tippen', hint: 'Schreib den Vers aus dem Gedächtnis. Gross-/Kleinschreibung, ß/ss und Satzzeichen zählen nicht.' },
];

const LEVELS = [
  { label: 'Leicht', ratio: 0.3 },
  { label: 'Mittel', ratio: 0.55 },
  { label: 'Schwer', ratio: 0.8 },
];

const STATUS_LABEL = { new: 'Neu', learning: 'Am Lernen', solid: 'Sitzt' };

export function newTrainer(index) {
  return { index, mode: 'read', level: 0, seed: 1, revealed: new Set(), showAll: false, typed: '', result: null, editing: false };
}

function segmented(label, options, current, onPick) {
  return h(
    'div',
    { class: 'segmented', role: 'group', 'aria-label': label },
    options.map((opt, i) => h(
      'button',
      { type: 'button', class: i === current ? 'is-active' : '', 'aria-pressed': String(i === current), onclick: () => onPick(i) },
      opt.label,
    )),
  );
}

function verseBody(ctx, text) {
  const t = ctx.trainer;
  const tokens = tokenize(text);
  const count = tokens.filter((tok) => tok.word).length;
  let hidden = new Set();
  if (t.mode === 'gaps') hidden = hiddenWords(count, LEVELS[t.level].ratio, t.seed);
  if (t.mode === 'letters' || t.mode === 'blind') hidden = new Set(Array.from({ length: count }, (_, i) => i));

  return h(
    'blockquote',
    { class: `verse verse-${t.mode}`, 'aria-live': 'polite' },
    tokens.map((tok) => {
      if (!tok.word || !hidden.has(tok.index)) return tok.text;
      if (t.showAll || t.revealed.has(tok.index)) return h('mark', {}, tok.text);
      return h(
        'button',
        {
          class: 'gap',
          type: 'button',
          style: `--w:${Math.min(Math.max(tok.text.length, 2), 12)}`,
          'aria-label': `Wort ${tok.index + 1} aufdecken`,
          onclick: () => {
            t.revealed.add(tok.index);
            ctx.render();
          },
        },
        t.mode === 'letters' ? firstLetter(tok.text) : '',
      );
    }),
  );
}

function typeMode(ctx, text) {
  const t = ctx.trainer;
  const field = h('textarea', {
    id: 'typed-verse',
    class: 'note',
    rows: '4',
    autocomplete: 'off',
    autocapitalize: 'sentences',
    spellcheck: 'false',
    placeholder: 'Vers aus dem Gedächtnis eintippen …',
    oninput: (e) => { t.typed = e.target.value; },
  });
  field.value = t.typed;

  const result = t.result;
  return h(
    'div',
    { class: 'typebox' },
    h('label', { class: 'sr-only', for: 'typed-verse' }, 'Vers eintippen'),
    field,
    h(
      'div',
      { class: 'row' },
      h('button', {
        class: 'btn',
        type: 'button',
        onclick: () => {
          t.result = compareTyped(text, t.typed);
          ctx.render();
        },
      }, 'Prüfen'),
      result && h('button', {
        class: 'linkbtn',
        type: 'button',
        onclick: () => {
          t.typed = '';
          t.result = null;
          ctx.render();
        },
      }, 'Nochmals versuchen'),
    ),
    result && h(
      'div',
      { class: 'result', role: 'status' },
      h(
        'p',
        { class: 'result-score' },
        `${result.correct} von ${result.total} Wörtern richtig`,
        result.extra > 0 && ` · ${result.extra} zu viel`,
      ),
      h(
        'p',
        { class: 'result-text' },
        result.words.map((w) => [h('span', { class: w.hit ? 'hit' : 'miss' }, w.text), ' ']),
      ),
      h('p', { class: 'hint' }, result.score === 1 ? 'Fehlerfrei. Das sitzt.' : 'Unterstrichene Wörter haben gefehlt oder waren anders.'),
    ),
  );
}

/** Eigener Wortlaut: Vers aus der Bibel App kopieren und hier einfügen. */
function wordingEditor(ctx, day) {
  const t = ctx.trainer;
  const key = day.verse.key;
  const custom = ctx.state.custom[key];
  const reset = () => Object.assign(t, { editing: false, revealed: new Set(), showAll: false, typed: '', result: null });

  const field = h('textarea', {
    id: 'custom-verse',
    class: 'note',
    rows: '4',
    spellcheck: 'false',
    placeholder: 'Kopierten Vers hier einfügen …',
  });
  field.value = custom || '';

  return h(
    'div',
    { class: 'editor' },
    h('label', { for: 'custom-verse' }, `Wortlaut für ${day.verse.ref}`),
    field,
    h('p', { class: 'hint' }, `Öffne den Vers in der Bibel App, kopiere ihn und füge ihn hier ein. Stellenangabe und Link entfernt die App von selbst. Der Text bleibt auf diesem Gerät.`),
    h(
      'div',
      { class: 'row' },
      h('button', {
        class: 'btn btn-primary',
        type: 'button',
        onclick: () => {
          const cleaned = cleanPastedVerse(field.value);
          if (wordCount(cleaned) < 3) {
            ctx.toast('Das ist noch kein ganzer Vers. Bitte den Text einfügen.');
            return;
          }
          reset();
          ctx.update((s) => { s.custom[key] = cleaned; }, 'Gespeichert. Du lernst den Vers jetzt in diesem Wortlaut.');
        },
      }, 'Speichern'),
      h('button', {
        class: 'linkbtn',
        type: 'button',
        onclick: () => {
          t.editing = false;
          ctx.render();
        },
      }, 'Abbrechen'),
      custom && h('button', {
        class: 'linkbtn',
        type: 'button',
        onclick: () => {
          reset();
          ctx.update((s) => { delete s.custom[key]; }, `Wieder im Wortlaut der ${ctx.plan.translations[ctx.state.translation].name}.`);
        },
      }, 'Eingefügten Wortlaut entfernen'),
    ),
  );
}

function ratingBar(ctx, key) {
  const st = ctx.state.verses[key];
  const choose = (rating, message) => () => {
    const next = rate(ctx.state.verses[key], rating, ctx.today);
    ctx.update((s) => {
      s.verses[key] = next;
      s.active[ctx.today] = true;
    }, `${message} Nächste Wiederholung: ${formatShort(next.due)}.`);
  };
  return h(
    'section',
    { class: 'rating' },
    h('h3', { class: 'label' }, 'Wie gut sitzt der Vers?'),
    h(
      'div',
      { class: 'rating-buttons' },
      h('button', { class: 'btn', type: 'button', onclick: choose('again', 'Kein Problem.') }, 'Noch nicht'),
      h('button', { class: 'btn', type: 'button', onclick: choose('ok', 'Fast geschafft.') }, 'Fast'),
      h('button', { class: 'btn btn-primary', type: 'button', onclick: choose('good', 'Stark.') }, icon('check'), 'Sitzt'),
    ),
    h(
      'p',
      { class: 'hint' },
      st
        ? `Stufe ${st.box} von ${INTERVALS.length} · ${st.reps}× geübt · nächste Wiederholung am ${formatShort(st.due)}`
        : 'Deine Einschätzung legt fest, wann der Vers zur Wiederholung wiederkommt.',
    ),
  );
}

function verseRow(ctx, index, { showDue = false } = {}) {
  const day = ctx.days[index];
  const st = ctx.state.verses[day.verse.key];
  const kind = status(st);
  const locked = ctx.cycle === 0 && index > ctx.todayIndex;
  return h(
    'li',
    {},
    h(
      'button',
      {
        class: `verserow${index === ctx.trainer.index ? ' is-current' : ''}${locked ? ' is-later' : ''}`,
        type: 'button',
        onclick: () => ctx.openVerse(index),
      },
      h('span', { class: `status status-${kind}`, title: STATUS_LABEL[kind] }),
      h(
        'span',
        { class: 'verserow-main' },
        h('span', { class: 'verserow-ref' }, day.verse.ref),
        h('span', { class: 'verserow-text' }, ctx.verseText(day)),
      ),
      h(
        'span',
        { class: 'verserow-meta' },
        showDue ? 'fällig' : locked ? `Tag ${index + 1}` : STATUS_LABEL[kind],
      ),
    ),
  );
}

export function renderVerse(ctx) {
  const t = ctx.trainer;
  const day = ctx.days[t.index];
  const text = ctx.verseText(day);
  const key = day.verse.key;
  const isTodays = t.index === ctx.todayIndex;
  const mode = MODES.find((m) => m.id === t.mode);

  const due = ctx.days.map((d, i) => i).filter((i) => isDue(ctx.state.verses[ctx.days[i].verse.key], ctx.today));
  const counts = { new: 0, learning: 0, solid: 0 };
  for (const d of ctx.days) counts[status(ctx.state.verses[d.verse.key])]++;

  const setMode = (i) => {
    Object.assign(t, { mode: MODES[i].id, revealed: new Set(), showAll: false, result: null });
    ctx.render();
  };

  const controls = [];
  if (t.mode === 'gaps') {
    controls.push(
      segmented('Schwierigkeit', LEVELS, t.level, (i) => {
        Object.assign(t, { level: i, revealed: new Set(), showAll: false });
        ctx.render();
      }),
      h('button', {
        class: 'linkbtn',
        type: 'button',
        onclick: () => {
          Object.assign(t, { seed: t.seed + 1, revealed: new Set(), showAll: false });
          ctx.render();
        },
      }, icon('shuffle'), 'Andere Lücken'),
    );
  }
  if (['gaps', 'letters', 'blind'].includes(t.mode)) {
    controls.push(
      h('button', {
        class: 'linkbtn',
        type: 'button',
        onclick: () => {
          Object.assign(t, { showAll: !t.showAll, revealed: new Set() });
          ctx.render();
        },
      }, t.showAll ? 'Wieder verdecken' : 'Alles aufdecken'),
    );
  }

  return h(
    'article',
    { class: 'view view-verse' },
    h(
      'header',
      { class: 'hero' },
      h('p', { class: 'eyebrow' }, isTodays ? 'Lernvers heute' : `Lernvers · Tag ${t.index + 1}`),
      h('h1', {}, day.verse.ref),
      h(
        'p',
        { class: 'hero-meta' },
        `Aus der Woche «${day.week.title}»`,
        !isTodays && [' · ', h('button', { class: 'linkbtn', type: 'button', onclick: () => ctx.openVerse(ctx.todayIndex) }, 'Zum heutigen Vers')],
      ),
    ),

    h(
      'section',
      { class: 'card trainer' },
      segmented('Übungsart', MODES, MODES.indexOf(mode), setMode),
      h('p', { class: 'hint' }, mode.hint),
      t.mode === 'type' ? typeMode(ctx, text) : verseBody(ctx, text),
      controls.length > 0 && h('div', { class: 'row trainer-controls' }, controls),
      h('p', { class: 'cite' }, `${day.verse.ref} · ${ctx.verseSource(day)}`),
      h(
        'div',
        { class: 'row trainer-links' },
        extLink(bibleAppUrl(key.split(' ')[0], day.verse.ref), `In der Bibel App öffnen · ${BIBLE_APP.abbr}`, { class: 'linkbtn' }),
        !t.editing && h('button', {
          class: 'linkbtn',
          type: 'button',
          onclick: () => {
            t.editing = true;
            ctx.render();
          },
        }, ctx.state.custom[key] ? 'Wortlaut ändern' : `Wortlaut aus der ${BIBLE_APP.abbr} einfügen`),
      ),
      t.editing && wordingEditor(ctx, day),
    ),

    ratingBar(ctx, key),

    h(
      'section',
      { class: 'block' },
      h('h3', { class: 'label' }, `Heute wiederholen${due.length ? ` (${due.length})` : ''}`),
      h(
        'div',
        { class: 'block-body' },
        due.length
          ? h('ul', { class: 'verselist' }, due.map((i) => verseRow(ctx, i, { showDue: true })))
          : h('p', { class: 'hint' }, 'Nichts fällig. Verse, die du eingeschätzt hast, tauchen hier zur Wiederholung wieder auf – erst nach einem Tag, dann in immer grösseren Abständen.'),
      ),
    ),

    h(
      'section',
      { class: 'block' },
      h('h3', { class: 'label' }, 'Alle Verse'),
      h(
        'div',
        { class: 'block-body' },
        h('p', { class: 'hint' }, `${counts.solid} sitzen · ${counts.learning} am Lernen · ${counts.new} neu`),
        ctx.plan.weeks.map((week, w) => h(
          'details',
          { class: 'more weekgroup', open: w === day.weekIndex },
          h('summary', {}, `Woche ${w + 1}: ${week.title}`),
          h('ul', { class: 'verselist' }, week.days.map((_, d) => verseRow(ctx, w * 7 + d))),
        )),
      ),
    ),
  );
}

