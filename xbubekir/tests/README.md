# Prüfungen für xbubekir

Node.js 22 oder neuer. Die App selbst braucht weiterhin keinen Build-Schritt.

```sh
node --check xbubekir/app.js
node --check xbubekir/conversation.js
node --check xbubekir/sw.js
node xbubekir/training/check_dataset.mjs
node xbubekir/tests/conversation.test.mjs
node xbubekir/tests/quality.test.mjs
```

Die Datensatzprüfung schlägt bei gemeinsamen Dialogen, gemeinsamen Gruppen, doppelten Prüffällen, falschem Manifest oder abweichendem Browser-System-Prompt fehl. Nach Änderungen an den Quelldaten zuerst `node xbubekir/training/make_dataset.mjs` ausführen. Ein erneuter Lauf muss dieselben Dateien erzeugen.

## Browser

Die Tests nutzen Chromium und Playwright. Alle externen Anfragen werden abgefangen. Die Modellantworten sind Testdaten, keine gemessenen Antworten eines echten Modells. Tests laufen in einem frischen Browserprofil und verändern keine vorhandenen Chats.

Beispiel für eine lokale, außerhalb des Projekts installierte Testumgebung:

```sh
npm install --prefix /tmp/xb-test-deps playwright@1.62.1 axe-core@4.11.0
# Terminal 1, im Repository-Hauptverzeichnis:
python -m http.server 8765 --bind 127.0.0.1
# Terminal 2:
NODE_PATH=/tmp/xb-test-deps/node_modules \
XBU_AXE_PATH=/tmp/xb-test-deps/node_modules/axe-core/axe.min.js \
CHROMIUM_PATH=/usr/bin/chromium \
node xbubekir/tests/ui.cjs
```

`CHROMIUM_PATH` bei Bedarf anpassen. `XBU_TEST_URL` überschreibt die lokale Testadresse, `XBU_TEST_ARTIFACTS` das Ausgabeziel (Standard `/tmp/xbubekir-ui`). Ohne `XBU_AXE_PATH` werden die vier axe-Prüfungen ausgelassen.

Abgedeckt sind Code-Escaping und Kopieren, Quellenbezüge, erhaltene Eingabeentwürfe, fehlgeschlagene und erfolgreiche Regeneration, persistierte Varianten, Bearbeiten als eigener Chat, Modellwechsel, Speicher-/Clipboardfehler, Escape, mobile Ansichten und 200-%-Zoom. Axe prüft WCAG-2-A/AA-, 2.1-AA- und 2.2-AA-Regeln in Einstieg, Desktop-Chat, mobilem Chat und Einstellungen. Das ersetzt keine vollständige manuelle Screenreader-Prüfung.

## Modellqualität

Die zwölf unabhängigen Aufgaben und das Ergebnisformat stehen in [training/README.md](../training/README.md). Browser-Tests prüfen Bedienung und Darstellung; sie behaupten keine Verbesserung der tatsächlich generierten Antworten. Der neue Trainingslauf und die separate Bewertung von Cloud- und quantisierten Browser-Modellen sind nachgelagert.
