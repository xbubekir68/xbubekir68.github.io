import * as THREE from 'three';
import { BiomeId } from '../types';
import { FORKS } from './Route';

const TREAD: Record<BiomeId, number> = { getreidegasse: 0xf5dbab, salzachufer: 0xb9b2a6, mirabellgarten: 0xe6dcc4, festung: 0xd8d0c2, daecher: 0xb5523b };

export function addRouteDetails(g: THREE.Group, index: number, delivery: boolean, fork: boolean, biome: BiomeId = 'getreidegasse'): void {
  const material = (color: number) => { const m = new THREE.MeshStandardMaterial({color,flatShading:true}); m.userData.segmentOwned = true; return m; };
  const cream = material(0xf5dbab), teal = material(0x287b74), orange = material(0xdb6548), skin = material(0xe9b085);
  const box = (w:number,h:number,d:number,x:number,y:number,z:number,m=cream) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); o.position.set(x,y,z); o.castShadow=true; g.add(o); return o; };
  // Signs are thin boards: text only on the front face, so the shoulder look shows a plain back instead of mirrored text.
  const sign = (text: string, x:number,z:number,color='#287b74',width=3.5) => {
    const c = document.createElement('canvas'); c.width=768;c.height=160;
    const ctx=c.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,768,160);ctx.fillStyle='#fff4d8';ctx.font='bold 45px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,99);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    const front=new THREE.MeshBasicMaterial({map:texture});front.userData.segmentOwned=true;
    const back=material(new THREE.Color(color).getHex());
    const board=new THREE.Mesh(new THREE.BoxGeometry(width,.72,.06),[back,back,back,back,front,back]);board.position.set(x,2.7,z);g.add(board);
    // Posts stand off the running lanes: a gantry over the road, or one post on the outer end beside it.
    if (Math.abs(x) < 2) { for (const px of [-4.15,4.15]) box(.12,3.2,.12,px,1.6,z,teal); box(8.4,.12,.12,0,3.15,z,teal); }
    else box(.09,2.6,.1,x+Math.sign(x)*(width/2-.1),1.3,z,teal);
  };
  if (delivery) {
    sign('PAKETPOST • MITTE',0,-8);
    box(1,.8,1,4.1,.4,-9,teal);
    box(.65,.55,.6,4.1,1.08,-9);
    // The recipient waits at the counter with open arms.
    box(.55,.8,.4,4.9,1.25,-9,material(0x3b6ea5));
    const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.26,0),skin);head.position.set(4.9,1.9,-9);g.add(head);
    for (const dz of [-.3,.3]) { const arm=box(.14,.6,.14,4.75,1.75,-9+dz,skin); arm.rotation.x=dz*1.6; }
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.08,6,20),teal); ring.rotation.x=Math.PI/2; ring.position.set(0,.1,-9);g.add(ring);
    sign('Danke, flink geliefert!',4.6,-13,'#a74735',2.8);
  }
  if (fork) {
    const [left, right] = FORKS[biome];
    sign(`← ${left}  |  ${right} →`,0,-1,'#287b74',5.6);
    // A continuous height profile matching terrainAt, with visible stair treads in the district's material.
    const tread = material(TREAD[biome]);
    for(let k=0;k<24;k++) {
      const local=3+k*.5+.25;const h=Math.max(.03,Math.min(1,(local-3)/3,(15-local)/3)*.65);
      box(1.8,h,.5,-2.35,h/2,-local,tread);
    }
    box(.12,.9,10,-3.3,.7,-9,teal);
    // Chevrons mark the right side as the fast lane.
    for (const z of [-5,-9,-13]) for (const s of [-1,1]) { const c=box(.9,.03,.2,2.35+s*.3,.02,z,orange); c.rotation.y=s*.7; }
    sign('Räder schieben ←  |  → Freie Fahrt',0,-15,'#a74735',5.2);
  }
  // District-specific street life beside the lanes, placed where each district has room.
  const sx = index % 2 ? -1 : 1;
  if (biome === 'mirabellgarten' && index % 3 === 0) {
    const x = sx * 6, y = .27;
    box(1.3,.65,1.5,x,y+.33,-16.3,orange); box(1.45,.14,1.7,x,y+.74,-16.3);
    for(let n=0;n<3;n++) box(.35,.35,.35,x-.4+n*.4,y+1,-16.3,teal);
    box(.48,.85,.4,x+sx*.4,y+1.3,-17.2,teal);
    const vendor=new THREE.Mesh(new THREE.IcosahedronGeometry(.27,0),skin);vendor.position.set(x+sx*.4,y+1.98,-17.2);g.add(vendor);
  } else if (biome === 'salzachufer' && index % 3 === 0) {
    box(1.9,1.9,2.6,5.2,.95,-9,teal); box(1.7,.6,.1,5.2,1.45,-7.65);
    for(let n=0;n<3;n++) box(.6,.5,.5,4.8+n*.4,.25,-7.2,orange);
    sign('BOOTSFAHRTEN',5.2,-10.4,'#287b74',2.5);
  } else if (biome === 'salzachufer' && index % 3 === 2) {
    for(let n=0;n<3;n++) {const b=box(.8,.55,.7,5.2,.28,-8-n*1.6,teal); b.rotation.y=n*.4;const flower=new THREE.Mesh(new THREE.IcosahedronGeometry(.45,0),n%2?orange:cream);flower.position.set(5.2,.8,b.position.z);g.add(flower);}
  } else if (biome === 'festung' && index % 2 === 0) {
    const wood = material(0x7a4a2a);
    for (const dz of [0,.75]) { const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.8,10),wood);barrel.position.set(sx*4.25,.4,-14-dz);g.add(barrel); }
  }
}
