import { BIOMES, BIOME_ORDER, SEGMENT_LENGTH, SEGMENTS_PER_BIOME } from '../constants';

export const TRACK_VERSION = 'SD2';
export function trackCode(input: string): string {
  const code = input.trim().toUpperCase();
  if (!/^SD2-[A-Z0-9]{1,16}$/.test(code)) throw new Error('Bitte einen Code wie SD2-SALZBURG eingeben. Andere Versionen sind nicht vergleichbar.');
  return code;
}
export function seededRandom(code: string): () => number {
  let seed = 2166136261;
  for (const c of code) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619);
  return () => { seed += 0x6D2B79F5; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function segmentAt(s: number): number { return Math.max(0, Math.floor((s + 14) / SEGMENT_LENGTH)); }
export function isDelivery(i: number): boolean { return i > 2 && i % 9 === 0; }
export function isFork(i: number): boolean { return i > 5 && i % 9 === 6; }
export function terrainAt(s: number, x: number) {
  const i = segmentAt(s);
  const biome = BIOME_ORDER[Math.floor(i / SEGMENTS_PER_BIOME) % BIOME_ORDER.length];
  const local = s + 14 - i * SEGMENT_LENGTH;
  const stairs = isFork(i) && x < -1.35 && local > 3 && local < 15;
  // A visible raised stair bridge, ascent and descent, with the same height function for everybody.
  const height = stairs ? Math.max(0, Math.min(1, (local - 3) / 3, (15 - local) / 3)) * .65 : 0;
  return { wet: BIOMES[biome].hasDrizzle, narrow: biome === 'getreidegasse' || stairs, stairs, height, biome, index: i, local };
}
