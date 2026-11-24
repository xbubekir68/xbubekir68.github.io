import { BiomeConfig, BiomeId, Lane, OutfitConfig, OutfitId, PowerUpKind } from './types';

export const LANES: readonly Lane[] = [-1, 0, 1] as const;
export const LANE_WIDTH = 2.35;
export const ROAD_WIDTH = 7.8;

export const SEGMENT_LENGTH = 18;
export const VISIBLE_SEGMENTS_AHEAD = 8;
export const REMOVE_SEGMENT_Z = 22;

export const BASE_SPEED = 14.5;
export const MAX_SPEED = 29.5;
export const SPEED_ACCEL = 0.21;

export const LANE_SWITCH_SPEED = 14.5;
export const JUMP_VELOCITY = 12.8;
export const GRAVITY = 34.5;
export const FAST_FALL_GRAVITY = 82.0;
export const SLIDE_DURATION = 0.62;

export const PLAYER_STAND_HEIGHT = 1.72;
export const PLAYER_SLIDE_HEIGHT = 0.78;
export const PLAYER_HALF_WIDTH = 0.42;
export const PLAYER_HALF_DEPTH = 0.38;

export const UMBRELLA_GLIDE_HEIGHT = 3.35;
export const WATCH_SPEED_FACTOR = 0.62;
export const MAGNET_PULL_RADIUS = 9.2;

export const POWERUP_DURATIONS: Record<PowerUpKind, number> = {
  umbrella: 8.0,
  watch: 7.5,
  magnet: 9.0,
};

export const PRETZEL_SCORE_BONUS = 25;
export const DISTANCE_SCORE_MULTIPLIER = 3.2;

export const DANGER_RECOVERY_TIME = 7.5;
export const HIT_INVULNERABILITY_TIME = 1.45;

export const SEGMENTS_PER_BIOME = 11;

export const BIOME_ORDER: readonly BiomeId[] = [
  'getreidegasse',
  'salzachufer',
  'mirabellgarten',
  'festung',
  'daecher',
] as const;

export const BIOMES: Record<BiomeId, BiomeConfig> = {
  getreidegasse: {
    id: 'getreidegasse',
    name: 'Getreidegasse',
    subtitle: 'Historische Altstadtgasse',
    groundColor: 0x7c7268,
    curbColor: 0x9b8f82,
    fogColor: 0xf4c392,
    skyTopHex: '#3f5e8c',
    skyBottomHex: '#f6c38c',
    hasWaterSound: false,
    hasDrizzle: false,
    stepSurface: 'stone',
    allowedObstacles: ['crates', 'market_stall', 'barrier_low', 'low_arch', 'puddle_work'],
  },
  salzachufer: {
    id: 'salzachufer',
    name: 'Salzachufer',
    subtitle: 'Uferpromenade mit Festungsblick',
    groundColor: 0x858078,
    curbColor: 0xa8a196,
    fogColor: 0xf2c99d,
    skyTopHex: '#36658c',
    skyBottomHex: '#f5cb98',
    hasWaterSound: true,
    hasDrizzle: true,
    stepSurface: 'stone',
    allowedObstacles: ['bench_bike', 'barrier_low', 'puddle_work', 'crates', 'low_arch'],
  },
  mirabellgarten: {
    id: 'mirabellgarten',
    name: 'Mirabellgarten',
    subtitle: 'Barocke Beete & Brunnen',
    groundColor: 0xcbbfa6,
    curbColor: 0xdcd2bd,
    fogColor: 0xf6cca0,
    skyTopHex: '#436991',
    skyBottomHex: '#f8cfa0',
    hasWaterSound: true,
    hasDrizzle: false,
    stepSurface: 'gravel',
    allowedObstacles: ['bench_bike', 'barrier_low', 'low_arch', 'puddle_work', 'market_stall'],
  },
  festung: {
    id: 'festung',
    name: 'Festung Hohensalzburg',
    subtitle: 'Wehrmauern & Burghöfe',
    groundColor: 0x8d867c,
    curbColor: 0xbab2a6,
    fogColor: 0xf0be8c,
    skyTopHex: '#3b537a',
    skyBottomHex: '#f3bd86',
    hasWaterSound: false,
    hasDrizzle: false,
    stepSurface: 'stone',
    allowedObstacles: ['crates', 'low_arch', 'barrier_low', 'market_stall', 'puddle_work'],
  },
  daecher: {
    id: 'daecher',
    name: 'Altstadtdächer',
    subtitle: 'Kupferkuppeln & Schornsteine',
    groundColor: 0x6c5a52,
    curbColor: 0x8c503e,
    fogColor: 0xefb482,
    skyTopHex: '#33486e',
    skyBottomHex: '#f2b37c',
    hasWaterSound: false,
    hasDrizzle: true,
    stepSurface: 'roof',
    allowedObstacles: ['roof_gap', 'crates', 'low_arch', 'barrier_low'],
  },
};

export const OUTFITS: Record<OutfitId, OutfitConfig> = {
  gripkurier: {
    id:'gripkurier', name:'Griffige Schuhe', description:'Korallrote Jacke und helle Profilsohlen. Pfützen bremsen dich nur 0,65 statt 1,8 Sekunden.',
    cost:160,jacketColor:0xd86d52,accentColor:0xf5dab2,pantsColor:0x334d50,hatColor:0x267e73,hatStyle:'cap',swatchHex:'#d86d52',
  },
  paketprofi: {
    id:'paketprofi', name:'Paketprofi', description:'Violette Kurierjacke und große türkisfarbene Pakettasche. Ein neuer Look für erfahrene Zusteller.',
    cost:220,jacketColor:0x72619a,accentColor:0x38a399,pantsColor:0x394351,hatColor:0xdeb445,hatStyle:'explorer',swatchHex:'#72619a',
  },
  kurier: {
    id: 'kurier',
    name: 'Kurier',
    description: 'Flinke Altstadt-Botenjacke mit Umhängetasche und Schirmkappe.',
    cost: 0,
    jacketColor: 0x265c94,
    accentColor: 0xd64933,
    pantsColor: 0x373f4d,
    hatColor: 0xc83e2b,
    hatStyle: 'cap',
    swatchHex: '#265c94',
  },
  stadtentdecker: {
    id: 'stadtentdecker',
    name: 'Stadtentdecker',
    description: 'Salzburger Lodenjacke in Tannengrün mit Ockerschal und Filzhut.',
    cost: 60,
    jacketColor: 0x2f6148,
    accentColor: 0xdba038,
    pantsColor: 0x4d3c2e,
    hatColor: 0x3b523e,
    hatStyle: 'explorer',
    swatchHex: '#2f6148',
  },
  regenoutfit: {
    id: 'regenoutfit',
    name: 'Regenoutfit',
    description: 'Leuchtgelber Schnürlregen-Mantel mit Südwester und Reflektorstreifen.',
    cost: 120,
    jacketColor: 0xe6af24,
    accentColor: 0x25738a,
    pantsColor: 0x2b3642,
    hatColor: 0xd99e16,
    hatStyle: 'rainhat',
    swatchHex: '#e6af24',
  },
};

export const OUTFIT_ORDER: readonly OutfitId[] = [
  'kurier',
  'stadtentdecker',
  'regenoutfit',
  'gripkurier',
  'paketprofi',
] as const;
