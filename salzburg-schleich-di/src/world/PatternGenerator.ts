import { isDelivery, isFork, isPedestrian, isSpecial } from './Route';
import { BASE_SPEED, BIOMES, MAX_SPEED, SEGMENT_LENGTH, SPEED_ACCEL } from '../constants';
import {
  BiomeId,
  Lane,
  ObstacleKind,
  ObstacleSpec,
  PowerUpKind,
  PowerUpSpec,
  PretzelSpec,
  SegmentPlan,
} from '../types';

const POWERUP_KINDS: readonly PowerUpKind[] = ['umbrella', 'watch', 'magnet'];
const CRATE_STEP = 1.45; // crates touch each other and form a raised path

/** Expected run speed at a track position (v² = v0² + 2as), padded because stumbles cost distance but not speed. */
export function expectedSpeed(a: number): number {
  return Math.min(MAX_SPEED, 1.12 * Math.sqrt(BASE_SPEED ** 2 + 2 * SPEED_ACCEL * a));
}
/** Minimum gap between obstacle rows: 0.7 s at the expected speed (a jump lasts 0.74 s). */
export function rowSpacing(a: number): number {
  return Math.max(9, 0.7 * expectedSpeed(a));
}

/** gap > 0: multiples of rowSpacing after this row; gap < 0: exactly that many metres. */
interface Row { lanes: string; gap: number }

// Hand-built combinations. Letters become the district's own obstacles; '.' always stays open.
// J jump · S slide arch · B blocker · W high wall · C crate · P puddle · G roof gap
const PATTERNS: Row[][][] = [
  [
    [{ lanes: '.J.', gap: 1.2 }], [{ lanes: 'J..', gap: 1 }], [{ lanes: '.S.', gap: 1.2 }],
    [{ lanes: 'B..', gap: 1 }], [{ lanes: 'G..', gap: 1.3 }], [{ lanes: '.P.', gap: 1 }],
  ],
  [
    [{ lanes: 'JJ.', gap: 1 }, { lanes: '..J', gap: 1.2 }],
    [{ lanes: 'S.S', gap: 1 }, { lanes: '.B.', gap: 1.3 }],
    [{ lanes: 'P.P', gap: 1 }, { lanes: '.J.', gap: 1.1 }],
    [{ lanes: 'B.B', gap: 1.2 }],
    [{ lanes: 'J.B', gap: 1 }, { lanes: 'B.J', gap: 1.2 }],
    [{ lanes: 'G.J', gap: 1.3 }],
  ],
  [
    [{ lanes: 'C..', gap: -2.8 }, { lanes: 'W.J', gap: 1.4 }],
    [{ lanes: 'B.J', gap: 1 }, { lanes: '.B.', gap: 1 }, { lanes: 'J.B', gap: 1.2 }],
    [{ lanes: 'SJ.', gap: 1 }, { lanes: '.SJ', gap: 1 }, { lanes: 'J.S', gap: 1.2 }],
  ],
];

export class PatternGenerator {
  private rng: () => number;
  private segmentsSincePowerUp = 0;
  private cursor = 0; // absolute track position of the next row
  private queue: Row[] = [];

  constructor(seedFn: () => number = Math.random) {
    this.rng = seedFn;
  }

  public reset(seedFn?: () => number): void {
    if (seedFn) this.rng = seedFn;
    this.segmentsSincePowerUp = 0;
    this.cursor = 0;
    this.queue = [];
  }

  public generateSegment(opts: {
    segmentIndex: number;
    biome: BiomeId;
    isTransition: boolean;
    difficulty: number; // 0.0 -> 1.0
    prevSafeLanes: Lane[];
  }): SegmentPlan {
    const { segmentIndex: i, biome, isTransition, difficulty } = opts;
    const plan = (obstacles: ObstacleSpec[], pretzels: PretzelSpec[], powerUps: PowerUpSpec[], safeLanesOut: Lane[]): SegmentPlan =>
      ({ biome, isTransition, obstacles, pretzels, powerUps, safeLanesOut });

    if (isSpecial(i)) {
      // The fixed layout's centre sits 9 m in; the next pattern keeps a full reaction gap after it.
      const centre = i * SEGMENT_LENGTH + 9;
      this.cursor = Math.max(this.cursor, centre + rowSpacing(centre), (i + 1) * SEGMENT_LENGTH + 2);
      this.queue = [];
      if (i === 1) return plan([], [0, 1, 2, 3].map(k => ({ lane: 0 as Lane, localZ: -3 - k * 3.2, y: .75 })), [], [-1, 0, 1]);
      if (i < 1) return plan([], [], [], [-1, 0, 1]);
      if (isDelivery(i)) return plan([], [{ lane: 0, localZ: -8, y: .8 }], [], [-1, 0, 1]);
      if (isFork(i)) {
        // Left: stairs with pretzels (bikes push). Right: open fast lane with a power-up (fast for everybody).
        const kind = POWERUP_KINDS[Math.floor(this.rng() * POWERUP_KINDS.length)];
        return plan([{ lane: 0, localZ: -9, kind: 'market_stall' }],
          [-4, -6, -8, -10, -12, -14].map(localZ => ({ lane: -1 as Lane, localZ, y: 1.5 })),
          [{ lane: 1, localZ: -9, y: 1.05, kind }], [-1, 1]);
      }
      if (isPedestrian(i)) return plan([{ lane: -1, localZ: -9, kind: 'pedestrian' }], [{ lane: 1, localZ: -9, y: .8 }], [], [0, 1]);
    }

    const start = i * SEGMENT_LENGTH;
    const sp = rowSpacing(start + SEGMENT_LENGTH);
    // Keep the approach to the next fixed layout (its centre sits 9 m into the segment) free.
    const limit = isSpecial(i + 1) ? Math.min(start + 17.2, start + SEGMENT_LENGTH + 9 - sp) : start + 17.2;
    this.cursor = Math.max(this.cursor, start + .3);

    const obstacles: ObstacleSpec[] = [];
    const pretzels: PretzelSpec[] = [];
    let safeLanesOut: Lane[] = [-1, 0, 1];
    let rowCount = 0;
    for (;;) {
      if (!this.queue.length) { this.queue = this.pickPattern(start, difficulty, isTransition || i < 5); this.cursor += this.rng() * 3; }
      if (this.cursor > limit) break;
      const row = this.queue.shift()!;
      const localZ = -(this.cursor - start);
      const free: Lane[] = [];
      [...row.lanes].forEach((letter, k) => {
        const lane = (k - 1) as Lane;
        if (letter === '.') { free.push(lane); return; }
        const kind = this.kind(letter, biome);
        obstacles.push({ lane, localZ, kind });
        // Optional richer line over or under an obstacle; never the only way through.
        if (letter === 'C') pretzels.push({ lane, localZ, y: 1.67 });
        else if (kind === 'low_arch' && this.rng() < .4) this.trail(pretzels, lane, localZ, .52);
        else if (kind !== 'market_stall' && kind !== 'high_wall' && kind !== 'pedestrian' && this.rng() < .3) this.trail(pretzels, lane, localZ, 'arc');
      });
      if (rowCount++ % 3 === 0 && !row.lanes.includes('C')) this.trail(pretzels, free[Math.floor(this.rng() * free.length)], localZ, .78, 3);
      safeLanesOut = free;
      this.cursor += row.gap < 0 ? -row.gap : rowSpacing(this.cursor) * row.gap;
    }

    const powerUps: PowerUpSpec[] = [];
    this.segmentsSincePowerUp++;
    if (!isTransition && this.segmentsSincePowerUp >= 3 && this.rng() < 0.42) {
      const lane = ([-1, 0, 1] as Lane[])[Math.floor(this.rng() * 3)];
      const localZ = [-9, -4, -14].find(z => !obstacles.some(o => o.lane === lane && Math.abs(o.localZ - z) < 2.6));
      if (localZ !== undefined) {
        powerUps.push({ lane, localZ, y: 1.05, kind: POWERUP_KINDS[Math.floor(this.rng() * POWERUP_KINDS.length)] });
        this.segmentsSincePowerUp = 0;
      }
    }
    return plan(obstacles, pretzels, powerUps, safeLanesOut);
  }

  private pickPattern(start: number, difficulty: number, easy: boolean): Row[] {
    const w = easy ? [1, 0, 0] : [Math.max(.4, 3 - 3 * difficulty), 1 + 2 * difficulty, start < 200 ? 0 : 3 * difficulty];
    let r = this.rng() * (w[0] + w[1] + w[2]);
    const tier = r < w[0] ? 0 : (r -= w[0]) < w[1] ? 1 : 2;
    const list = PATTERNS[tier];
    const pick = Math.floor(this.rng() * (list.length + (tier === 2 ? 1 : 0)));
    const rows = pick < list.length ? list[pick].map(row => ({ ...row })) : this.crateRun(start);
    if (this.rng() < .5) for (const row of rows) row.lanes = [...row.lanes].reverse().join('');
    return rows;
  }

  /** A raised crate path long enough to land on at the current speed; bikes cannot use that lane. */
  private crateRun(start: number): Row[] {
    const n = Math.max(5, Math.min(14, Math.round(.8 * expectedSpeed(start) / CRATE_STEP)));
    return Array.from({ length: n }, (_, k) => ({
      lanes: k % 4 === 1 ? 'CJ.' : 'C..',
      gap: k === n - 1 ? 1.3 : -CRATE_STEP,
    }));
  }

  private kind(letter: string, biome: BiomeId): ObstacleKind {
    const allowed = BIOMES[biome].allowedObstacles;
    const has = (k: ObstacleKind) => allowed.includes(k);
    const jumps = allowed.filter(k => k === 'crates' || k === 'barrier_low' || k === 'bench_bike');
    const any = () => jumps[Math.floor(this.rng() * jumps.length)];
    switch (letter) {
      case 'S': return 'low_arch';
      case 'C': return 'crates';
      case 'B': return has('market_stall') ? 'market_stall' : any();
      case 'W': return has('high_wall') ? 'high_wall' : 'crates';
      case 'P': return has('puddle_work') ? 'puddle_work' : any();
      case 'G': return has('roof_gap') ? 'roof_gap' : any();
      default: return has('roof_gap') && this.rng() < .35 ? 'roof_gap' : any();
    }
  }

  private trail(out: PretzelSpec[], lane: Lane, centerZ: number, y: number | 'arc', count = 5): void {
    const offsets = [3.2, 1.6, 0, -1.6, -3.2].slice((5 - count) >> 1, ((5 - count) >> 1) + count);
    for (const dz of offsets) {
      const z = centerZ + dz;
      if (z > -0.8 || z < -SEGMENT_LENGTH + 0.8) continue;
      const n = dz / 3.2;
      out.push({ lane, localZ: z, y: y === 'arc' ? .78 + (1 - n * n) * 1.38 : y });
    }
  }
}
