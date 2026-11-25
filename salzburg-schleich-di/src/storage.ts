import { OUTFITS } from './constants';
import { OutfitId, SaveData } from './types';

const STORAGE_KEY = 'salzach_sprint_save_v1';
export const CHALLENGE_REWARD = 50;

export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_SAVE: SaveData = {
  highScore: 0,
  totalPretzels: 0,
  unlockedOutfits: ['kurier'],
  selectedOutfit: 'kurier',
  muted: false,
  tutorialSeen: false, effectsVolume: .8, voiceVolume: 0, reducedMotion: false, challenges: [], deliveries: 0,
};

function getDefaultBackend(): StorageBackend | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export class SaveManager {
  private backend: StorageBackend | null;
  private data: SaveData;

  constructor(backend?: StorageBackend | null) {
    this.backend = backend !== undefined ? backend : getDefaultBackend();
    this.data = this.read();
  }

  private read(): SaveData {
    if (!this.backend) {
      return { ...DEFAULT_SAVE, unlockedOutfits: [...DEFAULT_SAVE.unlockedOutfits] };
    }
    try {
      const raw = this.backend.getItem(STORAGE_KEY);
      if (!raw) {
        return { ...DEFAULT_SAVE, unlockedOutfits: [...DEFAULT_SAVE.unlockedOutfits] };
      }
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      const validOutfits: OutfitId[] = Array.isArray(parsed.unlockedOutfits)
        ? parsed.unlockedOutfits.filter((id): id is OutfitId => id in OUTFITS)
        : ['kurier'];
      if (!validOutfits.includes('kurier')) {
        validOutfits.unshift('kurier');
      }
      const selected: OutfitId =
        parsed.selectedOutfit && validOutfits.includes(parsed.selectedOutfit)
          ? parsed.selectedOutfit
          : 'kurier';

      return {
        highScore:
          typeof parsed.highScore === 'number' && Number.isFinite(parsed.highScore)
            ? Math.max(0, Math.floor(parsed.highScore))
            : 0,
        totalPretzels:
          typeof parsed.totalPretzels === 'number' && Number.isFinite(parsed.totalPretzels)
            ? Math.max(0, Math.floor(parsed.totalPretzels))
            : 0,
        unlockedOutfits: validOutfits,
        selectedOutfit: selected,
        muted: Boolean(parsed.muted),
        tutorialSeen: Boolean(parsed.tutorialSeen),
        effectsVolume: typeof parsed.effectsVolume === 'number' && Number.isFinite(parsed.effectsVolume) ? Math.max(0, Math.min(1, parsed.effectsVolume)) : .8,
        voiceVolume: typeof parsed.voiceVolume === 'number' && Number.isFinite(parsed.voiceVolume) ? Math.max(0, Math.min(1, parsed.voiceVolume)) : 0,
        reducedMotion: Boolean(parsed.reducedMotion),
        challenges: Array.isArray(parsed.challenges) ? parsed.challenges.filter(c => typeof c === 'string') : [],
        deliveries: Number.isFinite(parsed.deliveries) ? Math.max(0, Math.floor(parsed.deliveries!)) : 0,
      };
    } catch {
      return { ...DEFAULT_SAVE, unlockedOutfits: [...DEFAULT_SAVE.unlockedOutfits] };
    }
  }

  private persist(): void {
    if (!this.backend) return;
    try {
      this.backend.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }

  public getData(): SaveData {
    return {
      ...this.data,
      challenges: [...this.data.challenges],
      unlockedOutfits: [...this.data.unlockedOutfits],
    };
  }

  public recordRun(score: number, collectedPretzels: number): { isNewRecord: boolean } {
    const cleanScore = Math.max(0, Math.floor(score));
    const cleanPretzels = Math.max(0, Math.floor(collectedPretzels));
    const isNewRecord = cleanScore > this.data.highScore;
    if (isNewRecord) {
      this.data.highScore = cleanScore;
    }
    this.data.totalPretzels += cleanPretzels;
    this.persist();
    return { isNewRecord };
  }

  public unlockOrSelectOutfit(id: OutfitId): { ok: boolean; reason?: string } {
    const cfg = OUTFITS[id];
    if (!cfg) return { ok: false, reason: 'Unbekanntes Outfit' };

    if (this.data.unlockedOutfits.includes(id)) {
      this.data.selectedOutfit = id;
      this.persist();
      return { ok: true };
    }

    if (this.data.totalPretzels < cfg.cost) {
      return { ok: false, reason: 'Noch nicht genug Brezeln' };
    }

    this.data.totalPretzels -= cfg.cost;
    this.data.unlockedOutfits.push(id);
    this.data.selectedOutfit = id;
    this.persist();
    return { ok: true };
  }

  public setMuted(muted: boolean): void {
    this.data.muted = muted;
    this.persist();
  }

  public setPreferences(effectsVolume: number, voiceVolume: number, reducedMotion: boolean): void {
    Object.assign(this.data, {effectsVolume, voiceVolume, reducedMotion}); this.persist();
  }
  /** Records a run's deliveries and challenges; each challenge reached for the first time pays 50 pretzels. Returns those new ones. */
  public recordProgress(deliveries: number, challenges: string[]): string[] {
    const fresh = [...new Set(challenges)].filter(c => !this.data.challenges.includes(c));
    this.data.deliveries += deliveries;
    this.data.totalPretzels += fresh.length * CHALLENGE_REWARD;
    this.data.challenges = [...this.data.challenges, ...fresh]; this.persist();
    return fresh;
  }
  public markTutorialSeen(): void {
    if (!this.data.tutorialSeen) {
      this.data.tutorialSeen = true;
      this.persist();
    }
  }
}
