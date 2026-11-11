// Einstieg: lädt Daten und persönlichen Stand, verwaltet die vier Bereiche.

import { todayISO, streak } from './lib/dates.js';
import { dayNumber, entryFor, flattenPlan } from './lib/plan.js';
import { defaults, load, save } from './lib/store.js';
import { renderToday } from './views/today.js';
import { newTrainer, renderVerse } from './views/verse.js';
import { renderIcf } from './views/icf.js';
import { renderPath } from './views/path.js';

const VIEWS = { heute: renderToday, lernvers: renderVerse, icf: renderIcf, weg: renderPath };
const FALLBACK_ICF = {
  updated: null,
  channel: { title: 'ICF Zürich', url: 'https://icf.ch/youtube' },
  videos: [],
  links: [],
};

const main = document.getElementById('main');
const toastEl = document.getElementById('toast');
const streakEl = document.getElementById('streak');

async function getJSON(path) {
  // Eine eingebettete Vorschau kann die Daten direkt mitliefern.
  const inline = window.MANNA_DATA?.[path];
  if (inline) return inline;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

function currentView() {
  const name = location.hash.replace(/^#/, '');
  return VIEWS[name] ? name : 'heute';
}

let toastTimer;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 4000);
}

async function boot() {
  const today = todayISO();
  const state = load(today);
  const [plan, icf] = await Promise.all([getJSON('data/plan.json'), getJSON('data/icf.json').catch(() => FALLBACK_ICF)]);
  if (!plan.translations[state.translation]) state.translation = Object.keys(plan.translations)[0];
  const text = await getJSON(`data/text-${state.translation}.json`);

  const ctx = {
    plan,
    days: flattenPlan(plan),
    text,
    icf: { ...FALLBACK_ICF, ...icf },
    state,
    today,
    // In der eingebetteten Vorschau lassen sich keine YouTube-Player einbinden.
    canEmbed: !window.MANNA_PREVIEW,
    storageOk: undefined,

    syncDay() {
      ctx.today = todayISO();
      ctx.n = dayNumber(ctx.state.start, ctx.today);
      const entry = entryFor(ctx.days, ctx.n);
      ctx.todayIndex = entry.index;
      ctx.cycle = entry.cycle;
    },

    render() {
      const name = currentView();
      main.replaceChildren(VIEWS[name](ctx));
      for (const link of document.querySelectorAll('.tabbar a')) {
        if (link.getAttribute('href') === `#${name}`) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      }
      const run = streak(ctx.state.active, ctx.today);
      streakEl.textContent = run > 0 ? `${run} ${run === 1 ? 'Tag' : 'Tage'} in Folge` : '';
      streakEl.hidden = run === 0;
    },

    persist() {
      ctx.storageOk = save(ctx.state);
    },

    /** Stand ändern, speichern und neu zeichnen. */
    update(change, message) {
      change(ctx.state);
      ctx.persist();
      ctx.syncDay();
      ctx.render();
      if (message) toast(message);
    },

    /** Stand ändern und speichern, ohne neu zu zeichnen (z. B. beim Tippen). */
    saveQuietly(change) {
      change(ctx.state);
      ctx.persist();
    },

    showDay(n) {
      ctx.viewN = Math.max(0, n);
      if (currentView() === 'heute') ctx.render();
      else location.hash = '#heute';
      window.scrollTo(0, 0);
    },

    openVerse(index) {
      ctx.trainer = newTrainer(index);
      if (currentView() === 'lernvers') ctx.render();
      else location.hash = '#lernvers';
      window.scrollTo(0, 0);
    },

    /** Startdatum ändern: «heute» liegt danach an einer anderen Stelle im Plan. */
    setStart(startISO, message) {
      ctx.state.start = startISO;
      ctx.persist();
      ctx.syncDay();
      ctx.viewN = ctx.n;
      ctx.trainer = newTrainer(ctx.todayIndex);
      ctx.render();
      toast(message);
    },

    async setTranslation(slug) {
      try {
        ctx.text = await getJSON(`data/text-${slug}.json`);
        ctx.update((s) => { s.translation = slug; }, `Bibeltext: ${plan.translations[slug].name}.`);
      } catch {
        ctx.render();
        toast('Die Übersetzung konnte nicht geladen werden. Bitte später nochmals versuchen.');
      }
    },

    /** Stand ersetzen (Sicherung einspielen) oder mit null ganz neu beginnen. */
    async replaceState(next) {
      ctx.state = next || defaults(todayISO());
      if (!plan.translations[ctx.state.translation]) ctx.state.translation = Object.keys(plan.translations)[0];
      try {
        ctx.text = await getJSON(`data/text-${ctx.state.translation}.json`);
      } catch {
        // Text der bisherigen Übersetzung bleibt stehen
      }
      ctx.persist();
      ctx.syncDay();
      ctx.viewN = ctx.n;
      ctx.trainer = newTrainer(ctx.todayIndex);
      ctx.render();
      window.scrollTo(0, 0);
      toast(next ? 'Sicherung wiederhergestellt.' : 'Zurückgesetzt. Heute ist Tag 1.');
    },

    toast,
  };

  ctx.syncDay();
  ctx.viewN = ctx.n;
  ctx.trainer = newTrainer(ctx.todayIndex);
  ctx.persist();
  ctx.render();

  window.addEventListener('hashchange', () => {
    ctx.render();
    window.scrollTo(0, 0);
  });

  // Nach Mitternacht (App blieb offen) auf den neuen Tag springen.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || todayISO() === ctx.today) return;
    ctx.syncDay();
    ctx.viewN = ctx.n;
    ctx.trainer = newTrainer(ctx.todayIndex);
    ctx.render();
  });

  if ('serviceWorker' in navigator && !window.MANNA_PREVIEW) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot().catch((err) => {
  console.error(err);
  main.replaceChildren(Object.assign(document.createElement('p'), {
    className: 'loadfail',
    textContent: 'Die Inhalte konnten nicht geladen werden. Prüfe deine Verbindung und lade die Seite neu.',
  }));
});
