import { describe, expect, it } from 'vitest';
import { SaveManager, StorageBackend } from '../src/storage';

class Memory implements StorageBackend {
  raw: string | null = null;
  getItem() {return this.raw;}
  setItem(_key:string,value:string) {this.raw=value;}
}
describe('Save migration and extended progression',()=>{
  it('preserves an existing v1 save while adding default preferences and challenges',()=>{
    const backend=new Memory();backend.raw=JSON.stringify({highScore:1234,totalPretzels:400,unlockedOutfits:['kurier','regenoutfit'],selectedOutfit:'regenoutfit',muted:true,tutorialSeen:true});
    const manager=new SaveManager(backend),data=manager.getData();
    expect(data.highScore).toBe(1234);expect(data.totalPretzels).toBe(400);expect(data.selectedOutfit).toBe('regenoutfit');expect(data.voiceVolume).toBe(0);
    manager.unlockOrSelectOutfit('gripkurier');manager.recordProgress(3,['Treppenprofi']);manager.setPreferences(.3,.2,true);
    const reloaded=new SaveManager(backend).getData();expect(reloaded.totalPretzels).toBe(240);expect(reloaded.challenges).toEqual(['Treppenprofi']);expect(reloaded.deliveries).toBe(3);expect(reloaded.reducedMotion).toBe(true);expect(reloaded.effectsVolume).toBe(.3);
  });
  it('still plays when storage is corrupt, unavailable or refuses writes',()=>{
    const backend=new Memory();backend.raw='not JSON';expect(new SaveManager(backend).getData().highScore).toBe(0);
    const m=new SaveManager({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}});
    expect(()=>m.recordRun(100,5)).not.toThrow();expect(m.getData().highScore).toBe(100);
    expect(new SaveManager(null).getData().challenges).toEqual([]);
  });
  it('does not expose mutable challenge or outfit arrays',()=>{
    const m=new SaveManager(null);m.recordProgress(1,['Treppenprofi']);m.getData().challenges.push('fake');
    expect(m.getData().challenges).toEqual(['Treppenprofi']);
  });
});
