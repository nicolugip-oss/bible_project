// Winziger Helfer zum Erzeugen von DOM-Knoten ohne Framework.

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'g']);

/**
 * h('button', { class: 'btn', onclick: fn }, 'Text', kindKnoten)
 * - Attribute mit Wert false/null/undefined werden weggelassen
 * - on…-Attribute werden als Event-Handler registriert
 */
export function h(tag, attrs, ...children) {
  const el = SVG_TAGS.has(tag) ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === false || value === null || value === undefined) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (value === true) el.setAttribute(key, '');
    else el.setAttribute(key, String(value));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children) {
    if (child === false || child === null || child === undefined) continue;
    if (Array.isArray(child)) append(el, child);
    else el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

const ICONS = {
  today: 'M5 4h14a1 1 0 0 1 1 1v15H6a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1zm3 5h8M8 13h5',
  verse: 'M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z',
  church: 'M12 3v5m-2.5-2.5h5M5 21V12l7-4 7 4v9M9.5 21v-5a2.5 2.5 0 0 1 5 0v5',
  path: 'M5 19c4 0 3-6 7-6s3-6 7-6M5 19h.01M19 7h.01',
  prev: 'M14.5 6l-6 6 6 6',
  next: 'M9.5 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  external: 'M14 5h5v5m0-5l-8 8M10 6H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4',
  play: 'M8 5.5v13l11-6.5z',
  shuffle: 'M4 7h3c5 0 5 10 10 10h3m-3-3l3 3-3 3M4 17h3c1.6 0 2.7-1 3.6-2.4M20 7h-3c-1.6 0-2.7 1-3.6 2.4M17 4l3 3-3 3',
};

export function icon(name, { filled = false } = {}) {
  return h(
    'svg',
    { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
    h('path', {
      d: ICONS[name],
      fill: filled ? 'currentColor' : 'none',
      stroke: 'currentColor',
      'stroke-width': '1.8',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }),
  );
}

/** Link nach aussen; öffnet in einem neuen Tab. */
export function extLink(href, label, attrs = {}) {
  return h('a', { href, target: '_blank', rel: 'noopener noreferrer', ...attrs }, label, icon('external'));
}
