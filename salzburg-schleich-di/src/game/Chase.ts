import { LANE_WIDTH } from '../constants';
import { ActiveObstacleData, ObstacleKind } from '../types';

// All positions are metres along the shared road. Rendering never controls simulation.
export const OBSTACLE_RULES: Record<ObstacleKind, { player: string; bike: string; speed: number }> = {
  pedestrian: { player:'Ausweichen', bike:'Bremsen und ausweichen', speed:0 },
  crates: { player: 'Übersteigen / springen', bike: 'Ausweichen oder anhalten', speed: 0 },
  market_stall: { player: 'Ausweichen', bike: 'Ausweichen oder anhalten', speed: 0 },
  barrier_low: { player: 'Mauersprung', bike: 'Ausweichen oder anhalten', speed: 0 },
  bench_bike: { player: 'Springen', bike: 'Ausweichen oder anhalten', speed: 0 },
  low_arch: { player: 'Rutschen', bike: 'Absteigen, Fahrrad flach schieben (2 m/s)', speed: 2 },
  puddle_work: { player: 'Springen oder Tempoverlust', bike: 'Durchrollen (5 m/s)', speed: 5 },
  roof_gap: { player: 'Springen', bike: 'Ausweichen oder anhalten', speed: 0 },
};

export interface Rider {
  name: string; s: number; x: number; lane: number; speed: number;
  maxExtra: number; caution: number; state: 'ride' | 'brake' | 'push' | 'crash' | 'snack' | 'wait';
  timer: number; active: boolean; mistakes: Set<number>; escaped: boolean;
}
export class Chase {
  riders: Rider[] = [];
  event = '';
  reset(): void {
    this.riders = ['Mini-Maxi', 'Turbo-Toni', 'Gassen-Gabi', 'Brezel-Beni'].map((name, i) => ({
      name, s: -18 - i * 3, x: (i % 3 - 1) * LANE_WIDTH, lane: i % 3 - 1,
      speed: 14, maxExtra: [1.5, 3.2, 1.8, 1][i], caution: [1, .65, 1.2, 1.6][i],
      state: 'ride', timer: 0, active: true, mistakes: new Set(), escaped: false,
    }));
    this.event = '';
  }
  constructor() { this.reset(); }
  distract(playerS: number): boolean {
    const r = this.riders[3];
    if (!r.active || r.timer > 0 || playerS - r.s > 45 || playerS < r.s) return false;
    r.timer = 3; r.state = 'snack'; r.speed = 0;
    this.event = 'Brezel-Beni: „Jausenpause!“';
    return true;
  }
  gap(s: number): number {
    return Math.min(...this.riders.filter(r => r.active).map(r => Math.max(0, s - r.s)), 999);
  }
  caught(s: number, x: number, y: number): Rider | undefined {
    return this.riders.find(r => r.active && r.state === 'ride' && Math.abs(s - r.s) < 1.1 && Math.abs(x - r.x) < .8 && y < 1.8);
  }
  update(dt: number, playerS: number, playerX: number, baseSpeed: number, obstacles: ActiveObstacleData[], terrain: (s: number, x: number) => { wet: boolean; narrow: boolean; stairs: boolean }): void {
    this.event = '';
    for (const [idx, r] of this.riders.entries()) {
      if (!r.active) continue;
      if (playerS - r.s > 145) { r.active = false; r.escaped = true; continue; }
      if (playerS - r.s > 45) r.escaped = true;
      if (r.timer > 0) { r.timer = Math.max(0, r.timer - dt); r.speed = 0; continue; }
      const t = terrain(r.s, r.x);
      const ahead = obstacles.map(o => ({ o, s: playerS - o.worldZ }))
        .filter(a => a.s + a.o.halfDepth > r.s - 1.1 && a.s - r.s < 26)
        .sort((a,b) => a.s - b.s);
      let desired = baseSpeed + r.maxExtra;
      r.state = 'ride';
      if (t.narrow) desired *= idx === 2 ? .95 : .84;
      if (t.stairs) { desired = 3.5; r.state = 'push'; }
      const threat = ahead.find(a => Math.abs((a.o.centerX ?? a.o.lane * LANE_WIDTH) - r.x) < a.o.halfWidth + .48);
      let lane = r.lane;
      if (threat && threat.s - r.s < Math.max(12, r.speed * r.caution)) {
        const candidates = [-1, 0, 1].filter(l => Math.abs(l - r.lane) <= 1 && !ahead.some(a =>
          a.s - r.s < Math.max(8, r.speed * .7) && a.s + a.o.halfDepth > r.s - 1.1 &&
          Math.abs((a.o.centerX ?? a.o.lane * LANE_WIDTH) - l * LANE_WIDTH) < a.o.halfWidth + .48));
        if (candidates.length) {
          lane = candidates.sort((a,b) => Math.abs(a * LANE_WIDTH - playerX) - Math.abs(b * LANE_WIDTH - playerX))[0];
          desired *= t.wet ? .55 : idx === 1 ? .6 : .82;
        } else {
          desired = OBSTACLE_RULES[threat.o.kind].speed;
          r.state = desired === 2 ? 'push' : desired ? 'brake' : 'wait';
        }
        // Reproducible mistakes only when reacting to a real obstacle. Never tunnel through it.
        if (idx === 1 && threat.o.id % 11 === 0 && !r.mistakes.has(threat.o.id)) {
          r.mistakes.add(threat.o.id); r.timer = 1.5; r.state = 'crash'; r.speed = 0;
          this.event = 'Turbo-Toni: „Meine Brille! Wo is meine Brille?“'; continue;
        }
      } else if (!ahead.some(a => a.s - r.s < 7)) {
        lane = Math.max(-1, Math.min(1, Math.round(playerX / LANE_WIDTH)));
      }
      r.lane = lane;
      const nx = r.x + Math.max(-3 * dt, Math.min(3 * dt, lane * LANE_WIDTH - r.x));
      // Swept lateral clearance includes the whole bicycle, not only its destination lane.
      const overlaps = ahead.some(a => Math.abs(a.s - r.s) < a.o.halfDepth + 1.1 &&
        Math.max(nx, r.x) + .45 > (a.o.centerX ?? a.o.lane * LANE_WIDTH) - a.o.halfWidth &&
        Math.min(nx, r.x) - .45 < (a.o.centerX ?? a.o.lane * LANE_WIDTH) + a.o.halfWidth);
      if (!overlaps) r.x = nx;
      r.speed += Math.max(-25 * dt, Math.min(2.6 * dt, desired - r.speed));
      if (r.speed < baseSpeed * .75 && r.state === 'ride') r.state = 'brake';
      let next = r.s + Math.max(0, r.speed) * dt;
      for (const {o, s} of ahead) {
        if (Math.abs((o.centerX ?? o.lane * LANE_WIDTH) - r.x) >= o.halfWidth + .45) continue;
        if (s + o.halfDepth < r.s - 1.1) continue;
        const limit = OBSTACLE_RULES[o.kind].speed;
        const stop = s - o.halfDepth - 1.17;
        if (next > stop) {
          if (limit === 0) { next = Math.min(next, Math.max(r.s, stop)); r.speed = 0; r.state = 'wait'; }
          else { r.speed = Math.min(r.speed, limit); next = r.s + r.speed * dt; r.state = limit === 2 ? 'push' : 'brake'; }
        }
      }
      r.s = next;
    }
  }
}
