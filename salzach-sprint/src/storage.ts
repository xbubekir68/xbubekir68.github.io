import { OUTFITS } from './constants';
import { OutfitId, SaveData } from './types';

const STORAGE_KEY = 'salzach_sprint_save_v1';

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
  tutorialSeen: false,
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

  public markTutorialSeen(): void {
    if (!this.data.tutorialSeen) {
      this.data.tutorialSeen = true;
      this.persist();
    }
  }
}
