// Selbsttest für voice-worklet.js (Sprachmodus mit Gemini Live): node xbubekir/tools/voice-worklet-test.mjs
// Schickt eine Sekunde 440-Hz-Ton in drei üblichen Mikrofon-Raten durch das Worklet und prüft, dass 16 kHz herauskommen und der Ton stimmt.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../voice-worklet.js", import.meta.url), "utf8");
for (const rate of [48000, 44100, 16000]) {
  let P;
  const out = [];
  globalThis.sampleRate = rate;
  globalThis.AudioWorkletProcessor = class { constructor() { this.port = { postMessage: (b) => out.push(...new Int16Array(b)) }; } };
  globalThis.registerProcessor = (_, c) => { P = c; };
  new Function(src)();
  const p = new P(), f = 440, step = rate / 16000;
  for (let o = 0; o < rate; o += 128) { // der Browser liefert Blöcke zu 128 Werten
    const ch = new Float32Array(Math.min(128, rate - o));
    for (let i = 0; i < ch.length; i++) ch[i] = 0.5 * Math.sin(2 * Math.PI * f * (o + i) / rate);
    p.process([[ch]]);
  }
  assert.ok(out.length > 16000 - 640 && out.length <= 16000, `${rate} Hz: etwa 16000 Werte pro Sekunde (${out.length})`);
  let err = 0; // Ausgabe k entspricht Eingabe k·step−1: ein Wert Verzögerung (bei 48 kHz 0,02 ms), sonst gleich
  for (let k = 1; k < out.length; k++) err = Math.max(err, Math.abs(out[k] - 0.5 * Math.sin(2 * Math.PI * f * (k * step - 1) / rate) * 32767));
  assert.ok(err < 60, `${rate} Hz: Ton bleibt erhalten (Abweichung ${Math.round(err)})`);
}
console.log("voice-worklet: alle Prüfungen bestanden");
