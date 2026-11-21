// Sprachmodus mit Gemini Live (app.js): nimmt den Mikrofon-Ton, rechnet ihn auf 16 kHz um und gibt alle 40 ms ein Stück
// 16-Bit-PCM an die App weiter. Läuft im Audio-Thread des Browsers, damit nichts hakt, während die Seite beschäftigt ist.
class Mic extends AudioWorkletProcessor{
  constructor(){super();this.step=sampleRate/16000;this.pos=0;this.prev=0;this.out=new Int16Array(640);this.n=0}
  process([input]){
    const ch=input[0];
    if(!ch)return true;
    // lineare Zwischenwerte; pos zählt ab dem letzten Wert des vorigen Blocks (prev), damit an der Blockgrenze nichts springt
    for(;this.pos<ch.length;this.pos+=this.step){
      const i=Math.floor(this.pos),f=this.pos-i,a=i<1?this.prev:ch[i-1],b=ch[i];
      const v=Math.max(-1,Math.min(1,a+(b-a)*f));
      this.out[this.n++]=v<0?v*32768:v*32767;
      if(this.n===this.out.length){this.port.postMessage(this.out.buffer,[this.out.buffer]);this.out=new Int16Array(640);this.n=0}
    }
    this.pos-=ch.length;this.prev=ch[ch.length-1];
    return true;
  }
}
registerProcessor("xb-mic",Mic);
