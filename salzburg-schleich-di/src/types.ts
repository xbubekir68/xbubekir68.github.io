export type Lane = -1 | 0 | 1;

export type BiomeId =
  | 'getreidegasse'
  | 'salzachufer'
  | 'mirabellgarten'
  | 'festung'
  | 'daecher';

export type ObstacleKind =
  | 'crates'
  | 'market_stall'
  | 'barrier_low'
  | 'bench_bike'
  | 'low_arch'
  | 'puddle_work'
  | 'pedestrian'
  | 'roof_gap'
  | 'high_wall';

export type PowerUpKind = 'umbrella' | 'watch' | 'magnet';

export type OutfitId = 'kurier' | 'stadtentdecker' | 'regenoutfit' | 'gripkurier' | 'paketprofi';

export type GameStatus = 'menu' | 'playing' | 'paused' | 'gameover';

export interface OutfitConfig {
  id: OutfitId;
  name: string;
  description: string;
  cost: number;
  jacketColor: number;
  accentColor: number;
  pantsColor: number;
  hatColor: number;
  hatStyle: 'cap' | 'explorer' | 'rainhat';
  swatchHex: string;
}

export interface BiomeConfig {
  id: BiomeId;
  name: string;
  subtitle: string;
  groundColor: number;
  curbColor: number;
  fogColor: number;
  skyTopHex: string;
  skyBottomHex: string;
  hasWaterSound: boolean;
  hasDrizzle: boolean;
  stepSurface: 'stone' | 'gravel' | 'roof' | 'wood';
  allowedObstacles: ObstacleKind[];
}

export interface ObstacleSpec {
  lane: Lane;
  localZ: number;
  kind: ObstacleKind;
}

export interface PretzelSpec {
  lane: Lane;
  localZ: number;
  y: number;
}

export interface PowerUpSpec {
  lane: Lane;
  localZ: number;
  y: number;
  kind: PowerUpKind;
}

export interface SegmentPlan {
  biome: BiomeId;
  isTransition: boolean;
  obstacles: ObstacleSpec[];
  pretzels: PretzelSpec[];
  powerUps: PowerUpSpec[];
  safeLanesOut: Lane[];
}

export interface CollisionBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface ActiveObstacleData {
  id: number;
  kind: ObstacleKind;
  lane: Lane;
  worldZ: number;
  centerX?: number;
  halfWidth: number;
  halfDepth: number;
  minY: number;
  maxY: number;
  requiresSlide: boolean;
  isGap: boolean;
  forgiven: boolean;
}

export interface ActivePowerUps {
  umbrella: number;
  watch: number;
  magnet: number;
}

export interface SaveData {
  highScore: number;
  totalPretzels: number;
  unlockedOutfits: OutfitId[];
  selectedOutfit: OutfitId;
  muted: boolean;
  tutorialSeen: boolean;
  effectsVolume: number;
  voiceVolume: number;
  reducedMotion: boolean;
  challenges: string[];
  deliveries: number;
}

export interface HUDState {
  score: number;
  highScore: number;
  distanceMeters: number;
  runPretzels: number;
  totalPretzels: number;
  biomeName: string;
  biomeChanged: boolean;
  dangerRatio: number; // 0 = safe, >0 = recovery active (1 -> 0)
  powerUps: ActivePowerUps;
  speedKmh: number;
  gap: number;
  delivery: string;
  message: string;
  trackCode: string;
  playerX: number;
  gang: { name: string; x: number; gap: number }[];
}

export interface RunSummary {
  deliveries: number;
  spent: number;
  reason: string;
  highlight: string;
  trackCode: string;
  challenges: string[];
  newChallenges: string[];
  score: number;
  highScore: number;
  isNewRecord: boolean;
  distanceMeters: number;
  runPretzels: number;
  totalPretzels: number;
}
