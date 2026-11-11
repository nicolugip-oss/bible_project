import test from 'node:test';
import assert from 'node:assert/strict';
import { extractChannelId, parseFeed } from '../scripts/fetch-icf.mjs';

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <link rel="self" href="http://www.youtube.com/feeds/videos.xml?channel_id=UCaaaaaaaaaaaaaaaaaaaaaa"/>
 <id>yt:channel:aaaaaaaaaaaaaaaaaaaaaa</id>
 <yt:channelId>aaaaaaaaaaaaaaaaaaaaaa</yt:channelId>
 <title>Beispielkanal &amp; Co</title>
 <link rel="alternate" href="https://www.youtube.com/channel/UCaaaaaaaaaaaaaaaaaaaaaa"/>
 <entry>
  <id>yt:video:abc123DEF_-</id>
  <yt:videoId>abc123DEF_-</yt:videoId>
  <title>Predigt: Mut &amp; Glaube &#39;heute&#39;</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=abc123DEF_-"/>
  <published>2026-11-08T10:00:00+00:00</published>
  <media:group><media:title>Predigt</media:title></media:group>
 </entry>
 <entry>
  <id>yt:video:short000001</id>
  <yt:videoId>short000001</yt:videoId>
  <title>Kurzclip</title>
  <link rel="alternate" href="https://www.youtube.com/shorts/short000001"/>
  <published>2026-11-07T10:00:00+00:00</published>
 </entry>
 <entry>
  <yt:videoId>zzz999YYY88</yt:videoId>
  <title>Zweites Video</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=zzz999YYY88"/>
  <published>2026-11-01T10:00:00+00:00</published>
 </entry>
</feed>`;

test('parseFeed liest Kanalname und Videos, lässt Shorts aus', () => {
  const feed = parseFeed(FEED);
  assert.equal(feed.title, 'Beispielkanal & Co');
  assert.deepEqual(feed.videos, [
    { id: 'abc123DEF_-', title: "Predigt: Mut & Glaube 'heute'", published: '2026-11-08T10:00:00+00:00' },
    { id: 'zzz999YYY88', title: 'Zweites Video', published: '2026-11-01T10:00:00+00:00' },
  ]);
});

test('parseFeed kommt mit leerem oder fremdem Inhalt zurecht', () => {
  assert.deepEqual(parseFeed('<html>Fehlerseite</html>'), { title: '', videos: [] });
});

test('extractChannelId findet die Kanal-ID in einer Kanalseite', () => {
  const id = 'UCbbbbbbbbbbbbbbbbbbbbbb';
  assert.equal(extractChannelId(`<head><link rel="canonical" href="https://www.youtube.com/channel/${id}"></head>`), id);
  assert.equal(extractChannelId(`var x = {"externalId":"${id}","other":1}`), id);
  assert.equal(extractChannelId('<html>nichts</html>'), null);
});

test('parsePodcast liest Titel, Datum, Seite und Audiodatei', async () => {
  const { parsePodcast } = await import('../scripts/fetch-icf.mjs');
  const xml = `<rss><channel><title>Beispiel</title>
  <item>
    <title><![CDATA[Mut zum Aufbruch | Vorname Name]]></title>
    <link>https://example.org/predigten/mut-zum-aufbruch/</link>
    <pubDate>Sun, 08 Nov 2026 12:00:00 +0000</pubDate>
    <description><![CDATA[<p>Eine <b>Predigt</b> &amp; mehr</p>]]></description>
    <enclosure url="https://example.org/audio/1.mp3?x=1&amp;y=2" length="123" type="audio/mpeg"/>
    <itunes:duration>00:41:07</itunes:duration>
  </item>
  <item><title>Ohne Datum</title></item>
  <item>
    <title>Nur Titel &amp; Datum</title>
    <pubDate>Sun, 01 Nov 2026 12:00:00 +0000</pubDate>
  </item>
  </channel></rss>`;
  assert.deepEqual(parsePodcast(xml), [
    {
      title: 'Mut zum Aufbruch | Vorname Name',
      published: '2026-11-08T12:00:00.000Z',
      link: 'https://example.org/predigten/mut-zum-aufbruch/',
      audio: 'https://example.org/audio/1.mp3?x=1&y=2',
      duration: '00:41:07',
    },
    { title: 'Nur Titel & Datum', published: '2026-11-01T12:00:00.000Z' },
  ]);
});
