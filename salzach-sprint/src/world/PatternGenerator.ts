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

  public reset(): void {
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

    const obstacles: ObstacleSpec[] = [];
    const pretzels: PretzelSpec[] = [];
    const powerUps: PowerUpSpec[] = [];

    // Transition gates have a single gentle row so the player can admire entering the new district
    const rowPositions = isTransition ? [-10.0] : [-4.6, -13.6];
    const allowed = BIOMES[biome].allowedObstacles;

    for (let r = 0; r < rowPositions.length; r++) {
      const rowZ = rowPositions[r];
      const reachableFromPrev = LANES.filter((lane) =>
        safeLanes.some((prev) => Math.abs(lane - prev) <= 1)
      );

      // Pick a guaranteed hero safe lane from reachable lanes
      const guaranteedLane =
        reachableFromPrev[Math.floor(this.rng() * reachableFromPrev.length)] ?? 0;

      // Decide what happens on the guaranteed lane: completely open (55%) or clean action (jump/slide 45%)
      const heroActionRoll = this.rng();
      let heroObstacle: ObstacleKind | null = null;
      if (!isTransition && heroActionRoll < 0.28 + difficulty * 0.16) {
        const actionPool = allowed.filter((k) => !isFullBlocker(k));
        if (actionPool.length > 0) {
          heroObstacle = actionPool[Math.floor(this.rng() * actionPool.length)];
        }
      }

      const nextSafeLanes: Lane[] = [];
      let fullBlockerCount = 0;

      for (const lane of LANES) {
        if (lane === guaranteedLane) {
          if (heroObstacle) {
            obstacles.push({ lane, localZ: rowZ, kind: heroObstacle });
          }
          nextSafeLanes.push(lane);
          continue;
        }

        // Other lanes: place obstacles based on difficulty while keeping fairness
        const spawnChance = isTransition ? 0.35 : 0.48 + difficulty * 0.34;
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

      // Add pretzel trail on the guaranteed lane for the first row (or transition row)
      if (r === 0) {
        this.placePretzelTrail(pretzels, guaranteedLane, rowZ, heroObstacle);
      } else if (this.rng() < 0.45) {
        // Occasional bonus air pretzels for Schnürlregen-Schirm gliders
        for (let k = 0; k < 3; k++) {
          pretzels.push({
            lane: guaranteedLane,
            localZ: rowZ + 2.2 - k * 2.2,
            y: 3.45,
          });
        }
      }

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
