// Links in die Bibel App (YouVersion) und Aufbereitung von dort kopierten Versen.
//
// Die «Hoffnung für alle» ist urheberrechtlich geschützt und deshalb nicht in dieser App enthalten.
// Stattdessen öffnet ein Link die Bibel App genau an der Stelle. Wer einen Vers in dieser
// Übersetzung lernen will, kopiert ihn dort und fügt ihn hier ein; er bleibt auf dem eigenen Gerät.

/** Übersetzung, in der die Bibel App geöffnet wird (Kennung von bible.com). */
export const BIBLE_APP = { id: 73, abbr: 'HFA', name: 'Hoffnung für alle' };

/** Buchkürzel der Textquelle (OSIS) -> Buchkürzel der Bibel App (USFM). */
const USFM = {
  Gen: 'GEN', Exod: 'EXO', Lev: 'LEV', Num: 'NUM', Deut: 'DEU', Josh: 'JOS', Judg: 'JDG', Ruth: 'RUT',
  '1Sam': '1SA', '2Sam': '2SA', '1Kgs': '1KI', '2Kgs': '2KI', '1Chr': '1CH', '2Chr': '2CH', Ezra: 'EZR',
  Neh: 'NEH', Esth: 'EST', Job: 'JOB', Ps: 'PSA', Prov: 'PRO', Eccl: 'ECC', Song: 'SNG', Isa: 'ISA',
  Jer: 'JER', Lam: 'LAM', Ezek: 'EZK', Dan: 'DAN', Hos: 'HOS', Joel: 'JOL', Amos: 'AMO', Obad: 'OBA',
  Jonah: 'JON', Mic: 'MIC', Nah: 'NAM', Hab: 'HAB', Zeph: 'ZEP', Hag: 'HAG', Zech: 'ZEC', Mal: 'MAL',
  Matt: 'MAT', Mark: 'MRK', Luke: 'LUK', John: 'JHN', Acts: 'ACT', Rom: 'ROM', '1Cor': '1CO', '2Cor': '2CO',
  Gal: 'GAL', Eph: 'EPH', Phil: 'PHP', Col: 'COL', '1Thess': '1TH', '2Thess': '2TH', '1Tim': '1TI',
  '2Tim': '2TI', Titus: 'TIT', Phlm: 'PHM', Heb: 'HEB', Jas: 'JAS', '1Pet': '1PE', '2Pet': '2PE',
  '1John': '1JN', '2John': '2JN', '3John': '3JN', Jude: 'JUD', Rev: 'REV',
};

/** "1. Johannes 4,7-19" -> { chapter: 4, from: 7, to: 19 }; "Psalm 23" -> { chapter: 23 } */
export function parseRef(ref) {
  const m = /(\d+)(?:,\s*(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/.exec(ref);
  if (!m) return null;
  const chapter = Number(m[1]);
  if (!m[2]) return { chapter };
  const from = Number(m[2]);
  return { chapter, from, to: m[3] ? Number(m[3]) : from };
}

/**
 * Link, der die Bibel App an der Stelle öffnet (ohne installierte App: bible.com im Browser).
 * book: Buchkürzel der Textquelle, ref: angezeigte Stellenangabe in deutscher Verszählung.
 */
export function bibleAppUrl(book, ref, version = BIBLE_APP) {
  const usfm = USFM[book];
  const parsed = parseRef(ref);
  if (!usfm || !parsed) return null;
  let place = `${usfm}.${parsed.chapter}`;
  if (parsed.from) place += parsed.to > parsed.from ? `.${parsed.from}-${parsed.to}` : `.${parsed.from}`;
  return `https://www.bible.com/bible/${version.id}/${place}.${version.abbr}`;
}

const REFERENCE = /\d+\s*[:,]\s*\d+(?:\s*[-–]\s*\d+)?(?:\s+\(?[A-ZÄÖÜ0-9]{2,10}\)?)?$/;
const REFERENCE_IN_BRACKETS = /\s*[([](?:\d\.?\s*)?\p{L}[\p{L}. ]*\s\d+\s*[:,]\s*\d+(?:\s*[-–]\s*\d+)?(?:\s+[A-ZÄÖÜ0-9]{2,10})?[)\]]\s*$/u;
const QUOTES = [['„', '“'], ['„', '”'], ['“', '”'], ['«', '»'], ['»', '«'], ['"', '"']];

/**
 * Macht aus einem kopierten Vers den reinen Wortlaut: entfernt Link, Stellenangabe,
 * führende Versnummer und umschliessende Anführungszeichen.
 */
export function cleanPastedVerse(input) {
  const lines = String(input ?? '').replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  const kept = lines.filter((line) => {
    if (/^https?:\/\/\S+$/i.test(line)) return false;
    if (line.length <= 60 && REFERENCE.test(line) && !/[.!?…]\s*\S{0,2}$/.test(line.replace(REFERENCE, ''))) return false;
    return true;
  });
  let text = kept.join(' ').replace(/\s+/g, ' ').trim();
  text = text.replace(REFERENCE_IN_BRACKETS, '').trim();
  text = text.replace(/^\d{1,3}\s+(?=\p{L})/u, '');
  for (const [open, close] of QUOTES) {
    if (text.length > 2 && text.startsWith(open) && text.endsWith(close)) {
      const inner = text.slice(open.length, -close.length);
      if (!inner.includes(open) && !inner.includes(close)) text = inner.trim();
      break;
    }
  }
  return text;
}
