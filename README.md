# Tägliches Manna

Eine persönliche Bibel-App fürs Handy: jeden Tag eine Bibelstelle mit Hintergrundwissen, Kontext
und Gedankenanstössen, dazu ein klassischer Vers zum Auswendiglernen – verbunden mit den Predigten
und Themen von ICF Zürich.

Die App ist eine reine Webseite ohne Server und ohne Konto. Sie lässt sich wie eine App auf dem
Home-Bildschirm ablegen und funktioniert nach dem ersten Öffnen auch ohne Netz.

## Was die App kann

**Heute** – Die Bibelstelle des Tages zum Lesen direkt in der App, mit

- Hintergrund (Zeit, Kultur, Wortbedeutungen) und einer Kurzeinführung ins jeweilige Buch,
- Kontext (was davor und danach steht),
- Kerngedanke, zwei Fragen zum Weiterdenken, einem konkreten Schritt für den Tag und einem Gebet,
- einem Feld für eigene Notizen und einem Link zur Stelle in einer modernen Übersetzung.

**Lernvers** – Ein Vers pro Tag, passend zur Bibelstelle. Geübt wird in fünf Stufen: Lesen,
Lückentext (drei Schwierigkeiten), Anfangsbuchstaben, Auswendig aufsagen, Eintippen mit Prüfung.
Nach deiner Einschätzung («Noch nicht», «Fast», «Sitzt») kommt der Vers in wachsenden Abständen
zur Wiederholung zurück (1, 2, 4, 7, 14, 30, 60, 120 Tage).

**ICF** – Die aktuelle Predigt von ICF Zürich mit Serie und Kurzbeschreibung, zum Anhören oder
Ansehen direkt in der App. Dazu frühere Predigten, die neuesten Videos vom YouTube-Kanal, eine
Suche nach Predigten zum Wochenthema des Leseplans und Predigtnotizen pro Kalenderwoche.

**Mein Weg** – Überblick über den ganzen Leseplan, Serie der Tage in Folge, Einstellungen
(Übersetzung, Startdatum) und eine Sicherung des Fortschritts zum Mitnehmen auf ein anderes Gerät.

Der Leseplan umfasst 13 Wochen mit je einem Thema (91 Tage):
Gottes Liebe · Identität · Gebet · Vertrauen · Begegnungen mit Jesus · Heiliger Geist · Glaube ·
Gnade · Weisheit · Nachfolge · Anbetung · Gemeinschaft · Hoffnung.
Danach beginnt er von vorn; die Lernverse kommen dann als Wiederholung.

## Aufs Handy bringen

1. Auf GitHub im Repository **Settings → Pages** öffnen und bei **Source** den Eintrag
   **GitHub Actions** wählen.
2. Unter **Actions → App veröffentlichen → Run workflow** den Ablauf einmal starten
   (oder eine beliebige Änderung pushen).
3. Die App ist danach unter `https://nicolugip-oss.github.io/bible_project/` erreichbar.
4. Auf dem Handy öffnen und zum Home-Bildschirm hinzufügen
   (iPhone: Teilen → «Zum Home-Bildschirm», Android: Menü → «App installieren»).

Der Ablauf läuft danach einmal täglich von selbst und holt dabei die neuesten Predigten und
Videos von ICF Zürich.
Hinweis: GitHub pausiert zeitgesteuerte Abläufe, wenn im Repository 60 Tage lang nichts geändert
wurde. Ein Klick auf «Run workflow» setzt sie wieder in Gang.

Dein Fortschritt (gelesene Tage, Notizen, Lernstände) wird nur im Browser deines Geräts
gespeichert. Unter **Mein Weg → Sicherung** kannst du ihn kopieren und auf einem anderen Gerät
wieder einfügen.

## Am Computer ausprobieren

Voraussetzung ist Node.js ab Version 20. Es müssen keine Pakete installiert werden.

```bash
npm start
```

Danach `http://localhost:4173` im Browser öffnen.

```bash
npm test
```

prüft Datumslogik, Lerntrainer, Leseplan und Datenaufbereitung.

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `index.html`, `css/`, `js/` | die App (ohne Framework, ohne Build-Schritt) |
| `content/weeks/` | die Texte des Leseplans, eine Datei pro Woche |
| `content/books.json` | Kurzeinführungen in die biblischen Bücher |
| `content/icf.json` | Kanal und Links von ICF Zürich |
| `data/` | daraus erzeugte Dateien, die die App lädt |
| `scripts/` | Datenaufbereitung, Videoabruf, lokaler Server |
| `tests/` | automatische Tests |

## Leseplan erweitern

Eine Woche ist eine Datei in `content/weeks/` mit sieben Tagen. Ein Tag sieht so aus:

```json
{
  "ref": "Psalm 46",
  "src": "Ps 46",
  "shift": 1,
  "title": "Eine feste Burg",
  "background": "…",
  "context": "…",
  "insight": "…",
  "questions": ["…", "…"],
  "action": "…",
  "prayer": "…",
  "verse": { "ref": "Psalm 46,2", "src": "Ps 46:1", "trim": { "luth1912": { "from": "Gott ist unsre Zuversicht" } } }
}
```

- `ref` ist die Stellenangabe, wie sie angezeigt und verlinkt wird (deutsche Verszählung).
- `src` ist dieselbe Stelle in der Zählung der Textquelle (englische Zählung, Buchkürzel wie
  `Gen`, `Ps`, `Matt`, `1Cor`). Bei Psalmen mit Überschrift weicht sie um einen oder zwei Verse ab;
  `shift` gleicht das für die Anzeige aus.
- `trim` schneidet beim Lernvers einen Satzanfang oder ein Satzende weg (`from` / `to`).

Nach dem Bearbeiten die Daten neu erzeugen:

```bash
npm run build:data
```

Mit `node scripts/build-data.mjs --review` werden zusätzlich alle Lernverse und die Grenzen der
Abschnitte ausgegeben. Das Skript bricht ab, wenn ein Feld fehlt oder eine Stelle nicht existiert.

## Bibeltexte und Quellen

- In der App enthalten sind die **Lutherbibel 1912** und die **Elberfelder 1905**. Beide sind
  gemeinfrei. Die Texte stammen aus dem offenen Datensatz
  [midvash/bible-data](https://github.com/midvash/bible-data) und werden beim Aufbereiten einmalig
  geladen. Die Digitalisate enthalten vereinzelt Tippfehler; die gefundenen sind in
  `scripts/build-data.mjs` (`SOURCE_FIXES`) korrigiert.
- Moderne Übersetzungen (Hoffnung für alle, Luther 2017, Neue Genfer Übersetzung, Zürcher Bibel
  und weitere) sind urheberrechtlich geschützt. Sie sind deshalb nicht enthalten, sondern pro
  Bibelstelle auf [BibleServer](https://www.bibleserver.com) verlinkt.
- Die Erklärungen, Fragen und Gebete sind für diese App geschrieben. Sie sind eine Lesehilfe und
  ersetzen weder das eigene Lesen noch das Gespräch in der Smallgroup.

## ICF Zürich

Diese App ist ein privates Projekt und kein offizielles Angebot von ICF Zürich. Sie verlinkt
öffentlich zugängliche Inhalte: Der Ablauf `App veröffentlichen` liest den Podcast-Feed mit den
Predigten und den Video-Feed des YouTube-Kanals. Er legt Titel, Datum, Serie, Kurzbeschreibung und
die Adressen von Audio und Video in `data/icf.json` ab. Abgespielt wird über die Server von
ICF Zürich beziehungsweise über YouTube; die App speichert keine Predigten.

Schlägt der Abruf einmal fehl, bleibt die zuletzt geholte Liste bestehen.
