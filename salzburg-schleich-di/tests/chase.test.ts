import { describe, expect, it } from 'vitest';
import { Chase, OBSTACLE_RULES } from '../src/game/Chase';
import { getObstacleDimensions } from '../src/game/Collision';
import { ActiveObstacleData, Lane, ObstacleKind } from '../src/types';
import { seededRandom, terrainAt, trackCode } from '../src/world/Route';
import { PatternGenerator } from '../src/world/PatternGenerator';
import { BIOME_ORDER } from '../src/constants';

const terrain = () => ({wet:false,narrow:false,stairs:false});
function obstacle(kind: ObstacleKind, lane: Lane, s=12): ActiveObstacleData {
  return {id:lane+2,kind,lane,worldZ:30-s,...getObstacleDimensions(kind),forgiven:false};
}
function alone() {const c=new Chase();c.riders=c.riders.slice(0,1);Object.assign(c.riders[0],{s:0,x:0,lane:0,speed:14});return c;}
describe('Physical bicycle pursuit',()=>{
  it.each(['crates','market_stall','barrier_low','bench_bike','roof_gap'] as ObstacleKind[])('stops before a completely blocked %s row, even with player forgiveness',kind=>{
    const c=alone(), row=([-1,0,1] as Lane[]).map(l=>({...obstacle(kind,l),forgiven:true}));
    for(let i=0;i<600;i++) c.update(1/60,30,0,14.5,row,terrain);
    expect(c.riders[0].s).toBeLessThanOrEqual(12-getObstacleDimensions(kind).halfDepth-1.15+.001);
    expect(c.riders[0].speed).toBe(0);
    expect(c.caught(30,0,0)).toBeUndefined();
  });
  it('finds an actually open lane and passes a crate without crossing its body',()=>{
    const c=alone(), obs=obstacle('crates',0);
    for(let i=0;i<180;i++) {
      c.update(1/60,30,0,14.5,[obs],terrain);
      const r=c.riders[0];
      if(Math.abs(r.s-12)<obs.halfDepth+1.1) expect(Math.abs(r.x)).toBeGreaterThanOrEqual(obs.halfWidth+.45);
    }
    expect(c.riders[0].s).toBeGreaterThan(15);
  });
  it('can finish a lateral escape after stopping just in front of an obstacle corner',()=>{
    const c=alone(),o=obstacle('market_stall',0);
    Object.assign(c.riders[0],{s:12-o.halfDepth-1.17,x:-1.32,lane:-1,speed:0});
    for(let i=0;i<600;i++) c.update(1/120,30,0,14.5,[o],terrain);
    expect(c.riders[0].s).toBeGreaterThan(15);
  });
  it('dismounts under low gates and loses real distance instead of resetting a gap',()=>{
    const c=alone(), row=([-1,0,1] as Lane[]).map(l=>obstacle('low_arch',l));let pushed=false;
    for(let i=0;i<180;i++) {c.update(1/60,30,0,14.5,row,terrain);if(c.riders[0].state==='push')pushed=true;}
    expect(pushed).toBe(true);expect(c.riders[0].s).toBeLessThan(30);
    expect(c.gap(30)).toBeCloseTo(30-c.riders[0].s);
  });
  it('only catches at matching longitudinal, lateral and vertical positions',()=>{
    const c=alone();c.riders[0].s=29.4;
    expect(c.caught(30,0,0)?.name).toBe('Mini-Maxi');
    expect(c.caught(30,2.35,0)).toBeUndefined();expect(c.caught(30,0,3)).toBeUndefined();
    c.riders[0].state='crash';expect(c.caught(30,0,0)).toBeUndefined();
  });
  it('a snack stops Beni where he is; reset restores every rider',()=>{
    const c=new Chase(); const before=c.riders[3].s;
    expect(c.distract(0)).toBe(true);expect(c.distract(0)).toBe(false);
    c.update(1,14,0,14.5,[],terrain);expect(c.riders[3].s).toBe(before);
    c.reset();expect(c.riders[3].state).toBe('ride');expect(c.riders[3].timer).toBe(0);
  });
  it('crashes are caused by a real obstacle and stop forward motion',()=>{
    const c=new Chase();const r=c.riders[1];Object.assign(r,{s:0,x:0,lane:0});
    c.update(1/60,30,0,14.5,[{...obstacle('crates',0,11),id:11}],terrain);
    expect(r.state).toBe('crash');const at=r.s;c.update(.5,30,0,14.5,[],terrain);expect(r.s).toBe(at);
  });
  it('free-road acceleration agrees across frame rates',()=>{
    const run=(hz:number)=>{const c=alone(); for(let i=0;i<hz*3;i++) c.update(1/hz,60,0,14.5,[],terrain); return c.riders[0].s;};
    expect(Math.abs(run(30)-run(120))).toBeLessThan(.1);
  });
  it('stairs use the identical height profile for riders and courier',()=>{
    const t=terrainAt(6*18-14+9,-2.35); expect(t.stairs).toBe(true);expect(t.height).toBe(.65);
    expect(terrainAt(6*18-14+9,2.35).stairs).toBe(false);
    expect(Object.keys(OBSTACLE_RULES)).toHaveLength(8);
  });
});
describe('Versioned tracks',()=>{
  function plans(code:string) {const g=new PatternGenerator(seededRandom(code));let safe:Lane[]=[-1,0,1];return Array.from({length:250},(_,i)=>{const p=g.generateSegment({segmentIndex:i,biome:BIOME_ORDER[Math.floor(i/11)%5],isTransition:i%11===0,difficulty:Math.min(1,i/90),prevSafeLanes:safe});safe=p.safeLanesOut;return p;});}
  it('reproduces every obstacle and pickup across 250 segments',()=>{
    expect(plans('SD2-FRIENDS')).toEqual(plans('SD2-FRIENDS'));
    expect(plans('SD2-FRIENDS')).not.toEqual(plans('SD2-OTHER'));
  });
  it('keeps an entirely open lane in every obstacle row',()=>{
    for(const p of plans('SD2-FAIR')) for(const z of new Set(p.obstacles.map(o=>o.localZ))) expect(p.obstacles.filter(o=>o.localZ===z).length).toBeLessThan(3);
  });
  it('rejects incompatible versions instead of silently changing their seed',()=>{
    expect(trackCode(' sd2-salzburg ')).toBe('SD2-SALZBURG');expect(()=>trackCode('SD1-SALZBURG')).toThrow();
  });
});
