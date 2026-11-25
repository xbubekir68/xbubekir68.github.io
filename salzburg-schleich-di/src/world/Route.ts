import { BIOMES, BIOME_ORDER, SEGMENT_LENGTH, SEGMENTS_PER_BIOME } from '../constants';
import { BiomeId } from '../types';

export const TRACK_VERSION = 'SD3';
export function trackCode(input: string): string {
  const code = input.trim().toUpperCase();
  if (!/^SD3-[A-Z0-9]{1,16}$/.test(code)) throw new Error('Bitte einen Code wie SD3-SALZBURG eingeben. Andere Versionen sind nicht vergleichbar.');
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
export function biomeAt(i: number): BiomeId { return BIOME_ORDER[Math.floor(i / SEGMENTS_PER_BIOME) % BIOME_ORDER.length]; }
export function isPedestrian(i: number): boolean { return i > 10 && i % 13 === 7 && biomeAt(i) !== 'daecher' && !isFork(i + 1) && !isFork(i - 1); }
/** Segments with a fixed layout (start, delivery, fork, pedestrian); patterns keep clear of them. */
export function isSpecial(i: number): boolean { return i <= 1 || isDelivery(i) || isFork(i) || isPedestrian(i); }
// Each district names its own fork: left = stairs (bikes must push), right = open fast lane (fast for everybody).
export const FORKS: Record<BiomeId, [string, string]> = {
  getreidegasse: ['Durchhaus-Stiege', 'Gasse'],
  salzachufer: ['Kaistiege', 'Uferweg'],
  mirabellgarten: ['Rosenhügel-Stufen', 'Allee'],
  festung: ['Wehrgang-Stiege', 'Burghof'],
  daecher: ['Gaubenstiege', 'Dachfirst'],
};
export function terrainAt(s: number, x: number) {
  const i = segmentAt(s);
  const biome = biomeAt(i);
  const local = s + 14 - i * SEGMENT_LENGTH;
  const stairs = isFork(i) && x < -1.35 && local > 3 && local < 15;
  const boost = isFork(i) && x > 1.35 && local > 3 && local < 15;
  // A visible raised stair bridge, ascent and descent, with the same height function for everybody.
  const height = stairs ? Math.max(0, Math.min(1, (local - 3) / 3, (15 - local) / 3)) * .65 : 0;
  return { wet: BIOMES[biome].hasDrizzle, narrow: biome === 'getreidegasse' || stairs, stairs, boost, height, biome, index: i, local };
}
