// Helfer für die Inhalte von ICF Zürich (Predigten aus dem Podcast, Videos von YouTube).

/** "Titel | Vorname Name" -> { title, speaker } */
export function splitTitle(raw) {
  const parts = String(raw).split('|').map((s) => s.trim()).filter(Boolean);
  return { title: parts[0] || String(raw).trim(), speaker: parts.slice(1).join(' · ') };
}

const key = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Sucht zu einer Predigt das Video mit demselben Titel. */
export function videoFor(sermon, videos) {
  const wanted = key(splitTitle(sermon.title).title);
  if (!wanted) return undefined;
  return (videos || []).find((v) => key(splitTitle(v.title).title) === wanted);
}

/** "2200" (Sekunden) oder "00:36:40" -> "37 Min." */
export function formatDuration(value) {
  if (!value) return '';
  const parts = String(value).split(':').map(Number);
  if (parts.some(Number.isNaN)) return '';
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  if (seconds < 60) return '';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} Min.`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} Std. ${rest} Min.` : `${Math.floor(minutes / 60)} Std.`;
}
