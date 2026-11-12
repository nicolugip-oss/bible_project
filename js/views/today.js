// Bereich «Heute»: Bibelstelle des Tages mit Hintergrund, Kontext und Gedankenanstössen.

import { extLink, h, icon } from '../lib/dom.js';
import { BIBLE_APP, bibleAppUrl } from '../lib/bibleapp.js';
import { formatLong, formatShort } from '../lib/dates.js';
import { dateFor, entryFor, icfSearchUrl, readingMinutes } from '../lib/plan.js';

const POETRY = new Set(['Ps', 'Prov', 'Lam', 'Eccl']);

function weekStrip(ctx, n) {
  const { day } = entryFor(ctx.days, n);
  const first = n - day.dayInWeek;
  return h(
    'div',
    { class: 'weekstrip', role: 'group', 'aria-label': 'Tage dieser Woche' },
    Array.from({ length: 7 }, (_, i) => {
      const k = first + i;
      const classes = ['dot'];
      if (ctx.state.done[k]) classes.push('is-done');
      if (k === ctx.n) classes.push('is-today');
      if (k === n) classes.push('is-current');
      return h(
        'button',
        {
          class: classes.join(' '),
          type: 'button',
          'aria-label': `Tag ${i + 1} der Woche${ctx.state.done[k] ? ', gelesen' : ''}${k === ctx.n ? ', heute' : ''}`,
          'aria-current': k === n ? 'true' : null,
          onclick: () => ctx.showDay(k),
        },
        i + 1,
      );
    }),
  );
}

function scripture(ctx, day) {
  const verses = ctx.text.passages[day.id];
  const translation = ctx.plan.translations[ctx.state.translation];
  const poetry = POETRY.has(day.book);
  const body = poetry
    ? h('div', { class: 'scripture-text is-poetry' }, verses.map(([num, text]) => h('p', {}, h('sup', { class: 'vn' }, num), text)))
    : h('p', { class: 'scripture-text' }, verses.map(([num, text]) => [h('sup', { class: 'vn' }, num), `${text} `]));
  return h(
    'section',
    { class: 'scripture', 'aria-labelledby': 'scripture-ref' },
    h(
      'header',
      { class: 'scripture-head' },
      h('h2', { id: 'scripture-ref' }, day.ref),
      h('span', { class: 'meta' }, `ca. ${readingMinutes(verses)} Min. Lesezeit`),
    ),
    extLink(bibleAppUrl(day.book, day.ref), `In der Bibel App lesen · ${BIBLE_APP.abbr}`, { class: 'btn btn-primary btn-wide' }),
    h('p', { class: 'hint' }, `Öffnet die Bibel App an dieser Stelle in der «${BIBLE_APP.name}». Ohne installierte App öffnet sich bible.com.`),
    h(
      'details',
      {
        class: 'more scripture-details',
        open: ctx.state.showText,
        ontoggle: (e) => ctx.saveQuietly((s) => { s.showText = e.target.open; }),
      },
      h('summary', {}, `Text hier lesen (${translation.short})`),
      body,
    ),
  );
}

function block(label, ...content) {
  return h('section', { class: 'block' }, h('h3', { class: 'label' }, label), h('div', { class: 'block-body' }, content));
}

export function renderToday(ctx) {
  const n = ctx.viewN;
  const { day, index, cycle } = entryFor(ctx.days, n);
  const isToday = n === ctx.n;
  const date = dateFor(ctx.state.start, n);
  const doneOn = ctx.state.done[n];
  const book = ctx.plan.books[day.book];
  const verseText = ctx.verseText(day);

  const noteField = h('textarea', {
    id: `note-${n}`,
    class: 'note',
    rows: '4',
    placeholder: 'Was nimmst du aus diesem Text mit?',
    oninput: (e) => ctx.saveQuietly((s) => {
      if (e.target.value.trim()) s.notes[n] = e.target.value;
      else delete s.notes[n];
    }),
  });
  noteField.value = ctx.state.notes[n] || '';

  return h(
    'article',
    { class: 'view view-today' },
    h(
      'header',
      { class: 'hero' },
      h(
        'div',
        { class: 'daynav' },
        h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Vorheriger Tag', disabled: n === 0, onclick: () => ctx.showDay(n - 1) }, icon('prev')),
        h(
          'div',
          { class: 'daynav-mid' },
          h('span', { class: 'date' }, isToday ? `Heute · ${formatLong(date)}` : formatLong(date)),
          !isToday && h('button', { class: 'linkbtn', type: 'button', onclick: () => ctx.showDay(ctx.n) }, 'Zu heute'),
        ),
        h('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Nächster Tag', onclick: () => ctx.showDay(n + 1) }, icon('next')),
      ),
      h('p', { class: 'eyebrow' }, `Woche ${day.weekIndex + 1} · ${day.week.theme}`),
      h('h1', {}, day.title),
      h(
        'p',
        { class: 'hero-meta' },
        `Tag ${index + 1} von ${ctx.days.length}`,
        cycle > 0 && ` · ${cycle + 1}. Durchgang`,
      ),
      weekStrip(ctx, n),
      day.dayInWeek === 0 && h('p', { class: 'lead' }, day.week.intro),
    ),

    scripture(ctx, day),

    block(
      'Hintergrund',
      h('p', {}, day.background),
      h('details', { class: 'more' }, h('summary', {}, `Zum Buch: ${book.name}`), h('p', {}, book.intro)),
    ),
    block('Kontext', h('p', {}, day.context)),
    block('Kerngedanke', h('p', {}, day.insight)),
    block(
      'Gedankenanstösse',
      h('ul', { class: 'questions' }, day.questions.map((q) => h('li', {}, q))),
      h('div', { class: 'action' }, h('span', { class: 'action-label' }, 'Heute konkret'), h('p', {}, day.action)),
    ),
    block('Gebet', h('p', { class: 'prayer' }, day.prayer)),

    h(
      'section',
      { class: 'block' },
      h('h3', { class: 'label' }, h('label', { for: `note-${n}` }, 'Meine Notizen')),
      h('div', { class: 'block-body' }, noteField, h('p', { class: 'hint' }, 'Wird nur auf diesem Gerät gespeichert.')),
    ),

    h(
      'section',
      { class: 'card versecard' },
      h('p', { class: 'eyebrow' }, 'Lernvers des Tages'),
      h('blockquote', {}, verseText),
      h('p', { class: 'cite' }, `${day.verse.ref} · ${ctx.verseSource(day)}`),
      h(
        'div',
        { class: 'row' },
        h('button', { class: 'btn', type: 'button', onclick: () => ctx.openVerse(index) }, 'Vers lernen'),
        extLink(bibleAppUrl(day.verse.key.split(' ')[0], day.verse.ref), `In der Bibel App · ${BIBLE_APP.abbr}`, { class: 'linkbtn' }),
      ),
    ),

    h(
      'section',
      { class: 'block' },
      h('h3', { class: 'label' }, 'ICF Zürich'),
      h(
        'div',
        { class: 'block-body' },
        h('p', {}, `Predigten und Inputs zum Wochenthema «${day.week.theme}»:`),
        h(
          'p',
          { class: 'linkrow' },
          extLink(icfSearchUrl(day.week.icf), 'Bei ICF Zürich auf YouTube suchen'),
          h('a', { href: '#icf' }, 'Neueste Predigten'),
        ),
      ),
    ),

    h(
      'div',
      { class: 'donebar' },
      doneOn
        ? [
            h('p', { class: 'done-state' }, icon('check'), `Gelesen am ${formatShort(doneOn)}`),
            h('button', { class: 'linkbtn', type: 'button', onclick: () => ctx.update((s) => { delete s.done[n]; }) }, 'Rückgängig'),
          ]
        : h(
            'button',
            {
              class: 'btn btn-primary btn-wide',
              type: 'button',
              onclick: () => ctx.update((s) => {
                s.done[n] = ctx.today;
                s.active[ctx.today] = true;
              }, 'Gelesen. Schön, dass du dir Zeit genommen hast.'),
            },
            icon('check'),
            'Als gelesen markieren',
          ),
    ),
  );
}
