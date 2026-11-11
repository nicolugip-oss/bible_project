#!/usr/bin/env node
// Holt die neuesten Videos des YouTube-Kanals von ICF Zürich und schreibt data/icf.json.
//
// Der Browser darf den YouTube-Feed nicht direkt lesen (keine CORS-Freigabe). Deshalb läuft
// dieses Skript beim Veröffentlichen der App und danach einmal täglich (siehe .github/workflows).
// Schlägt der Abruf fehl, bleibt die bisherige Liste bestehen – die App funktioniert trotzdem.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'data', 'icf.json');
const MAX_VIDEOS = 12;
const MAX_SERMONS = 8;
const HEADERS = {
  'user-agent': 'Mozilla/5.0 (compatible; bible-app-feed/1.0)',
  'accept-language': 'de-CH,de;q=0.9,en;q=0.5',
  cookie: 'SOCS=CAI; CONSENT=YES+1', // überspringt die Cookie-Abfrage von YouTube
};

const CHANNEL_ID = /UC[\w-]{22}/;

/** Liest die Kanal-ID aus dem HTML einer YouTube-Kanalseite. */
export function extractChannelId(html) {
  const patterns = [
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
    /"externalId":"(UC[\w-]{22})"/,
    /<meta itemprop="(?:channelId|identifier)" content="(UC[\w-]{22})"/,
    /"browseId":"(UC[\w-]{22})"/,
  ];
  for (const p of patterns) {
    const m = p.exec(html);
    if (m) return m[1];
  }
  return null;
}

function decodeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
}

/** Liest Kanalname und Videos aus dem Atom-Feed eines Kanals. Shorts werden ausgelassen. */
export function parseFeed(xml) {
  const head = xml.split('<entry>')[0];
  const title = decodeXml(/<title>([^<]*)<\/title>/.exec(head)?.[1] || '').trim();
  const videos = [];
  for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = /<yt:videoId>([\w-]{6,20})<\/yt:videoId>/.exec(entry)?.[1];
    const published = /<published>([^<]+)<\/published>/.exec(entry)?.[1];
    const name = /<title>([^<]*)<\/title>/.exec(entry)?.[1];
    const href = /<link rel="alternate" href="([^"]+)"/.exec(entry)?.[1] || '';
    if (!id || !published || !name || href.includes('/shorts/')) continue;
    videos.push({ id, title: decodeXml(name).trim(), published });
  }
  return { title, videos };
}

function stripMarkup(text) {
  return decodeXml(text.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1'))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Liest Serie und Kurzbeschreibung aus dem Beschreibungstext einer Predigt.
 * Aufbau bei ICF Zürich: Untertitel, Satz zur Predigtserie, Zusammenfassung, danach Hinweise in eigener Sache.
 */
export function describeSermon(description) {
  const paragraphs = description.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const series = /Predigtserie\s+[«„"“]([^»“”"]{2,80})[»“”"]/.exec(description)?.[1]?.trim();
  const at = paragraphs.findIndex((p) => /Predigtserie/.test(p));
  const candidate = at >= 0 ? paragraphs[at + 1] : undefined;
  const summary = candidate && candidate.length >= 80 && !/https?:\/\//.test(candidate) ? candidate : undefined;
  return {
    ...(series ? { series } : {}),
    ...(summary ? { summary: summary.length > 700 ? `${summary.slice(0, 699).replace(/\s+\S*$/, '')} …` : summary } : {}),
  };
}

/** Liest die Folgen eines Podcast-Feeds (RSS 2.0). */
export function parsePodcast(xml) {
  const episodes = [];
  for (const [, item] of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const raw = (name) => new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(item)?.[1] || '';
    const tag = (name) => stripMarkup(raw(name));
    const title = tag('title');
    const date = new Date(tag('pubDate'));
    if (!title || Number.isNaN(date.getTime())) continue;
    const audio = decodeXml(/<enclosure[^>]*\surl="([^"]+)"/.exec(item)?.[1] || '');
    const description = decodeXml(raw('description').replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')).replace(/<[^>]+>/g, '');
    episodes.push({
      title,
      published: date.toISOString(),
      ...(/^https:\/\//.test(audio) ? { audio } : {}),
      ...(tag('itunes:duration') ? { duration: tag('itunes:duration') } : {}),
      ...describeSermon(description),
    });
  }
  return episodes;
}

async function get(url) {
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return { text: await res.text(), url: res.url };
}

async function loadFeed(channelId) {
  const { text } = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  return parseFeed(text);
}

async function resolveChannel(config) {
  const tried = [];
  if (CHANNEL_ID.test(config.id || '')) {
    try {
      return { id: config.id, feed: await loadFeed(config.id) };
    } catch (err) {
      tried.push(`Kanal-ID ${config.id}: ${err.message}`);
    }
  }
  for (const url of config.lookup || []) {
    try {
      const page = await get(url);
      const id = CHANNEL_ID.exec(page.url.match(/\/channel\/(UC[\w-]{22})/)?.[1] || '')?.[0] || extractChannelId(page.text);
      if (!id) throw new Error(`keine Kanal-ID gefunden (gelandet auf ${page.url})`);
      const feed = await loadFeed(id);
      if (!/icf/i.test(feed.title)) throw new Error(`unerwarteter Kanal «${feed.title}»`);
      return { id, feed };
    } catch (err) {
      tried.push(`${url}: ${err.message}`);
    }
  }
  throw new Error(`Kanal nicht gefunden.\n  - ${tried.join('\n  - ')}`);
}

async function main() {
  const config = JSON.parse(await readFile(join(ROOT, 'content', 'icf.json'), 'utf8'));
  let previous = {};
  try {
    previous = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    // erste Ausführung
  }

  const base = {
    updated: previous.updated || null,
    channel: { title: config.channel.title, url: config.channel.url, ...(previous.channel?.id ? { id: previous.channel.id } : {}) },
    videos: previous.videos || [],
    sermons: previous.sermons || [],
    links: config.links,
  };

  try {
    const { id, feed } = await resolveChannel({ ...config.channel, id: config.channel.id || previous.channel?.id });
    if (!feed.videos.length) throw new Error('Feed enthält keine Videos');
    base.updated = new Date().toISOString();
    base.channel = { title: feed.title || config.channel.title, url: `https://www.youtube.com/channel/${id}`, id };
    base.videos = feed.videos.slice(0, MAX_VIDEOS);
    console.log(`ICF: Kanal «${base.channel.title}» (${id}), ${base.videos.length} Videos. Neuestes: ${base.videos[0].title}`);
  } catch (err) {
    console.warn(`ICF: Videoliste nicht aktualisiert – ${err.message}`);
  }

  if (config.podcast?.feed) {
    try {
      const { text } = await get(config.podcast.feed);
      const episodes = parsePodcast(text);
      if (!episodes.length) throw new Error('Feed enthält keine Folgen');
      base.sermons = episodes.slice(0, MAX_SERMONS);
      console.log(`ICF: Podcast mit ${episodes.length} Folgen. Neueste: ${episodes[0].title}`);
    } catch (err) {
      console.warn(`ICF: Predigtliste nicht aktualisiert – ${err.message}`);
    }
  }

  await writeFile(OUT, JSON.stringify(base, null, 2) + '\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
