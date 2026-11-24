# Salzach Sprint

Ein 3D-Browserspiel durch Salzburg, umgesetzt mit **TypeScript, Vite und Three.js** – komplett ohne Musikthema, Melodien oder Jingles.

## Spielidee
Als junger Fahrradkurier zu Fuß musst du ein dringendes Paket durch die Salzburger Altstadt zustellen. Vor einer Konfektstube stößt du versehentlich eine riesige Schokokugel mit abgerissener Goldfolie um – und nun rollt sie dir quer durch fünf Salzburger Abschnitte hinterher:

1. **Getreidegasse** – Schmale Altstadtgasse mit bunten Fassaden, schmiedeeisernen Auslegern und Marktständen
2. **Salzachufer** – Uferpromenade entlang der Salzach mit Brücken, Bänken, Fahrrädern und Blick auf die Festung
3. **Mirabellgarten** – Symmetrische Hecken, Blumenbeete, Brunnen und Steinfiguren
4. **Festung Hohensalzburg** – Helle Steinmauern, Zinnen, Burghöfe und Rampen
5. **Altstadtdächer** – Kupferkuppeln, Schornsteine und überspringbare Dachlücken

## Starten & Bauen

```bash
cd salzach-sprint
npm install
npm run dev
```

- **Online spielen (GitHub Pages):** https://xbubekir68.github.io/salzach-sprint/
- **Entwicklungsserver:** `npm run dev` (öffnet lokal standardmäßig unter `http://localhost:5173/`)
- **Produktions-Build (aktualisiert `index.html` & `assets/` für GitHub Pages):** `npm run build`
- **Tests ausführen:** `npm test`

## Steuerung

### Tastatur (Desktop)
- **Links / Rechts (`A` / `D` oder `◀` / `▶`):** Spurwechsel
- **Oben / Leertaste (`W` / `▲` / `Space`):** Springen
- **Unten (`S` / `▼`):** Rutschen (in der Luft: schnelles Abrollen nach unten)
- **`P` oder `Esc`:** Spiel pausieren / fortsetzen

### Smartphone & Tablet
- **Nach links / rechts wischen:** Spurwechsel
- **Nach oben wischen:** Springen
- **Nach unten wischen:** Rutschen
