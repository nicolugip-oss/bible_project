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
