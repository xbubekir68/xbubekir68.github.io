import {
  LANE_WIDTH,
  PLAYER_HALF_DEPTH,
  PLAYER_HALF_WIDTH,
  PLAYER_SLIDE_HEIGHT,
  PLAYER_STAND_HEIGHT,
} from '../constants';
import { ActiveObstacleData, CollisionBox, ObstacleKind } from '../types';

export function getObstacleDimensions(kind: ObstacleKind): {
  halfWidth: number;
  halfDepth: number;
  minY: number;
  maxY: number;
  requiresSlide: boolean;
  isGap: boolean;
} {
  switch (kind) {
    case 'crates':
      return {
        halfWidth: 0.78,
        halfDepth: 0.68,
        minY: 0,
        maxY: 0.92,
        requiresSlide: false,
        isGap: false,
      };
    case 'market_stall':
      return {
        halfWidth: 0.92,
        halfDepth: 1.05,
        minY: 0,
        maxY: 2.55,
        requiresSlide: false,
        isGap: false,
      };
    case 'barrier_low':
      return {
        halfWidth: 0.88,
        halfDepth: 0.35,
        minY: 0,
        maxY: 0.88,
        requiresSlide: false,
        isGap: false,
      };
    case 'bench_bike':
      return {
        halfWidth: 0.86,
        halfDepth: 0.58,
        minY: 0,
        maxY: 0.9,
        requiresSlide: false,
        isGap: false,
      };
    case 'low_arch':
      return {
        halfWidth: 0.96,
        halfDepth: 0.52,
        minY: 1.06,
        maxY: 2.85,
        requiresSlide: true,
        isGap: false,
      };
    case 'puddle_work':
      return {
        halfWidth: 0.84,
        halfDepth: 0.75,
        minY: 0,
        maxY: 0.58,
        requiresSlide: false,
        isGap: false,
      };
    case 'roof_gap':
      return {
        halfWidth: 0.98,
        halfDepth: 1.55,
        minY: -2.0,
        maxY: 0.12,
        requiresSlide: false,
        isGap: true,
      };
  }
}

export function computePlayerBounds(
  playerX: number,
  playerY: number,
  isSliding: boolean
): CollisionBox {
  const effectiveSliding = isSliding && playerY < 0.35;
  const height = effectiveSliding ? PLAYER_SLIDE_HEIGHT : PLAYER_STAND_HEIGHT;

  return {
    minX: playerX - PLAYER_HALF_WIDTH,
    maxX: playerX + PLAYER_HALF_WIDTH,
    minY: playerY,
    maxY: playerY + height,
    minZ: -PLAYER_HALF_DEPTH,
    maxZ: PLAYER_HALF_DEPTH,
  };
}

export function checkObstacleCollision(
  player: CollisionBox,
  obs: ActiveObstacleData
): boolean {
  if (obs.forgiven) return false;

  const obsCenterX = obs.lane * LANE_WIDTH;
  const obsMinX = obsCenterX - obs.halfWidth;
  const obsMaxX = obsCenterX + obs.halfWidth;
  if (player.maxX <= obsMinX || player.minX >= obsMaxX) {
    return false;
  }

  const obsMinZ = obs.worldZ - obs.halfDepth;
  const obsMaxZ = obs.worldZ + obs.halfDepth;
  if (player.maxZ <= obsMinZ || player.minZ >= obsMaxZ) {
    return false;
  }

  if (obs.isGap) {
    // Rooftop gap: player falls/trips if feet are near roof level over the gap
    return player.minY <= obs.maxY;
  }

  // Standard 3D vertical overlap with slight forgiveness margin
  const verticalOverlap = player.minY < obs.maxY - 0.06 && player.maxY > obs.minY + 0.04;
  return verticalOverlap;
}
