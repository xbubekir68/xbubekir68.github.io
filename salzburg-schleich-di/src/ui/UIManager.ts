import { OUTFIT_ORDER, OUTFITS, POWERUP_DURATIONS } from '../constants';
import { GameEngine } from '../game/GameEngine';
import { GameStatus, HUDState, OutfitId, PowerUpKind, RunSummary } from '../types';
import { ICONS } from './icons';

const POWERUP_LABELS: Record<PowerUpKind, { label: string; icon: string }> = {
  umbrella: { label: 'Schnürlregen-Schirm', icon: ICONS.umbrella },
  watch: { label: 'Goldene Taschenuhr', icon: ICONS.watch },
  magnet: { label: 'Brezel-Magnet', icon: ICONS.magnet },
};

export class UIManager {
  private engine!: GameEngine;

  // Root layers
  private dangerVignette!: HTMLElement;
  private menuLayer!: HTMLElement;
  private hudLayer!: HTMLElement;
  private pauseModal!: HTMLElement;
  private gameoverModal!: HTMLElement;
  private outfitsModal!: HTMLElement;
  private tutorialModal!: HTMLElement;

  // Dynamic HUD elements
  private scoreValEl!: HTMLElement;
  private scoreMetaEl!: HTMLElement;
  private biomeTagEl!: HTMLElement;
  private dangerPillEl!: HTMLElement;
  private dangerFillEl!: HTMLElement;
  private pretzelCountEl!: HTMLElement;
  private powerUpsContainer!: HTMLElement;
  private muteButtons: HTMLButtonElement[] = [];

  // Menu dynamic badges
  private menuBestEl!: HTMLElement;
  private menuPretzelsEl!: HTMLElement;
  private outfitsBankEl!: HTMLElement;
  private outfitsListEl!: HTMLElement;

  // Game-over elements
  private goRecordBadge!: HTMLElement;
  private goScoreEl!: HTMLElement;
  private goBestEl!: HTMLElement;
  private goDistanceEl!: HTMLElement;
  private goPretzelsEl!: HTMLElement;
  private goHintEl!: HTMLElement;

  private pendingRunAfterTutorial = false;

  constructor(private readonly root: HTMLElement) {
    this.buildDOM();
  }

  public bindEngine(engine: GameEngine): void {
    this.engine = engine;
    this.syncMuteIcons();
    this.refreshMenuStats();
    const save=engine.saveManager.getData();
    (this.root.querySelector('#effects-volume') as HTMLInputElement).value=String(save.effectsVolume);
    (this.root.querySelector('#voice-volume') as HTMLInputElement).value=String(save.voiceVolume);
    (this.root.querySelector('#reduced-motion') as HTMLInputElement).checked=save.reducedMotion;
    engine.sound.setVolumes(save.effectsVolume,save.voiceVolume);
    document.body.classList.toggle('reduced-motion',save.reducedMotion);
  }

  private buildDOM(): void {
    this.root.innerHTML = `
      <div class="danger-vignette" id="danger-vignette"></div>

      <!-- START SCREEN -->
      <section class="screen-layer" id="menu-layer" data-testid="menu-screen">
        <div class="menu-top-row">
          <div class="stats-badges">
            <div class="stat-pill" title="Bestleistung">
              <span>Bestwert:</span>
              <strong id="menu-best">0</strong>
            </div>
            <div class="stat-pill" title="Gespeicherte Brezeln">
              ${ICONS.pretzel}
              <strong id="menu-pretzels">0</strong>
            </div>
          </div>
          <button class="btn btn-icon" data-action="toggle-mute" data-testid="menu-mute-btn" aria-label="Geräusche umschalten"></button>
        </div>

        <div class="hero-card">
          <span class="eyebrow">Eilzustellung durch Salzburg</span>
          <h1 class="game-title">Salzburg: Schleich di!</h1>
          <p class="game-subtitle">
            Du hast die Pakete. Die Kids haben E-Bikes. Und Mini-Maxi wettet, dass seine Gang dich vor der nächsten Lieferung erwischt. Zeig ihnen deine Stadt!
          </p>
          <div class="run-options" data-ui-interactive>
            <label>Streckencode <input id="track-code" value="SD2-SALZBURG" maxlength="20" spellcheck="false" aria-describedby="code-error"></label>
            <label>Auftrag <select id="parcel-kind"><option value="light">Leicht · 450 Punkte pro Lieferung</option><option value="large">Groß · 750 Punkte, langsamer, passt nicht unter Tore</option></select></label>
            <small id="code-error" role="status">Gleicher Code, gleiche Strecke. Neustart behält den Code.</small>
          </div>
          <div class="menu-actions">
            <button class="btn btn-primary" id="btn-play" data-testid="play-btn">
              ${ICONS.play}
              <span>Spielen</span>
            </button>
            <button class="btn btn-secondary" id="btn-open-outfits" data-testid="outfits-btn">
              ${ICONS.wardrobe}
              <span>Outfits</span>
            </button>
            <button class="btn btn-secondary" id="btn-open-help" data-testid="help-btn">
              <span>Steuerung</span>
            </button>
          </div>
        </div>
      </section>

      <!-- IN-GAME HUD -->
      <section class="hud-bar hidden" id="hud-layer" data-testid="hud-screen">
        <div class="hud-left">
          <div class="score-plaque">
            <div class="score-value" id="hud-score">0</div>
            <div class="score-meta" id="hud-meta">0 m · Rekord 0</div>
          </div>
          <div id="hud-delivery" class="stat-pill"></div>
          <div id="hud-gap" class="stat-pill"></div>
          <div class="biome-tag" id="hud-biome">Getreidegasse</div>
          <div class="danger-pill hidden" id="hud-danger">
            <span>Gang dicht hinter dir!</span>
            <div class="danger-bar-track"><div class="danger-bar-fill" id="hud-danger-fill"></div></div>
          </div>
        </div>

        <div class="hud-right">
          <div class="pretzel-counter" title="Gesammelte Brezeln">
            ${ICONS.pretzel}
            <span id="hud-pretzels">0</span>
          </div>
          <button class="btn btn-icon" data-action="toggle-mute" data-testid="hud-mute-btn" aria-label="Geräusche umschalten"></button>
          <button class="btn btn-icon" id="btn-pause" data-testid="pause-btn" aria-label="Spiel pausieren">
            ${ICONS.pause}
          </button>
        </div>
      </section>

      <div class="powerups-hud hidden" id="hud-powerups"></div>

      <div id="chase-caption" class="chase-caption hidden" role="status" aria-live="polite"></div>
      <div id="runner-actions" class="runner-actions hidden">
        <button class="btn" id="btn-look">↶ Blick zurück · Q</button>
        <button class="btn" id="btn-throw">Brezel werfen · B</button>
      </div>
      <!-- PAUSE MODAL -->
      <div class="modal-backdrop hidden" id="pause-modal" data-testid="pause-modal">
        <div class="modal-card">
          <h2 class="modal-title">Pause</h2>
          <p class="modal-lead">Kurze Verschnaufpause in Salzburg – das Paket ist noch sicher.</p>
          <div class="settings" data-ui-interactive>
            <label>Geräusche <input id="effects-volume" type="range" min="0" max="1" step="0.1"></label>
            <label>Stimmen (optional) <input id="voice-volume" type="range" min="0" max="1" step="0.1"></label>
            <label><input id="reduced-motion" type="checkbox"> Reduzierte Bewegung</label>
            <p>Keine Musik. Hinweise bleiben immer sichtbar.</p>
          </div>
          <div class="menu-actions">
            <button class="btn btn-primary" id="btn-resume" data-testid="resume-btn">
              ${ICONS.play}
              <span>Fortsetzen</span>
            </button>
            <button class="btn btn-secondary" id="btn-pause-restart" data-testid="pause-restart-btn">
              ${ICONS.restart}
              <span>Neustart</span>
            </button>
            <button class="btn btn-secondary" id="btn-pause-menu" data-testid="pause-menu-btn">
              <span>Startmenü</span>
            </button>
          </div>
        </div>
      </div>

      <!-- GAME OVER MODAL -->
      <div class="modal-backdrop hidden" id="gameover-modal" data-testid="gameover-modal">
        <div class="modal-card" style="text-align: center;">
          <div class="record-badge hidden" id="go-record">Neue Bestleistung!</div>
          <h2 class="modal-title" id="go-title">Eingeholt!</h2>
          <p class="modal-lead" id="go-hint">Paket im Anflug! Nächster Zustellversuch?</p>

          <p id="go-details"></p>
          <div class="summary-grid">
            <div class="summary-cell">
              <div class="summary-label">Punkte</div>
              <div class="summary-val" id="go-score">0</div>
            </div>
            <div class="summary-cell">
              <div class="summary-label">Bestleistung</div>
              <div class="summary-val" id="go-best">0</div>
            </div>
            <div class="summary-cell">
              <div class="summary-label">Strecke</div>
              <div class="summary-val" id="go-distance">0 m</div>
            </div>
            <div class="summary-cell">
              <div class="summary-label">Brezeln (+Gesamt)</div>
              <div class="summary-val" id="go-pretzels">0</div>
            </div>
          </div>

          <div class="menu-actions">
            <button class="btn btn-primary" id="btn-go-restart" data-testid="gameover-restart-btn">
              ${ICONS.restart}
              <span>Direkter Neustart</span>
            </button>
            <button class="btn btn-secondary" id="btn-go-outfits" data-testid="gameover-outfits-btn">
              ${ICONS.wardrobe}
              <span>Outfits</span>
            </button>
            <button class="btn btn-secondary" id="btn-go-menu" data-testid="gameover-menu-btn">
              <span>Menü</span>
            </button>
          </div>
        </div>
      </div>

      <!-- OUTFITS MODAL -->
      <div class="modal-backdrop hidden" id="outfits-modal" data-testid="outfits-modal">
        <div class="modal-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
            <h2 class="modal-title" style="margin:0;">Kurier-Outfits</h2>
            <div class="stat-pill">${ICONS.pretzel} <strong id="outfits-bank">0</strong></div>
          </div>
          <p class="modal-lead">Tausche gesammelte Brezeln gegen wetterfeste Salzburger Outfits ein.</p>
          <p id="challenge-progress"></p>
          <div class="outfit-list" id="outfits-list"></div>
          <div class="menu-actions">
            <button class="btn btn-primary" id="btn-close-outfits" data-testid="close-outfits-btn">Fertig</button>
          </div>
        </div>
      </div>

      <!-- FIRST-START / CONTROLS MODAL -->
      <div class="modal-backdrop hidden" id="tutorial-modal" data-testid="tutorial-modal">
        <div class="modal-card">
          <h2 class="modal-title">Ein Paket. Vier E-Bikes. Deine Stadt.</h2>
          <p class="modal-lead">
            Mini-Maxi rückt seinen viel zu großen Helm zurecht: „Bis zur nächsten Paketpost haben wir dich!“ Du schnappst dein Paket. Die Gang tritt in die Pedale. Los geht’s!
          </p>
          <div class="controls-grid">
            <div class="control-box">
              <strong>Tastatur</strong>
              <span><b>A / D</b> oder <b>◀ / ▶</b> Spurwechsel<br/><b>W / ▲ / Leertaste</b> Springen<br/><b>S / ▼</b> Rutschen · <b>P / Esc</b> Pause</span>
            </div>
            <div class="control-box">
              <strong>Smartphone</strong>
              <span><b>Links / Rechts wischen</b> Spurwechsel<br/><b>Nach oben wischen</b> Springen<br/><b>Nach unten wischen</b> Rutschen</span>
            </div>
            <div class="control-box">
              <strong>Du bist beweglicher</strong>
              <span>Die Räder sind auf freier Straße schneller. Nutze Treppen und Hindernisse! Q: Schulterblick · B: eine Brezel für Beni zurückwerfen. Paketpost: im mittleren Ring vorbeilaufen. Auf Kisten und am Mauerrand erneut springen zum Abstoßen.</span>
            </div>
            <div class="control-box">
              <strong>Power-ups</strong>
              <span><b>Schirm:</b> Arcade-Gleitflug über Hindernisse<br/><b>Taschenuhr:</b> Arcade-Zeitlupe für alle<br/><b>Magnet:</b> Zieht Brezeln an</span>
            </div>
          </div>
          <div class="menu-actions">
            <button class="btn btn-primary" id="btn-close-tutorial" data-testid="close-tutorial-btn">Szene überspringen · Loslaufen!</button>
          </div>
        </div>
      </div>
    `;

    this.dangerVignette = this.root.querySelector('#danger-vignette')!;
    this.menuLayer = this.root.querySelector('#menu-layer')!;
    this.hudLayer = this.root.querySelector('#hud-layer')!;
    this.pauseModal = this.root.querySelector('#pause-modal')!;
    this.gameoverModal = this.root.querySelector('#gameover-modal')!;
    this.outfitsModal = this.root.querySelector('#outfits-modal')!;
    this.tutorialModal = this.root.querySelector('#tutorial-modal')!;

    this.scoreValEl = this.root.querySelector('#hud-score')!;
    this.scoreMetaEl = this.root.querySelector('#hud-meta')!;
    this.biomeTagEl = this.root.querySelector('#hud-biome')!;
    this.dangerPillEl = this.root.querySelector('#hud-danger')!;
    this.dangerFillEl = this.root.querySelector('#hud-danger-fill')!;
    this.pretzelCountEl = this.root.querySelector('#hud-pretzels')!;
    this.powerUpsContainer = this.root.querySelector('#hud-powerups')!;

    this.menuBestEl = this.root.querySelector('#menu-best')!;
    this.menuPretzelsEl = this.root.querySelector('#menu-pretzels')!;
    this.outfitsBankEl = this.root.querySelector('#outfits-bank')!;
    this.outfitsListEl = this.root.querySelector('#outfits-list')!;

    this.goRecordBadge = this.root.querySelector('#go-record')!;
    this.goScoreEl = this.root.querySelector('#go-score')!;
    this.goBestEl = this.root.querySelector('#go-best')!;
    this.goDistanceEl = this.root.querySelector('#go-distance')!;
    this.goPretzelsEl = this.root.querySelector('#go-pretzels')!;
    this.goHintEl = this.root.querySelector('#go-hint')!;

    this.muteButtons = Array.from(this.root.querySelectorAll('[data-action="toggle-mute"]'));

    this.attachEvents();
  }

  private attachEvents(): void {
    this.root.querySelector('#btn-look')!.addEventListener('click',()=>this.engine.triggerManualAction('look'));
    this.root.querySelector('#btn-throw')!.addEventListener('click',()=>this.engine.triggerManualAction('throw'));
    for(const id of ['effects-volume','voice-volume','reduced-motion']) this.root.querySelector('#'+id)!.addEventListener('input',()=>{
      const effects=Number((this.root.querySelector('#effects-volume') as HTMLInputElement).value);
      const voices=Number((this.root.querySelector('#voice-volume') as HTMLInputElement).value);
      const reduced=(this.root.querySelector('#reduced-motion') as HTMLInputElement).checked;
      this.engine.saveManager.setPreferences(effects,voices,reduced); this.engine.sound.setVolumes(effects,voices);
      document.body.classList.toggle('reduced-motion',reduced);
    });
    this.root.querySelector('#btn-play')!.addEventListener('click', () => {
      try { this.engine.configureRun((this.root.querySelector('#track-code') as HTMLInputElement).value,(this.root.querySelector('#parcel-kind') as HTMLSelectElement).value==='large'); }
      catch(error) { this.root.querySelector('#code-error')!.textContent=(error as Error).message; return; }
      this.root.querySelector('#code-error')!.textContent='Gleicher Code, gleiche Strecke.';
      this.engine.sound.unlock();
      this.engine.sound.playUiClick();
      const save = this.engine.saveManager.getData();
      if (!save.tutorialSeen) {
        this.pendingRunAfterTutorial = true;
        this.tutorialModal.classList.remove('hidden');
      } else {
        this.engine.startNewRun();
      }
    });

    this.root.querySelector('#btn-open-outfits')!.addEventListener('click', () => {
      this.engine.sound.unlock();
      this.engine.sound.playUiClick();
      this.renderOutfitsModal();
      this.outfitsModal.classList.remove('hidden');
    });

    this.root.querySelector('#btn-close-outfits')!.addEventListener('click', () => {
      this.engine.sound.playUiClick();
      this.outfitsModal.classList.add('hidden');
      this.refreshMenuStats();
    });

    this.root.querySelector('#btn-open-help')!.addEventListener('click', () => {
      this.engine.sound.unlock();
      this.engine.sound.playUiClick();
      this.pendingRunAfterTutorial = false;
      this.tutorialModal.classList.remove('hidden');
    });

    this.root.querySelector('#btn-close-tutorial')!.addEventListener('click', () => {
      this.engine.sound.unlock();
      this.engine.sound.playUiClick();
      this.engine.saveManager.markTutorialSeen();
      this.tutorialModal.classList.add('hidden');
      if (this.pendingRunAfterTutorial) {
        this.pendingRunAfterTutorial = false;
        this.engine.startNewRun();
      }
    });

    for (const btn of this.muteButtons) {
      btn.addEventListener('click', () => {
        this.engine.sound.unlock();
        const nextMuted = !this.engine.sound.isMuted();
        this.engine.sound.setMuted(nextMuted);
        this.engine.saveManager.setMuted(nextMuted);
        this.syncMuteIcons();
        if (!nextMuted) {
          this.engine.sound.playUiClick();
        }
      });
    }

    this.root.querySelector('#btn-pause')!.addEventListener('click', () => {
      this.engine.sound.playUiClick();
      this.engine.pauseGame();
    });

    this.root.querySelector('#btn-resume')!.addEventListener('click', () => {
      this.engine.sound.playUiClick();
      this.engine.resumeGame();
    });

    this.root.querySelector('#btn-pause-restart')!.addEventListener('click', () => {
      this.engine.sound.playUiClick();
      this.engine.startNewRun();
    });

    this.root.querySelector('#btn-pause-menu')!.addEventListener('click', () => {
      this.engine.sound.playUiClick();
      this.engine.returnToMenu();
      this.refreshMenuStats();
    });

    this.root.querySelector('#btn-go-restart')!.addEventListener('click', () => {
      this.engine.sound.playUiClick();
      this.engine.startNewRun();
    });

    this.root.querySelector('#btn-go-outfits')!.addEventListener('click', () => {
      this.engine.sound.playUiClick();
      this.renderOutfitsModal();
      this.outfitsModal.classList.remove('hidden');
    });

    this.root.querySelector('#btn-go-menu')!.addEventListener('click', () => {
      this.engine.sound.playUiClick();
      this.engine.returnToMenu();
      this.refreshMenuStats();
    });
  }

  private syncMuteIcons(): void {
    const muted = this.engine.sound.isMuted();
    for (const btn of this.muteButtons) {
      btn.innerHTML = muted ? ICONS.soundOff : ICONS.soundOn;
      btn.title = muted ? 'Ton einschalten' : 'Stummschalten';
    }
  }

  public refreshMenuStats(): void {
    const save = this.engine.saveManager.getData();
    this.menuBestEl.textContent = save.highScore.toLocaleString('de-AT');
    this.menuPretzelsEl.textContent = save.totalPretzels.toLocaleString('de-AT');
  }

  private renderOutfitsModal(): void {
    const save = this.engine.saveManager.getData();
    this.outfitsBankEl.textContent = save.totalPretzels.toLocaleString('de-AT');
    this.outfitsListEl.innerHTML = '';
    this.root.querySelector('#challenge-progress')!.textContent = 'Herausforderungen: 3 saubere Lieferungen · ganze Gang abhängen · 3 Parkourketten · Treppenweg. Erreicht: ' + (save.challenges.join(', ') || 'noch keine') + ' · Lieferungen insgesamt: ' + save.deliveries;

    for (const id of OUTFIT_ORDER) {
      const cfg = OUTFITS[id];
      const unlocked = save.unlockedOutfits.includes(id);
      const selected = save.selectedOutfit === id;
      const canAfford = save.totalPretzels >= cfg.cost;

      const row = document.createElement('div');
      row.className = `outfit-item${selected ? ' selected' : ''}`;

      let btnLabel = 'Auswählen';
      let disabled = false;
      if (selected) {
        btnLabel = 'Aktiv';
        disabled = true;
      } else if (!unlocked) {
        btnLabel = `${cfg.cost} Brezeln`;
        disabled = !canAfford;
      }

      row.innerHTML = `
        <div class="outfit-swatch" style="background:${cfg.swatchHex};"></div>
        <div class="outfit-info">
          <div class="outfit-name">${cfg.name}</div>
          <div class="outfit-desc">${cfg.description}</div>
        </div>
        <button class="btn ${selected ? 'btn-secondary' : 'btn-primary'}" style="padding:0.5rem 1rem; font-size:0.86rem;" data-outfit-btn="${id}" ${disabled ? 'disabled' : ''}>
          ${btnLabel}
        </button>
      `;

      const actionBtn = row.querySelector(`[data-outfit-btn="${id}"]`) as HTMLButtonElement;
      if (!disabled) {
        actionBtn.style.opacity = '1';
        actionBtn.addEventListener('click', () => {
          this.handleOutfitSelection(id);
        });
      } else {
        actionBtn.style.opacity = '0.58';
        actionBtn.style.cursor = 'default';
      }

      this.outfitsListEl.appendChild(row);
    }
  }

  private handleOutfitSelection(id: OutfitId): void {
    const res = this.engine.saveManager.unlockOrSelectOutfit(id);
    if (res.ok) {
      this.engine.sound.playUiClick();
      this.engine.applyOutfit(id);
      this.renderOutfitsModal();
      this.refreshMenuStats();
    }
  }

  public handleStatusChange(status: GameStatus): void {
    this.root.querySelector('#runner-actions')!.classList.toggle('hidden',status!=='playing');
    this.root.querySelector('#chase-caption')!.classList.toggle('hidden',status!=='playing');
    this.menuLayer.classList.toggle('hidden', status !== 'menu');
    this.hudLayer.classList.toggle('hidden', status !== 'playing' && status !== 'paused');
    this.powerUpsContainer.classList.toggle('hidden', status !== 'playing' && status !== 'paused');
    this.pauseModal.classList.toggle('hidden', status !== 'paused');
    this.gameoverModal.classList.toggle('hidden', status !== 'gameover');

    if (status !== 'playing') {
      this.dangerVignette.classList.remove('active');
    }
  }

  public updateHud(hud: HUDState): void {
    this.root.querySelector('#hud-gap')!.textContent = hud.gap>=999?'Gang abgehängt!':Math.floor(hud.gap)+' m Vorsprung';
    this.root.querySelector('#hud-delivery')!.textContent = hud.delivery;
    const caption=this.root.querySelector('#chase-caption')!;
    if(caption.textContent!==hud.message) caption.textContent=hud.message;
    (this.root.querySelector('#btn-throw') as HTMLButtonElement).disabled=hud.runPretzels<=0;
    this.scoreValEl.textContent = hud.score.toLocaleString('de-AT');
    this.scoreMetaEl.textContent = `${hud.distanceMeters} m · Rekord ${hud.highScore.toLocaleString('de-AT')}`;
    this.pretzelCountEl.textContent = String(hud.runPretzels);

    if (this.biomeTagEl.textContent !== hud.biomeName) {
      this.biomeTagEl.textContent = hud.biomeName;
    }
    if (hud.biomeChanged) {
      this.biomeTagEl.classList.add('pop');
      setTimeout(() => this.biomeTagEl.classList.remove('pop'), 550);
    }

    const inDanger = hud.dangerRatio > 0.01;
    this.dangerPillEl.classList.toggle('hidden', !inDanger);
    this.dangerVignette.classList.toggle('active', inDanger);
    if (inDanger) {
      this.dangerFillEl.style.width = `${Math.round(hud.dangerRatio * 100)}%`;
    }

    // Active Power-Up timer chips
    const activeEntries = (['umbrella', 'watch', 'magnet'] as const).filter(
      (k) => hud.powerUps[k] > 0.02
    );

    if (activeEntries.length === 0) {
      if (this.powerUpsContainer.innerHTML !== '') {
        this.powerUpsContainer.innerHTML = '';
      }
      return;
    }

    this.powerUpsContainer.innerHTML = activeEntries
      .map((kind) => {
        const remaining = hud.powerUps[kind];
        const pct = Math.max(0, Math.min(100, (remaining / POWERUP_DURATIONS[kind]) * 100));
        const meta = POWERUP_LABELS[kind];
        return `
          <div class="powerup-chip" data-powerup="${kind}">
            ${meta.icon}
            <span>${meta.label}</span>
            <div class="powerup-timer-track">
              <div class="powerup-timer-fill" style="width:${pct.toFixed(1)}%"></div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  public showGameOver(summary: RunSummary): void {
    this.handleStatusChange('gameover');
    this.root.querySelector('#go-title')!.textContent = summary.reason.includes('Karton') ? 'Ab in die Kartons!' : summary.reason.includes('Markt') ? 'Marktstand im Anflug!' : summary.reason.includes('Paket verloren') ? 'Paket auf Abwegen!' : 'Eingeholt!';
    this.root.querySelector('#go-details')!.textContent=summary.deliveries+' Lieferungen · '+summary.spent+' Brezeln eingesetzt · '+summary.highlight+' · '+summary.trackCode+' · Erreicht: '+(summary.challenges.join(', ')||'weiterüben!');
    this.goRecordBadge.classList.toggle('hidden', !summary.isNewRecord);
    this.goScoreEl.textContent = summary.score.toLocaleString('de-AT');
    this.goBestEl.textContent = summary.highScore.toLocaleString('de-AT');
    this.goDistanceEl.textContent = `${summary.distanceMeters.toLocaleString('de-AT')} m`;
    this.goPretzelsEl.textContent = `+${summary.runPretzels} (${summary.totalPretzels})`;

    this.goHintEl.textContent = summary.reason;
  }
}
