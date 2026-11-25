import { OUTFIT_ORDER, OUTFITS, POWERUP_DURATIONS } from '../constants';
import { GameEngine } from '../game/GameEngine';
import { GameStatus, HUDState, OutfitId, PowerUpKind, RunSummary } from '../types';
import { ICONS } from './icons';
import { CHALLENGE_REWARD } from '../storage';

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
  private biomeFadeTimer = 0;
  private radarEl!: HTMLElement;
  private radarYouEl!: HTMLElement;
  private radarDots: HTMLElement[] = [];
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
    // Touch devices see swipe help first and buttons without keyboard hints.
    document.body.classList.toggle('touch', window.matchMedia?.('(pointer: coarse)').matches ?? false);
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
            <label>Streckencode <input id="track-code" value="SD3-SALZBURG" maxlength="20" spellcheck="false" aria-describedby="code-error"></label>
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
          <div class="hud-pills">
            <div id="hud-delivery" class="stat-pill"></div>
            <div id="hud-gap" class="stat-pill"></div>
          </div>
          <div class="biome-tag" id="hud-biome">Getreidegasse</div>
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
      <div id="gang-radar" class="gang-radar hidden" aria-hidden="true">
        <span class="radar-lane"></span><span class="radar-lane"></span>
        <span class="radar-you"></span>
        <span class="radar-dot" style="--c:#f7b52c">M</span>
        <span class="radar-dot" style="--c:#ef6b50">T</span>
        <span class="radar-dot" style="--c:#41a99a">G</span>
        <span class="radar-dot" style="--c:#8694d2">B</span>
      </div>
      <div id="runner-actions" class="runner-actions hidden">
        <button class="btn" id="btn-look">↶ Blick zurück<span class="key"> · Q</span></button>
        <button class="btn" id="btn-throw">Brezel werfen<span class="key"> · B</span></button>
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
            Mini-Maxi rückt seinen viel zu großen Helm zurecht: „Bis zur nächsten Paketpost haben wir dich!“ Du schnappst dein Paket, die Gang tritt in die Pedale.
          </p>
          <div class="controls-grid">
            <div class="control-box ctrl-keys">
              <strong>Tastatur</strong>
              <span><b>A / D</b> oder <b>◀ / ▶</b> Spur wechseln<br/><b>W / ▲ / Leertaste</b> springen<br/><b>S / ▼</b> rutschen · <b>P / Esc</b> Pause<br/><b>Q</b> Blick zurück · <b>B</b> Brezel werfen</span>
            </div>
            <div class="control-box ctrl-touch">
              <strong>Smartphone</strong>
              <span><b>Links / rechts wischen</b> Spur wechseln<br/><b>Hoch wischen</b> springen<br/><b>Runter wischen</b> rutschen</span>
            </div>
            <div class="control-box">
              <strong>So hängst du die Gang ab</strong>
              <span>Auf freier Straße sind die Räder schneller. Treppen, Tore und Mauern bremsen sie stärker als dich. Zwei Zusammenstöße in 10 Sekunden werfen dich um. Hohe Mauer: springen und an der Mauer nochmal springen. Paketpost: durch den Ring in der Mitte.</span>
            </div>
            <div class="control-box">
              <strong>Hilfen</strong>
              <span><b>Brezel werfen:</b> Der nächste Fahrer bis 30 m hinter dir hält zum Essen an.<br/><b>Schirm:</b> 8 s über alle Hindernisse schweben<br/><b>Taschenuhr:</b> 7,5 s Zeitlupe für alle<br/><b>Magnet:</b> zieht 9 s lang Brezeln an</span>
            </div>
          </div>
          <div class="menu-actions tutorial-actions">
            <button class="btn btn-primary" id="btn-close-tutorial" data-testid="close-tutorial-btn">Los geht’s!</button>
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
    this.radarEl = this.root.querySelector('#gang-radar')!;
    this.radarYouEl = this.root.querySelector('.radar-you')!;
    this.radarDots = Array.from(this.root.querySelectorAll('.radar-dot'));
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
    this.root.querySelector('#challenge-progress')!.textContent = `Herausforderungen (beim ersten Mal je ${CHALLENGE_REWARD} Brezeln): 3 saubere Lieferungen · alle vier gleichzeitig 40 m abhängen, ohne eingeholt zu werden · 3 Parkourketten · Treppenweg. Erreicht: ` + (save.challenges.join(', ') || 'noch keine') + ' · Lieferungen insgesamt: ' + save.deliveries;

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
    this.radarEl.classList.toggle('hidden', status !== 'playing');
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
    const gapEl = this.root.querySelector('#hud-gap')!;
    gapEl.textContent = hud.gap >= 40 ? 'Gang abgehängt – sie suchen eine Abkürzung' : `Gang ${Math.floor(hud.gap)} m hinter dir`;
    gapEl.classList.toggle('danger', hud.gap < 8);
    // Rear radar: you at the top, each rider on its lane, closer riders nearer to you.
    this.radarYouEl.style.left = `${50 + hud.playerX / 2.35 * 33}%`;
    hud.gang.forEach((g, i) => {
      const dot = this.radarDots[i];
      dot.style.left = `${50 + g.x / 2.35 * 33}%`;
      dot.style.top = `${12 + Math.min(30, Math.max(0, g.gap)) / 30 * 40}px`;
      dot.classList.toggle('far', g.gap > 30);
      dot.classList.toggle('close', g.gap < 8);
    });
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
      // The district name shows on arrival and then gets out of the way.
      this.biomeTagEl.classList.remove('faded');
      this.biomeTagEl.classList.add('pop');
      setTimeout(() => this.biomeTagEl.classList.remove('pop'), 550);
      clearTimeout(this.biomeFadeTimer);
      this.biomeFadeTimer = window.setTimeout(() => this.biomeTagEl.classList.add('faded'), 3500);
    }

    this.dangerVignette.classList.toggle('active', hud.dangerRatio > 0.01);

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
    this.root.querySelector('#go-title')!.textContent = summary.reason.includes('Dachlücke') ? 'Ab in die Kartons!' : summary.reason.includes('Hingefallen') ? 'Hingefallen!' : 'Eingeholt!';
    const fresh = summary.newChallenges;
    this.root.querySelector('#go-details')!.textContent = `${summary.deliveries} Lieferungen · ${summary.spent} Brezeln geworfen · ${summary.highlight} · ${summary.trackCode}`
      + (fresh.length ? ` · Neu geschafft: ${fresh.join(', ')} (+${fresh.length * CHALLENGE_REWARD} Brezeln)` : summary.challenges.length ? ` · Geschafft: ${summary.challenges.join(', ')}` : '');
    this.goRecordBadge.classList.toggle('hidden', !summary.isNewRecord);
    this.goScoreEl.textContent = summary.score.toLocaleString('de-AT');
    this.goBestEl.textContent = summary.highScore.toLocaleString('de-AT');
    this.goDistanceEl.textContent = `${summary.distanceMeters.toLocaleString('de-AT')} m`;
    this.goPretzelsEl.textContent = `+${summary.runPretzels} (${summary.totalPretzels})`;

    this.goHintEl.textContent = summary.reason;
  }
}
