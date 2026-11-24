import { isDelivery, isFork } from './Route';
import { BIOMES, LANES, SEGMENT_LENGTH } from '../constants';
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

function isFullBlocker(kind: ObstacleKind): boolean {
  return kind === 'market_stall';
}

function isSlideObstacle(kind: ObstacleKind): boolean {
  return kind === 'low_arch';
}

function isJumpObstacle(kind: ObstacleKind): boolean {
  return (
    kind === 'crates' ||
    kind === 'barrier_low' ||
    kind === 'bench_bike' ||
    kind === 'puddle_work' ||
    kind === 'roof_gap'
  );
}

export class PatternGenerator {
  private rng: () => number;
  private segmentsSincePowerUp = 0;

  constructor(seedFn: () => number = Math.random) {
    this.rng = seedFn;
  }

  public reset(seedFn?: () => number): void {
    if (seedFn) this.rng = seedFn;
    this.segmentsSincePowerUp = 0;
  }

  /**
   * Generates a modular 18m segment plan.
   * Guarantees at least one reachable safe path from `prevSafeLanes` across all rows.
   */
  public generateSegment(opts: {
    segmentIndex: number;
    biome: BiomeId;
    isTransition: boolean;
    difficulty: number; // 0.0 -> 1.0
    prevSafeLanes: Lane[];
  }): SegmentPlan {
    const { segmentIndex, biome, isTransition, difficulty } = opts;
    let safeLanes: Lane[] =
      opts.prevSafeLanes.length > 0 ? [...opts.prevSafeLanes] : [-1, 0, 1];

    // Give player calm opening stretch on the very first 2 segments
    if (segmentIndex <= 1) {
      const introPretzels: PretzelSpec[] = [];
      if (segmentIndex === 1) {
        for (let i = 0; i < 4; i++) {
          introPretzels.push({ lane: 0, localZ: -3 - i * 3.2, y: 0.75 });
        }
      }
      return {
        biome,
        isTransition,
        obstacles: [],
        pretzels: introPretzels,
        powerUps: [],
        safeLanesOut: [-1, 0, 1],
      };
    }

    if (isDelivery(segmentIndex)) return { biome, isTransition, obstacles: [], pretzels: [{lane:0,localZ:-8,y:.8}], powerUps: [], safeLanesOut: [-1,0,1] };
    if (isFork(segmentIndex)) return { biome, isTransition, obstacles: [{lane:0,localZ:-9,kind:'market_stall'}], pretzels: [-4,-6,-8,-10,-12,-14].map(localZ => ({lane:-1 as Lane,localZ,y:1.5})), powerUps: [], safeLanesOut: [-1,1] };
    if (segmentIndex>10 && segmentIndex%13===7 && biome!=='daecher') return { biome,isTransition,obstacles:[{lane:-1,localZ:-9,kind:'pedestrian'}],pretzels:[{lane:1,localZ:-9,y:.8}],powerUps:[],safeLanesOut:[0,1] };
    const obstacles: ObstacleSpec[] = [];
    const pretzels: PretzelSpec[] = [];
    const powerUps: PowerUpSpec[] = [];

    // Transition gates have a single gentle row so the player can admire entering the new district
    const rowPositions = [-9]; // 18 m spacing: enough for a complete jump and landing even at max speed.
    const allowed = BIOMES[biome].allowedObstacles;

    for (let r = 0; r < rowPositions.length; r++) {
      const rowZ = rowPositions[r];
      const reachableFromPrev = LANES.filter((lane) =>
        safeLanes.some((prev) => Math.abs(lane - prev) <= 1)
      );

      // Pick a guaranteed hero safe lane from reachable lanes
      const guaranteedLane =
        reachableFromPrev[Math.floor(this.rng() * reachableFromPrev.length)] ?? 0;

      // Keep one genuinely open route, including landing and recovery space.
      const nextSafeLanes: Lane[] = [];
      let fullBlockerCount = 0;

      for (const lane of LANES) {
        if (lane === guaranteedLane) {
          nextSafeLanes.push(lane);
          continue;
        }

        // Other lanes: place obstacles based on difficulty while keeping fairness
        const spawnChance = segmentIndex < 5 ? 0.3 : isTransition ? 0.2 : 0.48 + difficulty * 0.34;
        if (this.rng() < spawnChance) {
          let pool = allowed;
          // Never allow all 3 lanes to be full blockers; max 2 full blockers if guaranteedLane is non-blocked
          if (fullBlockerCount >= 2) {
            pool = allowed.filter((k) => !isFullBlocker(k));
          }
          const chosen = pool[Math.floor(this.rng() * pool.length)];
          obstacles.push({ lane, localZ: rowZ, kind: chosen });

          if (isFullBlocker(chosen)) {
            fullBlockerCount++;
          } else if (reachableFromPrev.includes(lane)) {
            // Jumpable or slideable lanes that were reachable also count as valid traversable lanes
            nextSafeLanes.push(lane);
          }
        } else {
          // Completely empty lane
          if (reachableFromPrev.includes(lane)) {
            nextSafeLanes.push(lane);
          }
        }
      }

      this.placePretzelTrail(pretzels, guaranteedLane, rowZ, null);
      // Optional richer line over a jumpable obstacle. Never a mandatory unsafe route.
      const risky = obstacles.find(o => o.localZ === rowZ && !isFullBlocker(o.kind));
      if (risky && segmentIndex > 5) this.placePretzelTrail(pretzels, risky.lane, rowZ, risky.kind);

      safeLanes = nextSafeLanes.length > 0 ? nextSafeLanes : [guaranteedLane];
    }

    // Power-up placement every 3-5 segments on a guaranteed safe open spot
    this.segmentsSincePowerUp++;
    if (!isTransition && this.segmentsSincePowerUp >= 3 && this.rng() < 0.42) {
      const puLane = safeLanes[Math.floor(this.rng() * safeLanes.length)] ?? 0;
      const puZ = -SEGMENT_LENGTH * 0.5;
      const clashesWithObstacle = obstacles.some(
        (o) => o.lane === puLane && Math.abs(o.localZ - puZ) < 2.6
      );
      if (!clashesWithObstacle) {
        const kind = POWERUP_KINDS[Math.floor(this.rng() * POWERUP_KINDS.length)];
        powerUps.push({
          lane: puLane,
          localZ: puZ,
          y: 1.05,
          kind,
        });
        this.segmentsSincePowerUp = 0;
      }
    }

    return {
      biome,
      isTransition,
      obstacles,
      pretzels,
      powerUps,
      safeLanesOut: safeLanes,
    };
  }

  private placePretzelTrail(
    out: PretzelSpec[],
    lane: Lane,
    centerZ: number,
    obs: ObstacleKind | null
  ): void {
    const offsets = [3.2, 1.6, 0, -1.6, -3.2];
    for (let i = 0; i < offsets.length; i++) {
      const dz = offsets[i];
      const z = centerZ + dz;
      if (z > -0.8 || z < -SEGMENT_LENGTH + 0.8) continue;

      let y = 0.78;
      if (obs && isJumpObstacle(obs)) {
        // Parabolic jump guide arc over obstacle or roof gap
        const norm = dz / 3.2; // -1 .. 1
        y = 0.78 + (1 - norm * norm) * 1.38;
      } else if (obs && isSlideObstacle(obs)) {
        // Low ducking line underneath archway
        y = 0.52;
      }
      out.push({ lane, localZ: z, y });
    }
  }
}
