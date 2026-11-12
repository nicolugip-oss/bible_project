// Bereich «Mein Weg»: Fortschritt über den ganzen Leseplan, Einstellungen und Sicherung.

import { h } from '../lib/dom.js';
import { formatShort, isISODate, streak } from '../lib/dates.js';
import { status } from '../lib/memory.js';
import { BIBLE_APP } from '../lib/bibleapp.js';
import { exportText, importText } from '../lib/store.js';

function stat(value, label) {
  return h('div', { class: 'stat' }, h('span', { class: 'stat-value' }, value), h('span', { class: 'stat-label' }, label));
}

function matrix(ctx) {
  const base = ctx.cycle * ctx.days.length;
  return h(
    'ol',
    { class: 'matrix' },
    ctx.plan.weeks.map((week, w) => h(
      'li',
      { class: 'matrix-row' },
      h('span', { class: 'matrix-title' }, h('span', { class: 'matrix-num' }, w + 1), week.title),
      h(
        'span',
        { class: 'matrix-dots' },
        week.days.map((day, d) => {
          const k = base + w * 7 + d;
          const classes = ['dot'];
          if (ctx.state.done[k]) classes.push('is-done');
          else if (k < ctx.n) classes.push('is-missed');
          if (k === ctx.n) classes.push('is-today');
          const state = ctx.state.done[k] ? 'gelesen' : k < ctx.n ? 'offen' : k === ctx.n ? 'heute' : 'kommt noch';
          return h('button', {
            class: classes.join(' '),
            type: 'button',
            title: `${day.ref} – ${state}`,
            'aria-label': `Woche ${w + 1}, Tag ${d + 1}: ${day.ref}, ${state}`,
            onclick: () => ctx.showDay(k),
          });
        }),
      ),
    )),
  );
}

function field(id, label, control, hint) {
  return h('div', { class: 'field' }, h('label', { for: id }, label), control, hint && h('p', { class: 'hint' }, hint));
}

function settings(ctx) {
  const translation = h(
    'select',
    { id: 'set-translation', onchange: (e) => ctx.setTranslation(e.target.value) },
    Object.entries(ctx.plan.translations).map(([slug, t]) => h('option', { value: slug, selected: slug === ctx.state.translation }, t.name)),
  );
  const start = h('input', {
    id: 'set-start',
    type: 'date',
    value: ctx.state.start,
    max: ctx.today,
    onchange: (e) => {
      const value = e.target.value;
      if (!isISODate(value) || value > ctx.today) {
        e.target.value = ctx.state.start;
        ctx.toast('Das Startdatum muss heute oder in der Vergangenheit liegen.');
        return;
      }
      ctx.setStart(value, `Tag 1 ist jetzt der ${formatShort(value)}.`);
    },
  });

  // Sicherung
  const backupOut = h('textarea', { id: 'backup-out', class: 'note mono', rows: '3', readonly: true, hidden: true, 'aria-label': 'Sicherung' });
  const backupIn = h('textarea', { id: 'backup-in', class: 'note mono', rows: '3', placeholder: 'Sicherung hier einfügen …', spellcheck: 'false' });
  const copy = async () => {
    const text = exportText(ctx.state);
    try {
      await navigator.clipboard.writeText(text);
      ctx.toast('Sicherung in die Zwischenablage kopiert.');
    } catch {
      backupOut.hidden = false;
      backupOut.value = text;
      backupOut.focus();
      backupOut.select();
      ctx.toast('Markierten Text kopieren und sicher ablegen.');
    }
  };
  const restore = () => {
    try {
      ctx.replaceState(importText(backupIn.value, ctx.today));
    } catch {
      ctx.toast('Das ist keine gültige Sicherung. Bitte den ganzen Text einfügen.');
    }
  };

  // Neustart mit Bestätigung auf der Seite
  const confirmRow = h(
    'div',
    { class: 'confirm', hidden: true },
    h('p', {}, 'Alle gelesenen Tage, Notizen und Lernstände werden gelöscht. Tag 1 ist dann heute.'),
    h(
      'div',
      { class: 'row' },
      h('button', { class: 'btn btn-danger', type: 'button', onclick: () => ctx.replaceState(null) }, 'Ja, alles löschen'),
      h('button', { class: 'btn', type: 'button', onclick: () => { confirmRow.hidden = true; } }, 'Abbrechen'),
    ),
  );

  return h(
    'section',
    { class: 'block' },
    h('h3', { class: 'label' }, 'Einstellungen'),
    h(
      'div',
      { class: 'block-body settings' },
      field('set-translation', 'Bibeltext in der App', translation, `Diese beiden Übersetzungen sind gemeinfrei und deshalb in der App enthalten. Die «${BIBLE_APP.name}» ist urheberrechtlich geschützt: Du liest sie über den Link in der Bibel App und kannst Lernverse von dort einfügen.`),
      field('set-start', 'Startdatum des Leseplans', start, 'An diesem Datum war oder ist Tag 1.'),
      h(
        'div',
        { class: 'field' },
        h('span', { class: 'field-title' }, 'Sicherung'),
        h('p', { class: 'hint' }, 'Dein Fortschritt liegt nur in diesem Browser. Mit einer Sicherung nimmst du ihn auf ein anderes Gerät mit.'),
        h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: copy }, 'Sicherung kopieren')),
        backupOut,
        h('label', { class: 'sr-only', for: 'backup-in' }, 'Sicherung einfügen'),
        backupIn,
        h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: restore }, 'Sicherung wiederherstellen')),
      ),
      h(
        'div',
        { class: 'field' },
        h('span', { class: 'field-title' }, 'Neu beginnen'),
        h('div', { class: 'row' }, h('button', { class: 'linkbtn', type: 'button', onclick: () => { confirmRow.hidden = false; } }, 'Fortschritt zurücksetzen …')),
        confirmRow,
      ),
    ),
  );
}

export function renderPath(ctx) {
  const days = Object.keys(ctx.state.done).length;
  const counts = { new: 0, learning: 0, solid: 0 };
  for (const d of ctx.days) counts[status(ctx.state.verses[d.verse.key])]++;
  const run = streak(ctx.state.active, ctx.today);

  return h(
    'article',
    { class: 'view view-path' },
    h(
      'header',
      { class: 'hero' },
      h('p', { class: 'eyebrow' }, `Unterwegs seit ${formatShort(ctx.state.start)}`),
      h('h1', {}, 'Mein Weg'),
      h('p', { class: 'lead' }, 'Manna gab es jeden Morgen neu – genug für einen Tag. Es geht nicht um eine lückenlose Serie, sondern darum, heute wieder zu sammeln.'),
    ),

    h(
      'section',
      { class: 'stats', 'aria-label': 'Überblick' },
      stat(run, run === 1 ? 'Tag in Folge' : 'Tage in Folge'),
      stat(days, days === 1 ? 'Tag gelesen' : 'Tage gelesen'),
      stat(counts.solid, counts.solid === 1 ? 'Vers sitzt' : 'Verse sitzen'),
    ),

    h(
      'section',
      { class: 'block' },
      h('h3', { class: 'label' }, ctx.cycle > 0 ? `Leseplan · ${ctx.cycle + 1}. Durchgang` : 'Leseplan'),
      h(
        'div',
        { class: 'block-body' },
        matrix(ctx),
        h(
          'p',
          { class: 'legend' },
          h('span', {}, h('span', { class: 'dot is-done' }), 'gelesen'),
          h('span', {}, h('span', { class: 'dot is-today' }), 'heute'),
          h('span', {}, h('span', { class: 'dot is-missed' }), 'offen'),
          h('span', {}, h('span', { class: 'dot' }), 'kommt noch'),
        ),
        h('p', { class: 'hint' }, 'Tippe auf einen Tag, um ihn zu öffnen – auch zum Nachholen.'),
      ),
    ),

    settings(ctx),

    h(
      'section',
      { class: 'block' },
      h('h3', { class: 'label' }, 'Über diese App'),
      h(
        'div',
        { class: 'block-body' },
        h('p', {}, 'Bibeltexte in der App: Lutherbibel 1912 und Elberfelder 1905, beide gemeinfrei. Die Texte stammen aus freien Digitalisaten und können vereinzelt Tippfehler enthalten.'),
        h('p', {}, `Die Links in die Bibel App führen zur «${BIBLE_APP.name}» bei YouVersion. Verse, die du von dort einfügst, bleiben auf deinem Gerät.`),
        h('p', {}, 'Die Erklärungen und Gedankenanstösse sind eine Lesehilfe. Sie ersetzen weder das eigene Lesen noch das Gespräch in deiner Smallgroup.'),
        ctx.storageOk === false && h('p', { class: 'warn' }, 'Dieser Browser speichert den Fortschritt gerade nicht (zum Beispiel im privaten Modus).'),
      ),
    ),
  );
}
