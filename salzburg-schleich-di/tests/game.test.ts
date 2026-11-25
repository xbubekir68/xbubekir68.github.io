import { describe, expect, it } from 'vitest';
import { BIOME_ORDER, LANES } from '../src/constants';
import {
  checkObstacleCollision,
  computePlayerBounds,
  getObstacleDimensions,
} from '../src/game/Collision';
import { SaveManager, StorageBackend } from '../src/storage';
import { Lane } from '../src/types';
import { PatternGenerator } from '../src/world/PatternGenerator';

class MemoryStorage implements StorageBackend {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe('Salzach Sprint Core Systems', () => {
  it('guarantees at least one reachable safe path across 250 generated segments across all 5 Salzburg biomes', () => {
    const gen = new PatternGenerator();
    let prevSafe: Lane[] = [-1, 0, 1];

    for (let i = 0; i < 250; i++) {
      const biome = BIOME_ORDER[Math.floor(i / 11) % BIOME_ORDER.length];
      const isTransition = i > 0 && i % 11 === 0;
      const plan = gen.generateSegment({
        segmentIndex: i,
        biome,
        isTransition,
        difficulty: Math.min(1, i / 120),
        prevSafeLanes: prevSafe,
      });

      expect(plan.safeLanesOut.length).toBeGreaterThanOrEqual(1);

      // Verify no row ever blocks all 3 lanes with unjumpable/unslideable market_stalls
      const byRow = new Map<number, typeof plan.obstacles>();
      for (const obs of plan.obstacles) {
        const list = byRow.get(obs.localZ) ?? [];
        list.push(obs);
        byRow.set(obs.localZ, list);
      }

      for (const [, rowObs] of byRow.entries()) {
        const fullBlockers = rowObs.filter((o) => o.kind === 'market_stall');
        expect(fullBlockers.length).toBeLessThan(LANES.length);
      }

      prevSafe = plan.safeLanesOut;
    }
  });

  it('accurately resolves jumping over crates and roof gaps vs colliding when grounded', () => {
    const crateDims = getObstacleDimensions('crates');
    const crateObs = {
      id: 1,
      kind: 'crates' as const,
      lane: 0 as Lane,
      worldZ: 0,
      ...crateDims,
      forgiven: false,
    };

    // Standing on ground hits crate
    expect(checkObstacleCollision(computePlayerBounds(0, 0, false), crateObs)).toBe(true);
    // Jumping above crate clears it cleanly
    expect(checkObstacleCollision(computePlayerBounds(0, 1.05, false), crateObs)).toBe(false);

    // Rooftop gap
    const gapDims = getObstacleDimensions('roof_gap');
    const gapObs = {
      id: 2,
      kind: 'roof_gap' as const,
      lane: 1 as Lane,
      worldZ: 0,
      ...gapDims,
      forgiven: false,
    };

    // Grounded on lane 1 hits gap
    expect(checkObstacleCollision(computePlayerBounds(2.35, 0, false), gapObs)).toBe(true);
    // Jumping over gap on lane 1 clears it
    expect(checkObstacleCollision(computePlayerBounds(2.35, 0.55, false), gapObs)).toBe(false);
  });

  it('accurately resolves sliding underneath low archways and flying over with Schnürlregen-Schirm', () => {
    const archDims = getObstacleDimensions('low_arch');
    const archObs = {
      id: 3,
      kind: 'low_arch' as const,
      lane: -1 as Lane,
      worldZ: 0,
      ...archDims,
      forgiven: false,
    };

    // Standing hits low arch
    expect(checkObstacleCollision(computePlayerBounds(-2.35, 0, false), archObs)).toBe(true);
    // Normal jump hits low arch (cannot jump over low archway)
    expect(checkObstacleCollision(computePlayerBounds(-2.35, 1.4, false), archObs)).toBe(true);
    // Sliding ducks cleanly underneath low arch!
    expect(checkObstacleCollision(computePlayerBounds(-2.35, 0, true), archObs)).toBe(false);
    // Schnürlregen-Schirm glide (y = 3.35) clears high above the arch!
    expect(checkObstacleCollision(computePlayerBounds(-2.35, 3.35, false), archObs)).toBe(false);
  });

  it('persists highscore, pretzels, mute setting, and outfit unlocks properly', () => {
    const mem = new MemoryStorage();
    const save1 = new SaveManager(mem);

    expect(save1.getData().selectedOutfit).toBe('kurier');
    save1.recordRun(1450, 175);
    expect(save1.unlockOrSelectOutfit('stadtentdecker').ok).toBe(true);
    save1.setMuted(true);

    // Reload from same storage backend
    const save2 = new SaveManager(mem);
    const data = save2.getData();
    expect(data.highScore).toBe(1450);
    expect(data.totalPretzels).toBe(25); // 175 - 150 cost
    expect(data.selectedOutfit).toBe('stadtentdecker');
    expect(data.unlockedOutfits).toContain('stadtentdecker');
    expect(data.muted).toBe(true);
  });
});
