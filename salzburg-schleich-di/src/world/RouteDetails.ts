import * as THREE from 'three';

export function addRouteDetails(g: THREE.Group, index: number, delivery: boolean, fork: boolean): void {
  const material = (color: number) => { const m = new THREE.MeshStandardMaterial({color,flatShading:true}); m.userData.segmentOwned = true; return m; };
  const cream = material(0xf5dbab), teal = material(0x287b74), orange = material(0xdb6548);
  const box = (w:number,h:number,d:number,x:number,y:number,z:number,m=cream) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); o.position.set(x,y,z); o.castShadow=true; g.add(o); return o; };
  const sign = (text: string, x:number,z:number,color='#287b74',width=3.5) => {
    const c = document.createElement('canvas'); c.width=768;c.height=160;
    const ctx=c.getContext('2d')!;ctx.fillStyle=color;ctx.fillRect(0,0,768,160);ctx.fillStyle='#fff4d8';ctx.font='bold 45px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,99);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});m.userData.segmentOwned=true;
    const board=new THREE.Mesh(new THREE.PlaneGeometry(width,.72),m);board.position.set(x,2.7,z);g.add(board);
    box(.09,2.6,.1,x-width/2+.1,1.3,z,teal);
  };
  if (delivery) {
    sign('PAKETPOST • MITTE',0,-8);
    box(1,.8,1,4.1,.4,-9,teal);
    box(.65,.55,.6,4.1,1.08,-9);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.08,6,20),teal); ring.rotation.x=Math.PI/2; ring.position.set(0,.1,-9);g.add(ring);
    sign('Danke, flink geliefert!',4.6,-13,'#a74735',2.8);
  }
  if (fork) {
    sign('← TREPPE  |  STRASSE →',0,-1);
    // A continuous height profile matching terrainAt, with visible stair treads.
    for(let k=0;k<24;k++) {
      const local=3+k*.5+.25;const h=Math.max(.03,Math.min(1,(local-3)/3,(15-local)/3)*.65);
      box(1.8,h,.5,-2.35,h/2,-local);
    }
    box(.12,.9,10,-3.3,.7,-9,teal);
    sign('Schieben!  /  Freie Fahrt →',0,-15,'#a74735');
  }
  // Alternating little street vignettes leave the playable lanes entirely readable.
  if (index % 4 === 0) {
    box(1.3,.65,1.5,5,.33,-8,orange); box(1.45,.14,1.7,5,.74,-8);
    for(let n=0;n<3;n++) box(.35,.35,.35,4.6+n*.4,1,-8,teal);
    sign('Brezeln bleiben hier!',5,-9,'#a74735',2.7);
    box(.48,.85,.4,4.7,1.3,-10,teal);
    const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.27,0),cream);head.position.set(4.7,1.98,-10);g.add(head);
    const pretzel=new THREE.Mesh(new THREE.TorusGeometry(.22,.07,6,12),orange);pretzel.position.set(4.25,1.85,-10);g.add(pretzel);
  } else if (index % 4 === 1) {
    box(2,1.9,3.4,-5,1,-9,teal);box(1.8,.6,.1,-5,1.5,-7.25);
    for(let n=0;n<3;n++) box(.7,.6,.6,-4.8+n*.65,.3,-6,orange);
    sign('ZUSTELLUNG',-5,-10,'#287b74',2.5);
  } else if(index % 4 === 2) {
    for(let n=0;n<4;n++) {const b=box(.8,.55,.7,4.7+(n%2),.28,-5-n*2,teal); b.rotation.y=n*.4;const flower=new THREE.Mesh(new THREE.IcosahedronGeometry(.5,0),n%2?orange:cream);flower.position.set(b.position.x,.8,b.position.z);g.add(flower);}
  }
}
