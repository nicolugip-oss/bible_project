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

test('parsePodcast liest Titel, Datum, Audiodatei, Serie und Zusammenfassung', async () => {
  const { parsePodcast } = await import('../scripts/fetch-icf.mjs');
  const long = 'In dieser Predigt geht es um einen Aufbruch, der Mut braucht, und um die Frage, worauf man sich dabei verlassen kann.';
  const xml = `<rss><channel><title>Beispiel</title>
  <item>
    <title>Mut zum Aufbruch | Vorname Name</title>
    <description>Vorname Name: Ein Untertitel

Das Thema «Mut zum Aufbruch» von Vorname Name ist Teil der Predigtserie «Unterwegs»

${long}

Mehr unter https://example.org/geben

Stay Connected</description>
    <pubDate>Sun, 08 Nov 2026 12:00:00 -0000</pubDate>
    <enclosure url="https://example.org/audio/1.mp3?x=1&amp;y=2" length="123" type="audio/mpeg"/>
    <itunes:duration>2467</itunes:duration>
  </item>
  <item><title>Ohne Datum</title></item>
  <item>
    <title><![CDATA[Nur Titel & Datum]]></title>
    <description><![CDATA[<p>Kurz.</p>]]></description>
    <pubDate>Sun, 01 Nov 2026 12:00:00 +0000</pubDate>
  </item>
  </channel></rss>`;
  assert.deepEqual(parsePodcast(xml), [
    {
      title: 'Mut zum Aufbruch | Vorname Name',
      published: '2026-11-08T12:00:00.000Z',
      audio: 'https://example.org/audio/1.mp3?x=1&y=2',
      duration: '2467',
      series: 'Unterwegs',
      summary: long,
    },
    { title: 'Nur Titel & Datum', published: '2026-11-01T12:00:00.000Z' },
  ]);
});

test('describeSermon übernimmt keine Hinweise in eigener Sache als Zusammenfassung', async () => {
  const { describeSermon } = await import('../scripts/fetch-icf.mjs');
  assert.deepEqual(describeSermon('Teil der Predigtserie «Psalm 23»\n\nUm die Kirche zu unterstützen, hier klicken: https://example.org/geben und noch viel mehr Text dazu, damit es lang genug ist.'), { series: 'Psalm 23' });
  assert.deepEqual(describeSermon('Einfach ein Text ohne Serie.'), {});
});

test('splitTitle, videoFor und formatDuration', async () => {
  const { formatDuration, splitTitle, videoFor } = await import('../js/lib/icf.js');
  assert.deepEqual(splitTitle('Er führt mich sicher | Leo Bigger'), { title: 'Er führt mich sicher', speaker: 'Leo Bigger' });
  assert.deepEqual(splitTitle('Ohne Sprecher'), { title: 'Ohne Sprecher', speaker: '' });
  const videos = [
    { id: 'a', title: 'Hour of Prayer | Er führt mich sicher | ICF Zürich' },
    { id: 'b', title: 'Er führt mich sicher | Leo Bigger' },
  ];
  assert.equal(videoFor({ title: 'Er führt mich sicher | Leo Bigger' }, videos).id, 'b');
  assert.equal(videoFor({ title: 'Er führt mich sicher! | Leo Bigger' }, videos).id, 'b');
  assert.equal(videoFor({ title: 'Etwas anderes | Leo Bigger' }, videos), undefined);
  assert.equal(videoFor({ title: 'x' }, undefined), undefined);
  assert.equal(formatDuration('2200'), '37 Min.');
  assert.equal(formatDuration('00:41:07'), '41 Min.');
  assert.equal(formatDuration('1:05:00'), '1 Std. 5 Min.');
  assert.equal(formatDuration(''), '');
  assert.equal(formatDuration('abc'), '');
});
