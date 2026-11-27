---
name: xbubekir
description: Ruhiges dunkles Chat-Werkzeug, neutrale Flächen, Lila nur als Akzent.
colors:
  side: "#17161a"
  bg: "#1e1d22"
  raise: "#29282e"
  raise2: "#34333a"
  field: "#141317"
  code: "#151418"
  ink: "#ededf0"
  soft: "#c3c1cb"
  mute: "#9a97a4"
  line: "rgba(255,255,255,.08)"
  line2: "rgba(255,255,255,.13)"
  line3: "rgba(255,255,255,.22)"
  hov: "rgba(255,255,255,.05)"
  sel: "rgba(255,255,255,.085)"
  acc: "#7c3aed"
  acch: "#8b4cf7"
  acc2: "#a78bfa"
  acct: "rgba(139,92,246,.22)"
  on: "#ffffff"
  bad: "#f2a091"
  badl: "rgba(242,160,145,.07)"
typography:
  headline:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "32px"
    fontWeight: 450
    lineHeight: 1.2
    letterSpacing: "-.022em"
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    letterSpacing: "-.015em"
  title-sm:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    letterSpacing: "-.01em"
  body-reading:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16.5px"
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  chrome:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  group:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 500
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: ".86em"
  arabic:
    fontFamily: "Geeza Pro, Noto Naskh Arabic, Sakkal Majalla, Segoe UI, Noto Sans Arabic, Tahoma, sans-serif"
    fontSize: "1.22em"
    lineHeight: 1.5
rounded:
  xs: "5px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  bubble: "18px"
  composer: "20px"
  full: "50%"
spacing:
  pad: "32px"
  pad-tablet: "24px"
  pad-phone: "14px"
  col: "720px"
  sw: "264px"
  sw-wide: "272px"
  sw-tablet: "248px"
  row: "10px"
components:
  button-send:
    backgroundColor: "{colors.acc}"
    textColor: "{colors.on}"
    rounded: "{rounded.md}"
    size: "36px"
  button-send-hover:
    backgroundColor: "{colors.acch}"
  button-send-disabled:
    backgroundColor: "{colors.raise2}"
    textColor: "{colors.mute}"
  button-stop:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.bg}"
  button-primary:
    backgroundColor: "{colors.acc}"
    textColor: "{colors.on}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.acch}"
  button-secondary:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "42px"
  button-icon:
    textColor: "{colors.soft}"
    rounded: "{rounded.md}"
    size: "40px"
  button-icon-hover:
    backgroundColor: "{colors.hov}"
    textColor: "{colors.ink}"
  action-mini:
    textColor: "{colors.mute}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 9px"
    height: "32px"
  composer:
    backgroundColor: "{colors.raise}"
    rounded: "{rounded.composer}"
    padding: "10px 10px 8px"
  bubble-user:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.ink}"
    rounded: "{rounded.bubble}"
    padding: "9px 16px"
  input-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  list-row:
    textColor: "{colors.soft}"
    rounded: "{rounded.sm}"
    padding: "7px 10px"
  list-row-hover:
    backgroundColor: "{colors.hov}"
    textColor: "{colors.ink}"
  list-row-selected:
    backgroundColor: "{colors.sel}"
    textColor: "{colors.ink}"
  dialog:
    backgroundColor: "{colors.raise}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    width: "min(560px, calc(100% - 24px))"
---

# Design System: xbubekir

## Overview

**Creative North Star: "Die stille Werkbank"**

xbubekir ist ein Arbeitswerkzeug, das sich zurücknimmt: eine neutrale dunkle Hülle, Antworten als ruhiger Lesetext und die Eingabe-Karte als einziges hervorgehobenes Objekt. Der Maßstab für Aufbau und Handwerk ist bewusst die Claude-App, also der Kanon der Kategorie, gerade gespielt statt eines eigenen Stils. Das Lila ist kein Grundton, sondern ein Zeiger: Es markiert, wo gehandelt wird (Senden), wo der Fokus liegt und was ausgewählt ist.

Die Flächen sind fast schwarzes Grau mit einem kaum spürbaren violetten Unterton und staffeln sich in drei Stufen: Seitenleiste am dunkelsten, Hauptbereich eine Stufe heller, Karten und Fenster noch eine Stufe heller. Getrennt wird mit Haarlinien aus Weiß bei 8 bis 22 Prozent, nicht mit Farbe. Die Chrome ist dicht und leise (14 bis 15px), der Lesetext großzügig (16,5px, Zeilenhöhe 1,7, höchstens 34em breit).

Bewusst abgelehnt ist der frühere Neon-Look: Bögen, Leuchten und Verläufe als Dekor, Verlaufs-Knöpfe, Glas und das übergroße zentrierte Logo als Startbild.

**Key Characteristics:**
- Nur dunkel, drei Flächenstufen, Haarlinien statt Farbflächen.
- Lila nur auf Senden, Hauptknopf, Fokus, Auswahlmarken, Links, Fortschritt und Markenzeichen.
- Eine Schriftfamilie (System-Sans), Arabisch mit eigener Schrift und größer gesetzt.
- Tiefe nur auf Eingabe-Karte, Fenstern und schwebenden Hinweisen.
- Werkzeuge erscheinen still: Zeilen und Symbolknöpfe ohne Rahmen, Hover nur als leichte Aufhellung.

## Colors

Neutrale Graustufen mit violettem Unterton (Farbton um 293°, Chroma unter 0,02) und ein einziger kräftiger Violett-Akzent.

### Primary
- **Werkbank-Violett** (`acc`): Füllung des Senden-Knopfs, des Hauptknopfs (`.btn`), der gewählten Gehirn-Marke und der Häkchen in Einstellungen. Die einzige gesättigte Fläche auf dem Bildschirm.
- **Violett, aufgehellt** (`acch`): nur Hover-Zustand von Senden und Hauptknopf.
- **Lavendel-Zeiger** (`acc2`): Fokusring (2px, Abstand 2px), Fokusrahmen von Feldern, Links, Eingabe-Cursor und Fortschrittsbalken. Hell genug, um als Linie auf dunklem Grund zu lesen.
- **Lavendel-Schleier** (`acct`): 3px-Fokushof um Formularfelder. Die Textauswahl nutzt denselben Ton bei 40 Prozent.

### Neutral
- **Seitenleisten-Nacht** (`side`): Seitenleiste, Handy-Schublade, Ladeleiste.
- **Arbeitsgrund** (`bg`): Hauptbereich und Seiten-Hintergrund, auch `theme-color`.
- **Karten-Grau** (`raise`): Eingabe-Karte, eigene Nachrichtenblase, Fenster, Anmelde-Karte.
- **Karten-Grau, hoch** (`raise2`): gedrückter Abschnitt im Segment-Schalter, Hinweis-Toast, Bild-Entfernen-Knopf, deaktivierter Senden-Knopf.
- **Feld-Tiefe** (`field`) und **Code-Tiefe** (`code`): eingelassene Flächen, dunkler als ihr Umfeld: Formularfelder, Segment-Rahmen, Codeblöcke.
- **Tinte** (`ink`): Fließtext, Titel, aktive Zeilen.
- **Leise Tinte** (`soft`): Symbolfarbe, inaktive Chatzeilen, Labels, Zitate.
- **Stumm** (`mute`): Metadaten, Gruppenüberschriften, Platzhalter, Antwort-Aktionen.
- **Haarlinien** (`line`, `line2`, `line3`): Trennlinien und Kartenränder; `line2` für Felder und Karten, `line3` für Fokus innerhalb der Eingabe-Karte und Zitatbalken.
- **Hover und Auswahl** (`hov`, `sel`): weiße Schleier für Hover und die aktuelle Zeile.

### Fehler
- **Gedämpftes Korall** (`bad`, `badl`): Fehlertext, Löschen-Hover, Gefahrenbereich. Pastellig gehalten, damit Fehler sichtbar sind, ohne zu schreien.

### Named Rules
**The Zeiger Rule.** Violett zeigt nur auf Handlung, Fokus oder Auswahl. Keine violetten Flächen, Ränder oder Hintergründe zur Stimmung.

**The Drei-Stufen Rule.** Flächen steigen nur in den Stufen `side`, `bg`, `raise` (`raise2` innerhalb von Karten). Eingelassenes (Felder, Code) geht eine Stufe unter das Umfeld.

## Typography

**Body Font:** System-Sans (`system-ui`, mit `-apple-system`, Segoe UI, Roboto)
**Mono Font:** `ui-monospace` (mit SFMono-Regular, Menlo, Consolas)
**Arabisch:** Geeza Pro, Noto Naskh Arabic, Sakkal Majalla (mit Segoe UI, Noto Sans Arabic, Tahoma)

**Character:** Eine einzige, plattformeigene Sans für alles; die Hierarchie entsteht über Größe, Gewicht und Grauwert, nicht über einen Schriftwechsel.

### Hierarchy
- **Headline** (450, 32px, 1,2, -0,022em): nur die Begrüßung auf dem Startbild; am Handy und auf niedrigen Bildschirmen 26px, im Querformat 21px.
- **Title** (600, 22px, -0,015em): Überschrift der Anmelde- und Einrichtungskarte.
- **Title klein** (600, 18px, -0,01em): Fenstertitel; im Gehirn-Blatt 16px.
- **Body Lesetext** (400, 16,5px, 1,7): Antworten. Absätze, Listen und Zitate höchstens 34em breit; am Handy 16px.
- **Body** (400, 16px, 1,55): Grundtext, Felder, eigene Nachrichten (16,5px, 1,55).
- **Chrome** (400 bis 500, 14 bis 14,5px): Seitenleisten-Zeilen, Suche, Labels, Hinweise.
- **Label** (400, 13 bis 13,5px): Antwort-Aktionen, Gehirn-Angabe, Unterzeilen.
- **Gruppe** (500, 12px, `mute`): Datumsgruppen der Chatliste und Abschnitte im Gehirn-Blatt; normal geschrieben, keine Versalien.
- **Antwort-Überschriften** (600, 1,25em / 1,12em / 1em, 1,3): Überschriften im Markdown.

### Named Rules
**The Lesetext Rule.** Antworten sind Lesetext: 16,5px, Zeilenhöhe 1,7, Fließtextblöcke höchstens 34em. Tabellen und Code dürfen breiter laufen, bis zur Spalte (`col`).

**The Arabisch Rule.** Alles mit `lang=ar` bekommt die arabische Schrift bei 1,22em und Zeilenhöhe 1,5, damit Harakat Platz haben.

**The Tabellenziffern Rule.** Tabellen setzen Ziffern tabellarisch (`font-variant-numeric: tabular-nums`) bei 0,93em.

## Layout

Am PC ein Raster aus Seitenleiste (`sw`: 264px, ab 1200px 272px, zwischen 900 und 1199px 248px) und Hauptbereich. Gesprächsverlauf und Eingabe-Karte teilen eine zentrierte Spalte von höchstens 720px (`col`) mit Seitenrand `pad` (32px, Tablet 24px, Handy 14px). Auf dem Startbild steht der Begrüßungsblock mit der Eingabe-Karte leicht über der Mitte (unten 12vh frei).

Unter 900px Breite (oder flach mit Touch) verschwindet die Seitenleiste: eine 52px-Kopfleiste mit Menü, Schriftzug oder Chattitel und Neuer Chat, die Chats als Schublade von links (höchstens 320px), auf dem Startbild die letzten drei Chats als umrandete Karten, die Eingabe-Karte unten. Gehirn-Blatt und Einstellungen werden am Handy zum Blatt von unten bzw. Vollbild.

Rhythmus: Zeilenabstand innerhalb von Listen 1px, Nachrichten 30px auseinander, Innenabstand von Zeilen 10px seitlich. Touch-Ziele werden bei `pointer:coarse` auf 40 bis 44px vergrößert.

## Elevation & Depth

Flach durch Tonstufen. Schatten tragen nur Objekte, die über dem Verlauf schweben: die Eingabe-Karte, Fenster, der Nach-unten-Knopf und der Toast. Alle Schatten sind weich, schwarz und nach unten versetzt, nie farbig.

### Shadow Vocabulary
- **Karte** (`box-shadow: 0 1px 3px rgba(0,0,0,.18), 0 10px 30px rgba(0,0,0,.22)`): Eingabe-Karte.
- **Fenster** (`box-shadow: 0 24px 64px rgba(0,0,0,.5)`): Dialoge, mit Abdunklung `rgb(0 0 0/.55)` dahinter.
- **Schwebend** (`box-shadow: 0 4px 14px rgba(0,0,0,.35)`): Nach-unten-Knopf.
- **Toast** (`box-shadow: 0 10px 30px rgba(0,0,0,.45)`): kurze Hinweise.
- **Segment** (`box-shadow: 0 1px 2px rgba(0,0,0,.3)`): gedrückter Abschnitt im Segment-Schalter.

### Named Rules
**The Eine-Karte Rule.** Im Hauptbereich trägt nur die Eingabe-Karte Schatten. Nachrichten, Codeblöcke und Tabellen bleiben flach und werden höchstens mit Haarlinie gefasst.

## Shapes

Weich gerundete Rechtecke in einer Stufung nach Größe: 5px für Inline-Code, 7 bis 8px für Listenzeilen und kleine Aktionen, 10px für alle Knöpfe und Felder, 12px für Codeblöcke, Fehlerkarten und Bilder, 16px für Fenster und Anmeldekarte, 18px für die Nachrichtenblase, 20px für die Eingabe-Karte (am Handy 18px). Kreise nur für Nach-unten-Knopf, Bild-Entfernen und Auswahlmarken. Ränder sind 1px-Haarlinien; Zitate und Gedankengang tragen eine 2px-Linie am Anfang.

## Components

### Buttons
Still und flach; nur zwei Knöpfe sind gefüllt.
- **Senden:** 36px-Quadrat, `rounded.md`, `acc` mit weißem Pfeil, Hover `acch`. Leer deaktiviert in `raise2` mit `mute`. Während einer Antwort wird er zum Anhalten-Knopf in `ink` auf `bg`.
- **Hauptknopf (`.btn`):** mindestens 42px hoch, `acc`, 15px, 600. Deaktiviert bei 50 Prozent Deckkraft.
- **Zweitknopf (`.btn.alt`):** ohne Füllung, innere Haarlinie `line2`, Hover `hov`.
- **Symbolknopf:** 40px (in der Karte 36px), ohne Rahmen, `soft`, Hover `hov` und `ink`.
- **Gefahr:** Korall-Rand bei 40 Prozent, Korall-Text, Hover `badl`.
- Übergänge 0,15s auf Hintergrund und Farbe.

### Eingabe-Karte (Signatur)
Das eine hervorgehobene Objekt: `raise`, Rand `line2`, 20px Rundung, Kartenschatten. Oben das Textfeld (16,5px, 46px hoch, wächst bis 40vh), darunter die Werkzeugleiste: Bild anhängen links, rechts die Gehirn-Angabe als stiller Textknopf (13,5px, `soft`, mit Pfeil) und Senden. Fokus innerhalb der Karte hebt nur den Rand auf `line3`, kein violetter Ring. Angehängte Bilder als 56px-Vorschauen mit rundem Entfernen-Knopf.

### Nachrichten
- **Eigene Nachricht:** rechts, Blase `raise`, 18px Rundung, höchstens 80 Prozent breit, Bilder darüber.
- **Antwort:** ohne Fläche, direkt als Lesetext. Darunter Antwort-Aktionen (Kopieren, Nochmal, Weiter) als kleine Textknöpfe in `mute`; mit Maus erst bei Hover sichtbar, die letzte Antwort mit Nochmal immer.
- **Gedankengang:** einklappbar, 14px `mute`, Inhalt mit 2px-Linie `line2` am Anfang.
- **Code:** Block in `code`, Rand `line`, 12px Rundung; Inline-Code auf weißem Schleier bei 7 Prozent.
- **Tabellen:** Rahmen `line` bei 10px Rundung, Kopf in `soft` auf leichtem Schleier, Ziffern tabellarisch.
- **Fehler:** Karte auf `badl` mit Korall-Rand, kurzer Text, Knöpfe, Originalmeldung eingeklappt.

### Inputs / Fields
- **Style:** `field`, Rand `line2`, 10px Rundung, 16px Schrift.
- **Focus:** Rand `acc2` plus 3px-Hof `acct`.
- **Suche in der Seitenleiste:** ohne Rand und Fläche, bis Hover (`hov`) oder Fokus (`field` mit Rand `line2`).
- **Auswahl:** Checkboxen in `accent-color: acc`; Segment-Schalter in `field` mit gedrücktem Abschnitt in `raise2`.

### Navigation
- **Seitenleiste:** Schriftzug oben, Neuer Chat und Suche als rahmenlose 38px-Zeilen, Chatliste nach Datum gruppiert, Einstellungen unten über einer Haarlinie.
- **Chatzeile:** 14px, `soft`, 8px Rundung; Hover `hov`, aktuelle Zeile `sel`, beide in `ink`. Löschen erscheint erst bei Hover oder Auswahl (bei Touch immer, 44px).
- **Gehirn-Blatt:** Zeilen mit Name und Unterzeile; die gewählte Zeile auf `sel` mit gefülltem violettem Kreis und Häkchen.

### Willkommensseite
Nur beim allerersten Öffnen, vor der Anmeldung. Ohne Seitenleiste, am PC Text links und Beispiel-Chat rechts (höchstens 1100px), am Handy eine Spalte mit „Anmelden“ unten fest (Leiste in `bg` mit Haarlinie). Überschrift zweistufig statt Verlauf: „Eine KI.“ in `ink`, „Viele Gehirne.“ in `mute` (500, 38 bis 56px, am Handy 32 bis 40px). Der Beispiel-Chat liegt auf einer Fläche in `side` mit Haarlinie und 22px Rundung, darin der Segment-Schalter „Wer denkt für xbubekir?“, Blase und Lesetext wie im Chat und die Eingabe-Karte als einziges Objekt mit Schatten; Senden wird `acc`, sobald getippt wird, der Tipp-Strich ist `acc2`. „Was xbubekir kann“: vier Zeilen mit Symbol in 38px-Feld (`raise`, Haarlinie, `soft`), keine Karten. Violett nur auf „Anmelden“, Senden und dem Tipp-Strich.

### Motion
Fenster erscheinen mit 0,18s (`cubic-bezier(.2,.8,.3,1)`, 6px Anhebung), die Schublade gleitet in 0,22s, das Handy-Blatt steigt in 0,24s. Wartezustände pulsieren sanft. Bei `prefers-reduced-motion: reduce` entfallen Pulsieren und Ladeanimation, Fenster-Animationen laufen nur ohne diese Einstellung.

## Do's and Don'ts

### Do:
- **Do** Violett (`acc`, `acc2`) nur für Senden, den Hauptknopf, Fokus, Auswahlmarken, Links, Fortschritt und Markenzeichen einsetzen.
- **Do** Flächen in den Stufen `side`, `bg`, `raise`, `raise2` staffeln und mit Haarlinien (`line` bis `line3`) trennen.
- **Do** Antworten als Lesetext ohne Fläche setzen: 16,5px, Zeilenhöhe 1,7, Fließtextblöcke höchstens 34em.
- **Do** Symbole als Inline-SVG mit Kontur (1,6 bis 2,4) in `currentColor` zeichnen.
- **Do** Werkzeuge rahmenlos halten und Hover nur als `hov` zeigen; die Auswahl als `sel`.
- **Do** Touch-Ziele bei `pointer:coarse` auf mindestens 40 bis 44px bringen.

### Don't:
- **Don't** Leuchten, Neon-Bögen, Glas oder Verläufe als Dekor auf Oberflächen legen. Der einzige Verlauf ist der funktionale Ladeschimmer im Fortschrittsbalken.
- **Don't** Knöpfe mit Verlauf füllen oder violette Flächen als Hintergrund, Kartenrand oder Stimmung verwenden.
- **Don't** das Logo als großes zentriertes Startbild zeigen; die Marke `xbu` bleibt klein (84px, am Handy 68px) über der Begrüßung.
- **Don't** Schatten auf Nachrichten, Codeblöcke oder Tabellen setzen; Tiefe gehört der Eingabe-Karte, Fenstern und Schwebendem.
- **Don't** einen hellen Modus oder helle Flächen einführen.
- **Don't** Überzeilen in Versalien über Überschriften stellen; Gruppen heißen normal geschrieben in 12px `mute`.
