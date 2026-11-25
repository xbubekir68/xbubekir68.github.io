import * as THREE from 'three';
import { Rider } from '../game/Chase';
import { terrainAt } from '../world/Route';

export const RIDER_COLORS = [0xf7b52c, 0xef6b50, 0x41a99a, 0x8694d2];

export class BikeGang {
  readonly root = new THREE.Group();
  private models: { root: THREE.Group; bike: THREE.Group; kid: THREE.Group; legs: THREE.Group[]; wheels: THREE.Mesh[]; glasses: THREE.Mesh }[] = [];
  private clock = 0;
  constructor() {
    for (let i = 0; i < 4; i++) {
      const root = new THREE.Group(), bike = new THREE.Group(), kid = new THREE.Group();
      const color = RIDER_COLORS[i];
      const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: .75 });
      const paint = mat(color), dark = mat(0x283b42), skin = mat(0xe9b085), white = mat(0xffead2);
      const box = (g: THREE.Group, w: number, h: number, d: number, x: number,y: number,z: number, m: THREE.Material) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m); mesh.position.set(x,y,z); mesh.castShadow = true; g.add(mesh); return mesh;
      };
      const wheels: THREE.Mesh[] = [];
      for (const z of [-.68,.68]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(.36,.07,6,12), dark);
        wheel.rotation.y = Math.PI/2; wheel.position.set(0,.4,z); bike.add(wheel); wheels.push(wheel);
        box(bike,.1,.64,.08,0,.66,z,white);
      }
      box(bike,.13,.14,1.3,0,.64,0,paint);
      const tube = box(bike,.12,.78,.12,0,.76,0,paint); tube.rotation.x = .65;
      box(bike,.3,.12,.4,0,1.04,.32,dark);
      box(bike,.8,.09,.1,0,1.1,-.65,white);
      box(bike,.22,.2,.45,0,.55,.1,dark); // visible e-bike battery
      box(kid,.55,.65,.38,0,1.22,.1,paint);
      box(kid,.42,.46,.22,0,1.3,.4,dark);
      const head = new THREE.Mesh(new THREE.IcosahedronGeometry(.28,1),skin); head.position.set(0,1.84,-.06); kid.add(head);
      // Each kid gets one unmistakable feature, readable as a silhouette from behind.
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? .62 : .34,8,5,0,Math.PI*2,0,Math.PI*.6),paint);
      helmet.position.set(0,i === 0 ? 1.9 : 1.98,-.06); kid.add(helmet);
      box(kid,.12,.1,.72,0,i === 0 ? 2.32 : 2.07,-.06,white);
      const glasses = box(kid,i===1?.66:.5,i===1?.24:.16,.1,0,1.87,-.32,dark);
      for (const x of [-.33,.33]) {
        const arm = box(kid,.15,.53,.16,x,1.28,-.2,skin); arm.rotation.x = -.6;
      }
      const legs: THREE.Group[] = [];
      for (const x of [-.18,.18]) {
        const leg = new THREE.Group(); leg.position.set(x,1,.1);
        box(leg,.18,.53,.2,0,-.23,0,dark); box(leg,.22,.14,.35,0,-.49,-.08,white); kid.add(leg); legs.push(leg);
      }
      if (i === 0) {
        // Mini-Maxi: small bike, oversized helmet and a tall safety flag.
        bike.scale.setScalar(.72); kid.scale.setScalar(.85);
        box(bike,.04,1.9,.04,0,1.6,.7,white);
        const flag = box(bike,.03,.42,.6,0,2.35,.95,mat(0xf26b1d)); flag.rotation.x = .2;
      } else if (i === 1) {
        // Turbo-Toni: racing drops and a flat, forward-leaning position.
        for (const x of [-.4,.4]) box(bike,.08,.32,.1,x,.95,-.75,white);
        kid.rotation.x = .28;
      } else if (i === 2) {
        // Gassen-Gabi: two braids swinging below the helmet.
        for (const x of [-.3,.3]) { const braid = box(kid,.11,.5,.11,x,1.55,.05,mat(0x6b3b1f)); braid.rotation.z = x*.6; }
      } else {
        // Brezel-Beni: a basket with a pretzel on the handlebar.
        box(bike,.5,.3,.36,0,1.05,-.92,mat(0xa8763e));
        const pretzel = new THREE.Mesh(new THREE.TorusGeometry(.14,.05,6,10),mat(0xc9822f)); pretzel.position.set(0,1.28,-.92); bike.add(pretzel);
      }
      root.add(bike,kid); this.root.add(root); this.models.push({root,bike,kid,legs,wheels,glasses});
    }
  }
  update(dt: number, riders: Rider[], playerS: number, idle = false, reduced = false): void {
    this.clock += dt;
    riders.forEach((r,i) => {
      const m = this.models[i];
      m.root.visible = idle || r.active;
      m.root.position.set(idle ? (i-1.5)*1.45 : r.x, idle ? 0 : terrainAt(r.s,r.x).height, idle ? -2-i*.65 : playerS-r.s);
      m.root.rotation.z = r.state==='crash' ? 1.1 : 0;
      m.root.rotation.y = idle ? Math.PI-.25 : (r.lane*2.35-r.x)*-.13;
      const pushing = r.state==='push';
      const stairs = pushing && terrainAt(r.s,r.x).stairs;
      const crouching = pushing && !stairs;
      m.bike.rotation.z = crouching ? 1.12 : 0;
      m.bike.position.x = pushing ? .36 : 0;
      // On stairs the kid gets off and walks beside the bike; under gates it crouches behind the flat bike.
      m.kid.position.set(stairs ? -.5 : pushing ? -.25 : 0, stairs ? -.44 : 0, 0);
      m.kid.scale.y = crouching ? .42 : i===0 ? .85 : 1;
      m.glasses.rotation.z = r.state==='crash' ? .9 : 0;
      m.glasses.position.y = r.state==='crash' ? .2 : 1.87;
      m.legs.forEach((l,j) => l.rotation.x = reduced ? 0 : Math.sin(this.clock * (pushing?8:r.speed*.7) + j*Math.PI)*.55);
      for (const w of m.wheels) w.rotation.x += r.speed*dt/.36;
    });
  }
}
