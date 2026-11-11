// Bereich «ICF»: neueste Videos von ICF Zürich, Themensuche und Predigtnotizen.

import { extLink, h, icon } from '../lib/dom.js';
import { formatShort, isoWeek } from '../lib/dates.js';
import { entryFor, icfSearchUrl } from '../lib/plan.js';

const watchUrl = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
const thumbUrl = (id, size = 'mqdefault') => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/${size}.jpg`;

function thumb(video, size) {
  // Lädt das Vorschaubild nicht (offline oder blockiert), bleibt eine neutrale Fläche stehen.
  return h('img', {
    src: thumbUrl(video.id, size),
    alt: '',
    loading: 'lazy',
    decoding: 'async',
    onerror: (e) => e.target.remove(),
  });
}

function featured(ctx, video) {
  const frame = h('div', { class: 'video-frame' }, thumb(video, 'hqdefault'));
  const actions = [extLink(watchUrl(video.id), 'Auf YouTube ansehen', { class: 'btn btn-primary' })];
  if (ctx.canEmbed) {
    actions.unshift(
      h('button', {
        class: 'btn',
        type: 'button',
        onclick: (e) => {
          frame.replaceChildren(h('iframe', {
            src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}?autoplay=1&rel=0`,
            title: video.title,
            allow: 'accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen',
            allowfullscreen: true,
            referrerpolicy: 'strict-origin-when-cross-origin',
          }));
          e.currentTarget.remove();
        },
      }, icon('play', { filled: true }), 'Hier abspielen'),
    );
  }
  return h(
    'section',
    { class: 'card video-featured' },
    frame,
    h('p', { class: 'eyebrow' }, `Neuestes Video · ${formatShort(video.published.slice(0, 10))}`),
    h('h2', {}, video.title),
    h('div', { class: 'row' }, actions),
  );
}

function videoList(videos) {
  return h(
    'ul',
    { class: 'videolist' },
    videos.map((v) => h(
      'li',
      {},
      h(
        'a',
        { href: watchUrl(v.id), target: '_blank', rel: 'noopener noreferrer', class: 'videorow' },
        h('span', { class: 'videorow-thumb' }, thumb(v)),
        h(
          'span',
          { class: 'videorow-main' },
          h('span', { class: 'videorow-title' }, v.title),
          h('span', { class: 'meta' }, formatShort(v.published.slice(0, 10))),
        ),
      ),
    )),
  );
}

export function renderIcf(ctx) {
  const { day } = entryFor(ctx.days, ctx.n);
  const icf = ctx.icf;
  const videos = icf.videos || [];
  const week = isoWeek(ctx.today);
  const channelUrl = icf.channel?.url || 'https://icf.ch/youtube';

  const noteField = h('textarea', {
    id: 'sermon-note',
    class: 'note',
    rows: '5',
    placeholder: 'Was hat dich angesprochen? Was setzt du diese Woche um?',
    oninput: (e) => ctx.saveQuietly((s) => {
      if (e.target.value.trim()) s.sermon[week] = e.target.value;
      else delete s.sermon[week];
    }),
  });
  noteField.value = ctx.state.sermon[week] || '';

  const earlier = Object.keys(ctx.state.sermon).filter((w) => w !== week).sort().reverse();

  return h(
    'article',
    { class: 'view view-icf' },
    h(
      'header',
      { class: 'hero' },
      h('p', { class: 'eyebrow' }, 'Deine Church'),
      h('h1', {}, 'ICF Zürich'),
      h('p', { class: 'lead' }, 'Was du unter der Woche liest, vertieft die Celebration am Wochenende – und umgekehrt.'),
    ),

    videos.length
      ? [
          featured(ctx, videos[0]),
          videos.length > 1 && h(
            'section',
            { class: 'block' },
            h('h3', { class: 'label' }, 'Weitere Videos'),
            h('div', { class: 'block-body' }, videoList(videos.slice(1, 9))),
          ),
        ]
      : h(
          'section',
          { class: 'card' },
          h('p', { class: 'eyebrow' }, 'Predigten'),
          h('h2', {}, 'Aktuelle Celebrations ansehen'),
          h('p', {}, 'Die Liste der neuesten Videos wird einmal täglich aktualisiert, sobald die App online eingerichtet ist. Bis dahin findest du alles direkt auf dem Kanal.'),
          h('div', { class: 'row' }, extLink(channelUrl, 'Zum YouTube-Kanal', { class: 'btn btn-primary' })),
        ),

    h(
      'section',
      { class: 'block' },
      h('h3', { class: 'label' }, 'Thema der Woche'),
      h(
        'div',
        { class: 'block-body' },
        h('p', {}, `Im Leseplan geht es diese Woche um «${day.week.theme}». Such dir dazu eine Predigt oder einen Input von ICF Zürich:`),
        h('p', {}, extLink(icfSearchUrl(day.week.icf), `«${day.week.theme}» bei ICF Zürich`, { class: 'btn' })),
        h(
          'details',
          { class: 'more' },
          h('summary', {}, 'Alle Themen des Leseplans'),
          h('ul', { class: 'chips' }, ctx.plan.weeks.map((w) => h('li', {}, extLink(icfSearchUrl(w.icf), w.theme, { class: 'chip' })))),
        ),
      ),
    ),

    h(
      'section',
      { class: 'block' },
      h('h3', { class: 'label' }, h('label', { for: 'sermon-note' }, 'Predigtnotizen')),
      h(
        'div',
        { class: 'block-body' },
        noteField,
        h('p', { class: 'hint' }, `Notiz für Kalenderwoche ${Number(week.slice(-2))}. Wird nur auf diesem Gerät gespeichert.`),
        earlier.length > 0 && h(
          'details',
          { class: 'more' },
          h('summary', {}, `Frühere Notizen (${earlier.length})`),
          earlier.map((w) => h('div', { class: 'oldnote' }, h('p', { class: 'meta' }, `Kalenderwoche ${Number(w.slice(-2))} / ${w.slice(0, 4)}`), h('p', {}, ctx.state.sermon[w]))),
        ),
      ),
    ),

    h(
      'section',
      { class: 'block' },
      h('h3', { class: 'label' }, 'Mehr von ICF Zürich'),
      h(
        'div',
        { class: 'block-body' },
        h('ul', { class: 'linklist' }, (icf.links || []).map((l) => h('li', {}, extLink(l.url, l.label), l.note && h('span', { class: 'meta' }, l.note)))),
        h('p', { class: 'hint' }, 'Diese App ist ein privates Projekt und kein offizielles Angebot von ICF Zürich. Videos und Seiten gehören ICF Zürich und werden nur verlinkt.'),
        icf.updated && h('p', { class: 'hint' }, `Videoliste aktualisiert am ${formatShort(icf.updated.slice(0, 10))}.`),
      ),
    ),
  );
}
