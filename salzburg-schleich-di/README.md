# Salzburg: Schleich di!

Ein kostenloses 3D-Lauf- und Verfolgungsspiel für den Browser, entwickelt mit TypeScript, Three.js und Vite. Der Kurier liefert Pakete durch fünf Salzburger Viertel, während eine freche Kindergang auf E-Bikes hinterherfährt. Es gibt **keine Musik**: nur optionale Natur-, Bewegungs- und Fahrradgeräusche. Wichtige Hinweise erscheinen auch sichtbar.

## Starten

```bash
cd salzburg-schleich-di
npm install
npm run dev
```

- GitHub-Pages-Adresse: https://xbubekir68.github.io/salzburg-schleich-di/
- Produktionsbuild: `npm run build`
- Tests: `npm test`

Der Build aktualisiert wie bisher `salzburg-schleich-di/index.html` und `salzburg-schleich-di/assets/`. Die bisherige Adresse `/salzach-sprint/` leitet automatisch zur neuen Adresse weiter.

## Spielen

- `A/D` oder Pfeiltasten: Spur wechseln
- `W`, Pfeil hoch oder Leertaste: springen; auf einer Kiste oder am Mauerrand erneut drücken, um abzuspringen
- `S` oder Pfeil runter: rutschen; `P` oder `Esc`: pausieren
- `Q`: kurzer Schulterblick
- `B`: eine gesammelte Brezel für Brezel-Beni zurückwerfen
- Smartphone: wischen und die gut erreichbaren Schaltflächen für Schulterblick und Brezelwurf antippen
- Bei einer Paketpoststation durch den mittleren Ring laufen. Im Menü vor dem Start leichten Auftrag oder großen, wertvolleren Karton wählen.

Treppen, enge Gassen und Hindernisse bremsen die Radfahrer. Vor unpassierbaren Wegen halten sie an; an niedrigen Toren steigen sie ab. Auf freien Straßen beschleunigen sie. Der Vorsprung zeigt den Abstand zur nächsten aktiven Fahrerin oder zum nächsten aktiven Fahrer.

## Strecken und Fortschritt

Ein Code im Format `SD2-NAME` legt den Zufallsschlüssel der modularen Hindernisstrecke fest. Gleiche Codes und Versionen verwenden dieselbe Streckenfolge; unterschiedliche Codes erzeugen andere Hindernisse und Brezelreihen. Ergebnisse mit einer anderen Codeversion, beispielsweise `SD1`, sind nicht vergleichbar.

Bestleistung, Brezelvorrat, Outfits, Einstellungen und Challenges werden lokal im Browser gespeichert. Die vorhandenen Speicherstände mit dem Schlüssel `salzach_sprint_save_v1` bleiben lesbar. Neu erhältlich sind griffige Schuhe und eine große Pakettasche. Geräusch- und Stimmenlautstärke sowie reduzierte Bewegung lassen sich im Pausenmenü einstellen. Stimmen sind standardmäßig stumm.
