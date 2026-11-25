import * as THREE from 'three';
import { NaturalSoundEngine } from '../audio';
import {
  BASE_SPEED,
  BIOMES,
  DISTANCE_SCORE_MULTIPLIER,
  FAST_FALL_GRAVITY,
  GRAVITY,
  HIT_INVULNERABILITY_TIME,
  JUMP_VELOCITY,
  LANE_SWITCH_SPEED,
  LANE_WIDTH,
  MAX_SPEED,
  POWERUP_DURATIONS,
  PRETZEL_SCORE_BONUS,
  SLIDE_DURATION,
  SPEED_ACCEL,
  UMBRELLA_GLIDE_HEIGHT,
  WATCH_SPEED_FACTOR,
} from '../constants';
import { BikeGang } from '../entities/BikeGang';
import { Chase, RIDER_LINES } from './Chase';
import { biomeAt, FORKS, isDelivery, isFork, segmentAt, terrainAt, trackCode } from '../world/Route';
import { PlayerAction } from './InputController';
import { ParticleSystem } from '../entities/ParticleSystem';
import { PlayerMesh } from '../entities/PlayerMesh';
import { MaterialLibrary } from '../materials';
import { SaveManager } from '../storage';
import {
  ActivePowerUps,
  BiomeId,
  GameStatus,
  HUDState,
  Lane,
  OutfitId,
  PowerUpKind,
  RunSummary,
} from '../types';
import { WorldManager } from '../world/WorldManager';
import { checkObstacleCollision, computePlayerBounds } from './Collision';
import { InputController } from './InputController';

export interface GameEngineCallbacks {
  onHudUpdate: (hud: HUDState) => void;
  onStatusChange: (status: GameStatus) => void;
  onGameOver: (summary: RunSummary) => void;
}

export class GameEngine {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly mats: MaterialLibrary;
  private readonly world: WorldManager;
  private readonly playerMesh: PlayerMesh;
  private readonly gang = new BikeGang();
  private readonly chase = new Chase();
  private code = 'SD3-SALZBURG';
  private largeParcel = false;
  private deliveries = 0;
  private spent = 0;
  private bonus = 0;
  private stumble = 0;
  private lookTimer = 0;
  private message = '';
  private messageTimer = 0;
  private speechCooldown = 0;
  private cleanDeliveries = 0;
  private bestCleanDeliveries = 0;
  private hitSinceDelivery = false;
  private deliveredSegments = new Set<number>();
  private scoredObstacles = new Set<number>();
  private shortcutSegments = new Set<number>();
  private combos = 0;
  private lastManoeuvre = -100;
  private vaultTimer = 0;
  private wallJumpUsed = false;
  private shortcuts = 0;
  private gameoverTime = 0;
  private summary: RunSummary | null = null;
  private blockTimer = 0;
  private downTimer = 0;
  private runTime = 0;
  private lastHitTime = -100;
  private warnCooldown = 0;
  private warnCount = 0;
  private gangShaken = false;
  private betSettled = false;
  private announced = new Set<string>();
  private crateRun = 0;
  private lastCrateId = -1;
  private lastGap = 999;

  public configureRun(code: string, large: boolean): void { this.code = trackCode(code); this.largeParcel = large; }
  public getDebugState() { return { status: this.status, distance: this.distanceMeters, x: this.playerX, y: this.playerY,
    gap: this.chase.gap(this.distanceMeters), riders: this.chase.riders.map(r => ({name:r.name,s:r.s,x:r.x,state:r.state,speed:r.speed})),
    code:this.code, deliveries:this.deliveries, spent:this.spent, invulnerable:this.invulnTimer, obstacles:this.world.getAllObstacles() }; }
  /** Urgent messages (gang, hits, danger ahead) replace whatever is showing; flavour text waits its turn. */
  private say(message: string, urgent = false): void {
    if (this.messageTimer > 0 && (!urgent || this.message === message)) return;
    this.message = message; this.messageTimer = 3;
    if (this.speechCooldown <= 0) { this.sound.speak(message); this.speechCooldown = 9; }
  }
  private readonly particles: ParticleSystem;
  private readonly input: InputController;

  private readonly skyCanvas: HTMLCanvasElement;
  private readonly skyTexture: THREE.CanvasTexture;
  private readonly fog: THREE.FogExp2;

  private status: GameStatus = 'menu';
  private rafId = 0;
  private lastTime = 0;
  private menuOrbitClock = 0;

  // Run state
  private targetLane: Lane = 0;
  private playerX = 0;
  private playerY = 0;
  private velY = 0;
  private isJumping = false;
  private fastFalling = false;
  private isSliding = false;
  private slideTimer = 0;

  private baseRunSpeed = BASE_SPEED;
  private distanceMeters = 0;
  private runPretzels = 0;
  private score = 0;
  private stepAccumulator = 0;

  private dangerTimer = 0;
  private invulnTimer = 0;
  private cameraShakeTimer = 0;
  private wasGliding = false;

  private currentBiome: BiomeId = 'getreidegasse';
  private powerUps: ActivePowerUps = {
    umbrella: 0,
    watch: 0,
    magnet: 0,
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly interactionRoot: HTMLElement,
    public readonly saveManager: SaveManager,
    public readonly sound: NaturalSoundEngine,
    private readonly callbacks: GameEngineCallbacks
  ) {
    this.scene = new THREE.Scene();

    // Warm Salzburg golden-hour sky gradient canvas
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 4;
    this.skyCanvas.height = 256;
    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTexture.colorSpace = THREE.SRGBColorSpace;
    this.paintSkyGradient('#3f5e8c', '#f6c38c');
    this.scene.background = this.skyTexture;

    this.fog = new THREE.FogExp2(0xf4c392, 0.0095);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.2, 220);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.setupLighting();

    this.mats = new MaterialLibrary();
    this.world = new WorldManager(this.mats);
    this.scene.add(this.world.root);

    const save = this.saveManager.getData();
    this.playerMesh = new PlayerMesh(this.mats, save.selectedOutfit);
    this.scene.add(this.playerMesh.root);

    this.scene.add(this.gang.root);

    this.particles = new ParticleSystem();
    this.scene.add(this.particles.root);

    this.input = new InputController(this.interactionRoot);
    this.input.setCallbacks({
      onPause: () => {
        if (this.status === 'playing') {
          this.pauseGame();
        } else if (this.status === 'paused') {
          this.resumeGame();
        }
      },
      onInteraction: () => {
        this.sound.unlock();
      },
    });

    this.world.reset();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.status === 'playing') {
        this.pauseGame();
      }
    });
  }

  private paintSkyGradient(topHex: string, bottomHex: string): void {
    const ctx = this.skyCanvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, topHex);
    grad.addColorStop(0.62, '#d99a7c');
    grad.addColorStop(1, bottomHex);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 256);
    this.skyTexture.needsUpdate = true;
  }

  private setupLighting(): void {
    // Warm golden-hour Salzburg evening illumination
    const hemi = new THREE.HemisphereLight(0xffe5bd, 0x5e4636, 1.05);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffb974, 1.9);
    sun.position.set(16, 26, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 75;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -28;
    sun.shadow.bias = -0.0008;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xffe0b2, 0.72);
    fill.position.set(-10, 12, 18);
    this.scene.add(fill);
  }

  public handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / Math.max(1, height);

    this.camera.fov = aspect < 0.85 ? 67 : 62;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public startLoop(): void {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      this.rafId = requestAnimationFrame(tick);
      const dt = Math.min(0.25, Math.max(0, (now - this.lastTime) / 1000));
      this.lastTime = now;
      // Substeps prevent tunnelling at 20/30 Hz without changing the game's speed.
      const steps = Math.max(1, Math.ceil(dt * 120));
      for (let i=0; i<steps; i++) this.step(dt/steps);
      this.renderer.render(this.scene, this.camera);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public stopLoop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public applyOutfit(outfitId: OutfitId): void {
    this.playerMesh.applyOutfit(outfitId);
  }

  public startNewRun(): void {
    this.sound.unlock();
    this.input.clearQueue();

    this.targetLane = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.velY = 0;
    this.isJumping = false;
    this.fastFalling = false;
    this.isSliding = false;
    this.slideTimer = 0;

    this.baseRunSpeed = BASE_SPEED;
    this.distanceMeters = 0;
    this.runPretzels = 0;
    this.score = 0;
    this.stepAccumulator = 0;

    this.dangerTimer = 0;
    this.invulnTimer = 0;
    this.cameraShakeTimer = 0;
    this.wasGliding = false;
    this.powerUps = { umbrella: 0, watch: 0, magnet: 0 };

    this.world.reset(this.code);
    this.chase.reset();
    this.particles.reset();
    this.deliveries = this.spent = this.bonus = this.stumble = this.lookTimer = this.combos = this.shortcuts = this.gameoverTime = this.cleanDeliveries = 0;
    this.bestCleanDeliveries = 0; this.summary = null; this.hitSinceDelivery = false; this.lastManoeuvre = -100;
    this.vaultTimer = 0; this.wallJumpUsed = false;
    this.deliveredSegments.clear(); this.scoredObstacles.clear(); this.shortcutSegments.clear();
    this.blockTimer = this.downTimer = this.runTime = this.warnCooldown = this.warnCount = this.crateRun = 0;
    this.lastHitTime = -100; this.lastCrateId = -1; this.lastGap = 999; this.gangShaken = this.betSettled = false; this.announced.clear();
    this.message = 'Mini-Maxi: „Wetten, wir sind vor dir bei der Paketpost?“'; this.messageTimer = 4; this.speechCooldown = 0;
    this.playerMesh.resetParcel(this.largeParcel);
    this.currentBiome = 'getreidegasse';
    this.applyBiomeAtmosphere(this.currentBiome);

    this.status = 'playing';
    this.callbacks.onStatusChange('playing');
    this.emitHud(true);
  }

  public pauseGame(): void {
    if (this.status !== 'playing') return;
    this.status = 'paused';
    this.sound.stopVoice();
    this.sound.updateContinuous({
      active: false,
      speedRatio: 0,
      dangerRatio: 0,
      hasWater: false,
      hasRain: false,
      gliding: false,
      dt: 0.016,
    });
    this.callbacks.onStatusChange('paused');
  }

  public resumeGame(): void {
    if (this.status !== 'paused') return;
    this.sound.unlock();
    this.input.clearQueue();
    this.lastTime = performance.now();
    this.status = 'playing';
    this.callbacks.onStatusChange('playing');
  }

  public returnToMenu(): void {
    this.input.clearQueue();
    this.distanceMeters=0; this.lookTimer=0; this.blockTimer=0; this.downTimer=0; this.lastGap=999; this.sound.stopVoice(); this.playerMesh.resetParcel(false); this.particles.reset();
    this.powerUps = { umbrella: 0, watch: 0, magnet: 0 };
    this.dangerTimer = 0;
    this.invulnTimer = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.isSliding = false;
    this.isJumping = false;
    this.world.reset();
    this.chase.reset();
    this.currentBiome = 'getreidegasse';
    this.applyBiomeAtmosphere('getreidegasse');

    this.status = 'menu';
    this.callbacks.onStatusChange('menu');
  }

  public triggerManualAction(action: Exclude<PlayerAction, 'pause'>): void {
    this.input.pushAction(action);
  }

  private applyBiomeAtmosphere(biome: BiomeId): void {
    const cfg = BIOMES[biome];
    this.paintSkyGradient(cfg.skyTopHex, cfg.skyBottomHex);
    this.fog.color.setHex(cfg.fogColor);
    // Standing on the fortress, you cannot also see it on the horizon.
    for (const name of ['festung', 'festungsberg']) { const o = this.world.backdropGroup.getObjectByName(name); if (o) o.visible = biome !== 'festung'; }
  }

  private step(dt: number): void {
    if (this.status === 'menu') {
      this.menuOrbitClock += dt;
      this.playerMesh.update({
        dt,
        playerX: 0,
        playerY: 0,
        lateralVel: 0,
        speed: 0,
        isSliding: false,
        isJumping: false,
        isGliding: false,
        hasMagnet: false,
        invulnTimer: 0,
        isMenuIdle: true,
      });
      this.gang.update(dt, this.chase.riders, this.distanceMeters, true, this.saveManager.getData().reducedMotion);
      this.particles.update({
        dt,
        hasDrizzle: false,

        isRunning: false,
      });
      this.sound.updateContinuous({
        active: false,
        speedRatio: 0,
        dangerRatio: 0,
        hasWater: false,
        hasRain: false,
        gliding: false,
        dt,
      });

      const sway = this.saveManager.getData().reducedMotion ? 0 : Math.sin(this.menuOrbitClock * 0.45) * 0.7;
      this.playerMesh.root.position.set(1.05, 0, 1.35);
      this.playerMesh.root.rotation.y = 2.45;
      this.camera.position.set(1.85 + sway * 0.35, 3.25, 7.6);
      this.camera.lookAt(-0.15, 1.15, 0.5);
      return;
    }

    this.playerMesh.root.rotation.y = 0;

    if (this.status === 'paused') {
      return;
    }

    if (this.status === 'gameover') {
      this.gameoverTime += dt;
      this.playerMesh.animateDefeat(this.gameoverTime);
      if (this.summary && this.gameoverTime > 1.25) { this.callbacks.onGameOver(this.summary); this.summary = null; }
      this.gang.update(dt, this.chase.riders, this.distanceMeters, false, this.saveManager.getData().reducedMotion);
      this.particles.update({
        dt,
        hasDrizzle: BIOMES[this.currentBiome].hasDrizzle,

        isRunning: false,
      });
      this.sound.updateContinuous({
        active: false,
        speedRatio: 0,
        dangerRatio: 0,
        hasWater: false,
        hasRain: false,
        gliding: false,
        dt,
      });
      this.updateFollowCamera(dt);
      return;
    }

    // === ACTIVE GAMEPLAY ('playing') ===
    this.updateGameplay(dt);
  }

  private updateGameplay(dt: number): void {
    // 1. Speed & Power-up Timers
    // Pocket watch slows the entire simulation, including pursuers and physics.
    if (this.powerUps.watch > 0) dt *= WATCH_SPEED_FACTOR;
    this.baseRunSpeed = Math.min(MAX_SPEED, this.baseRunSpeed + SPEED_ACCEL * dt);
    this.stumble = Math.max(0, this.stumble - dt);
    this.lookTimer = Math.max(0, this.lookTimer - dt);
    this.messageTimer = Math.max(0, this.messageTimer - dt);
    this.speechCooldown = Math.max(0, this.speechCooldown - dt);
    this.vaultTimer = Math.max(0,this.vaultTimer-dt);
    this.runTime += dt;
    this.blockTimer = Math.max(0, this.blockTimer - dt);
    this.downTimer = Math.max(0, this.downTimer - dt);
    this.warnCooldown = Math.max(0, this.warnCooldown - dt);
    const terrain = terrainAt(this.distanceMeters, this.playerX);
    const support = this.world.getNearbyObstacles().find(o => o.kind==='crates' && Math.abs(o.lane*LANE_WIDTH-this.playerX)<.65 && Math.abs(o.worldZ)<o.halfDepth+.3 && this.playerY>=o.maxY-.08 && this.playerY<=o.maxY+.2);
    // A run along touching crates is a raised path the bikes cannot follow.
    if (support && support.id !== this.lastCrateId) { this.lastCrateId = support.id; this.crateRun++; }
    if (!support && this.playerY <= .05) {
      if (this.crateRun >= 4) { this.bonus += 30 * this.crateRun; this.say(`Kistenweg: ${this.crateRun} Kisten am Stück +${30 * this.crateRun}`); }
      this.crateRun = 0;
    }

    for (const key of ['umbrella', 'watch', 'magnet'] as const) {
      if (this.powerUps[key] > 0) {
        this.powerUps[key] = Math.max(0, this.powerUps[key] - dt);
      }
    }

    const isGliding = this.powerUps.umbrella > 0;
    if (this.wasGliding && !isGliding) {
      // Safe landing forgiveness when Schnürlregen-Schirm finishes
      this.invulnTimer = Math.max(this.invulnTimer, 0.85);
      this.world.forgiveImmediateObstacles(5.5);
    }
    this.wasGliding = isGliding;

    const halted = this.blockTimer > 0 || this.downTimer > 0;
    const effectiveSpeed = halted ? 0 : this.baseRunSpeed * (this.stumble > 0 ? .5 : 1) * (terrain.narrow ? .88 : 1) * (terrain.stairs ? (this.largeParcel ? .62 : .8) : 1) * (terrain.boost ? 1.15 : 1) * (this.largeParcel ? .94 : 1);

    // 2. Process buffered player inputs
    const actions = this.input.consumeActions();
    for (const act of actions) {
      if (this.downTimer > 0 && act !== 'look') continue;
      if (act === 'look') { this.lookTimer = 1.1; }
      else if (act === 'throw') {
        const left = this.runPretzels - this.spent;
        const target = left > 0 ? this.chase.distract(this.distanceMeters) : undefined;
        if (target) {
          this.spent++; this.say(this.chase.event, true);
          this.particles.emitBurst({pos:new THREE.Vector3(this.playerX,1,1),count:5,colors:[0xe6ad54],speed:3,life:.8});
        } else this.say(left > 0 ? 'Niemand ist nah genug hinter dir – eine Brezel fliegt bis 30 m.' : 'Keine Brezel mehr zum Werfen.', true);
      }
      else if (act === 'left' && this.targetLane > -1 && !(terrain.stairs && terrain.local>5 && terrain.local<14)) {
        this.targetLane = (this.targetLane - 1) as Lane;
        this.sound.playLaneShift();
      } else if (act === 'right' && this.targetLane < 1 && !(terrain.stairs && terrain.local>5 && terrain.local<14)) {
        this.targetLane = (this.targetLane + 1) as Lane;
        this.sound.playLaneShift();
      } else if (act === 'jump') {
        const wall = this.world.getNearbyObstacles().find(o => (o.kind==='barrier_low' || o.kind==='crates') && Math.abs(o.lane*LANE_WIDTH-this.playerX)<.75 && o.worldZ<1 && o.worldZ>-2);
        // A high wall ahead can be kicked off from any height while airborne; the window grows with speed.
        const high = this.world.getAllObstacles().find(o => o.kind==='high_wall' && Math.abs(o.lane*LANE_WIDTH-this.playerX)<.75 && o.worldZ < -.2 && o.worldZ > -Math.max(3, this.baseRunSpeed*.3));
        const kick = (wall && this.playerY>.7 && this.playerY<1.5) || (high && this.playerY>.3);
        if (!isGliding && (this.playerY <= 0.08 || support || (kick && !this.wallJumpUsed))) {
          if(this.playerY>.08 && !support) { this.wallJumpUsed=true; this.say(high ? 'Mauersprung! Abgestoßen und drüber.' : 'Abgestoßen! Sprung vom Mauerrand.'); }
          if(wall || high) this.vaultTimer=.55;
          this.velY = JUMP_VELOCITY;
          this.isJumping = true;
          this.fastFalling = false;
          this.isSliding = false;
          this.slideTimer = 0;
          this.sound.playJump();
          this.particles.emitBurst({
            pos: new THREE.Vector3(this.playerX, 0.08, 0),
            count: 7,
            colors: [0xdcd2bd, 0xa89f94],
            speed: 2.6,
            upBias: 1.4,
            life: 0.3,
          });
        }
      } else if (act === 'slide') {
        if (!isGliding) {
          if (this.playerY > 0.12) {
            // Fast-fall slam into slide!
            this.fastFalling = true;
            this.velY = Math.min(this.velY, -7.5);
          }
          this.isSliding = true;
          this.slideTimer = SLIDE_DURATION;
          this.sound.playSlide();
        }
      }
    }

    // 3. Lateral movement
    const desiredX = this.targetLane * LANE_WIDTH;
    const prevX = this.playerX;
    this.playerX += (desiredX - this.playerX) * Math.min(1, dt * LANE_SWITCH_SPEED);
    const lateralVel = (this.playerX - prevX) / dt;

    // 4. Vertical physics (Jump / Slide / Umbrella Glide)
    if (isGliding) {
      this.isSliding = false;
      this.slideTimer = 0;
      this.isJumping = false;
      this.fastFalling = false;
      this.velY = 0;
      this.playerY += (UMBRELLA_GLIDE_HEIGHT - this.playerY) * Math.min(1, dt * 8.0);
    } else {
      if (this.playerY > 0 || this.velY > 0) {
        const g = this.fastFalling ? FAST_FALL_GRAVITY : GRAVITY;
        this.velY -= g * dt;
        this.playerY += this.velY * dt;
        if(support && this.velY<=0 && this.playerY<=support.maxY) {
          this.playerY=support.maxY;this.velY=0;this.isJumping=false;
        }
        if (this.playerY <= 0) {
          this.playerY = 0;
          this.velY = 0;
          this.isJumping = false;
          this.fastFalling = false;
          this.wallJumpUsed = false;
          this.particles.emitBurst({
            pos: new THREE.Vector3(this.playerX, 0.06, 0),
            count: 6,
            colors: [0xcbbfa6, 0x9b8f82],
            speed: 2.2,
            upBias: 1.0,
            life: 0.25,
          });
        }
      }

      if (this.isSliding && this.playerY <= 0.05) {
        this.slideTimer -= dt;
        if (this.slideTimer <= 0) {
          this.isSliding = false;
        }
      }
    }

    // 5. Advance World, Pretzels & Power-ups
    const forwardDelta = effectiveSpeed * dt;
    this.distanceMeters += forwardDelta;
    this.score =
      Math.floor(this.distanceMeters * DISTANCE_SCORE_MULTIPLIER) +
      this.runPretzels * PRETZEL_SCORE_BONUS + this.bonus;

    const difficulty = Math.min(1, (this.baseRunSpeed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED));

    this.world.update({
      dt,
      forwardDelta,
      retainBehind: Math.max(22, ...this.chase.riders.filter(r => r.active).map(r => this.distanceMeters-r.s+6)),
      difficulty,
      playerX: this.playerX,
      playerY: this.playerY,
      magnetActive: this.powerUps.magnet > 0,
      umbrellaActive: isGliding,
      onCollectPretzel: (pos) => {
        this.runPretzels += 1;
        this.sound.playPretzelCollect();
        this.particles.emitBurst({
          pos,
          count: 8,
          colors: [0xf0be42, 0xd88b32, 0xfdfbf7],
          speed: 3.4,
          upBias: 2.5,
          life: 0.38,
        });
      },
      onCollectPowerUp: (kind, pos) => {
        this.activatePowerUp(kind);
        this.particles.emitBurst({
          pos,
          count: 14,
          colors: [0x35b8cf, 0xf5c542, 0xfdfbf7],
          speed: 4.5,
          upBias: 3.2,
          life: 0.5,
        });
      },
    });

    // 6. Footsteps on Salzburg surfaces
    const activeBiome = this.world.getCurrentBiome();
    let biomeChanged = false;
    if (activeBiome !== this.currentBiome) {
      this.currentBiome = activeBiome;
      this.applyBiomeAtmosphere(activeBiome);
      biomeChanged = true;
    }

    if (this.playerY <= 0.06 && !this.isSliding && !isGliding) {
      this.stepAccumulator += forwardDelta;
      if (this.stepAccumulator >= 2.55) {
        this.stepAccumulator = 0;
        this.sound.playFootstep(BIOMES[this.currentBiome].stepSurface);
      }
    }

    // 7. Timers & Obstacle Collision Checks
    if (this.dangerTimer > 0) {
      this.dangerTimer = Math.max(0, this.dangerTimer - dt);
    }
    if (this.invulnTimer > 0) {
      this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    }
    if (this.cameraShakeTimer > 0) {
      this.cameraShakeTimer = Math.max(0, this.cameraShakeTimer - dt);
    }

    if (this.invulnTimer <= 0) {
      const playerBox = computePlayerBounds(this.playerX, this.playerY, this.isSliding);
      const groundHeight=terrainAt(this.distanceMeters,this.playerX).height;
      playerBox.minY += groundHeight;
      playerBox.maxY += groundHeight;
      // The large carton cannot be compressed below a low gate.
      if(this.largeParcel && this.isSliding) playerBox.maxY += .36;
      const nearby = this.world.getNearbyObstacles();
      for (const obs of nearby) {
        if (checkObstacleCollision(playerBox, obs)) {
          obs.forgiven = true;
          this.handlePlayerCollision(obs.isGap, obs.kind);
          break;
        }
      }
    }

    this.chase.update(dt, this.distanceMeters, this.playerX, this.baseRunSpeed, this.world.getAllObstacles(), terrainAt);
    if (this.chase.event) this.say(this.chase.event, true);
    const gap = this.chase.gap(this.distanceMeters);
    this.lastGap = gap;
    if (this.chase.riders.every(r => this.distanceMeters - r.s > 40)) this.gangShaken = true;
    const closest = this.chase.riders.filter(r=>r.active).sort((a,b)=>b.s-a.s)[0];
    if (gap < 9 && closest && this.warnCooldown <= 0) {
      // Direction relative to the courier, so "links" always means the rider is to your left.
      const dx = closest.x - this.playerX;
      const lines = RIDER_LINES[closest.name].warn;
      this.say(`${closest.name}: „${lines[this.warnCount++ % lines.length]}“ – ${Math.max(1, Math.round(gap))} m ${dx < -1 ? 'links' : dx > 1 ? 'rechts' : 'direkt'} hinter dir!`, true);
      this.warnCooldown = 3.2;
    }
    // Obstacle invulnerability does not protect from the gang: if they reach you, they have you.
    const caught = this.chase.caught(this.distanceMeters, this.playerX, this.playerY + terrain.height, this.downTimer > 0);
    if (caught) { this.finishRun(this.downTimer > 0 ? `Hingefallen – ${caught.name} war sofort da.` : `${caught.name} hat dich eingeholt.`, true); return; }
    this.updateObjectives();
    const dangerRatio = Math.max(0, 1 - gap / 8);
    const speedRatio = (this.baseRunSpeed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);

    this.playerMesh.update({
      dt,
      playerX: this.playerX,
      playerY: this.playerY + terrainAt(this.distanceMeters,this.playerX).height,
      lateralVel,
      speed: effectiveSpeed,
      isSliding: this.isSliding,
      isJumping: this.isJumping,
      isGliding,
      hasMagnet: this.powerUps.magnet > 0,
      invulnTimer: this.invulnTimer,
      isMenuIdle: false,
      vaulting: this.vaultTimer>0,
      reducedMotion: this.saveManager.getData().reducedMotion,
      down: this.downTimer > 0,
    });

    this.gang.update(dt, this.chase.riders, this.distanceMeters, false, this.saveManager.getData().reducedMotion);

    const biomeCfg = BIOMES[this.currentBiome];
    this.particles.update({
      dt,
      hasDrizzle: biomeCfg.hasDrizzle && !this.saveManager.getData().reducedMotion,

      isRunning: true,
    });

    this.sound.updateContinuous({
      active: true,
      speedRatio,
      dangerRatio,
      hasWater: biomeCfg.hasWaterSound,
      hasRain: biomeCfg.hasDrizzle,
      gliding: isGliding,
      dt,
    });

    this.updateFollowCamera(dt);
    this.emitHud(biomeChanged);
  }

  private activatePowerUp(kind: PowerUpKind): void {
    this.powerUps[kind] = POWERUP_DURATIONS[kind];
    this.sound.playPowerUpPick(kind);
  }

  private handlePlayerCollision(wasGap: boolean, kind: string): void {
    this.world.forgiveImmediateObstacles(2);
    this.hitSinceDelivery = true; this.cleanDeliveries = 0;
    this.invulnTimer = HIT_INVULNERABILITY_TIME;
    this.isSliding = false; this.slideTimer = 0;
    if(wasGap) { this.finishRun('Dachlücke verpasst – im Kartonstapel gelandet.'); return; }
    const outfit=this.saveManager.getData().selectedOutfit;
    const mild = kind === 'puddle_work' && outfit === 'gripkurier';
    this.cameraShakeTimer = kind==='puddle_work' && outfit==='regenoutfit' ? 0 : .25;
    this.sound.playCollision(false);
    if (!mild && this.runTime - this.lastHitTime < 10) {
      // The second knock within ten seconds puts you on the ground; the gang does the rest.
      this.downTimer = 1.6; this.stumble = 0; this.lastHitTime = -100;
      this.say('Hingefallen! Zweiter Zusammenstoß in 10 Sekunden – schnell wieder auf!', true);
      return;
    }
    if (!mild) this.lastHitTime = this.runTime;
    if (kind === 'market_stall' || kind === 'pedestrian') {
      // Solid things stop you dead: you step around them while the gang keeps rolling.
      this.blockTimer = .45; this.stumble = 0;
      const blocked = (lane: number) => this.world.getAllObstacles().some(o => Math.abs((o.centerX ?? o.lane*LANE_WIDTH) - lane*LANE_WIDTH) < o.halfWidth + .4 && o.worldZ > -3 && o.worldZ < 1.5);
      const side = ([-1, 0, 1] as Lane[]).filter(l => l !== this.targetLane && !blocked(l)).sort((a, b) => Math.abs(a - this.targetLane) - Math.abs(b - this.targetLane))[0];
      if (side !== undefined) this.targetLane = side;
      this.say(kind === 'pedestrian' ? 'Zusammengestoßen! Der Passant schimpft, die Gang holt auf.' : 'Voll in den Marktstand! Außen herum – die Gang holt auf.', true);
      return;
    }
    this.stumble = mild ? .45 : 1.2;
    this.say('Angestoßen! Du verlierst Tempo – noch ein Stoß in 10 s, und du liegst.', true);
  }

  private updateObjectives(): void {
    const t=terrainAt(this.distanceMeters,this.playerX), i=t.index;
    if(isFork(i) && t.local > 6 && t.local < 12 && !this.shortcutSegments.has(i)) {
      if(this.playerX < -1.6) {
        this.shortcutSegments.add(i); this.shortcuts++; this.bonus+=120;
        this.say(`${FORKS[t.biome][0]} +120! Die Räder müssen schieben.`);
      } else if(this.playerX > 1.5) { this.shortcutSegments.add(i); this.say(`${FORKS[t.biome][1]}: Tempo für dich – und für die Gang.`); }
    }
    const fork = segmentAt(this.distanceMeters+24);
    if(isFork(fork) && !this.announced.has('f'+fork)) {
      this.announced.add('f'+fork); const [left, right] = FORKS[biomeAt(fork)];
      this.say(`Gabelung: links ${left} (Räder schieben, +120), rechts ${right} (schneller für alle, Power-up).`, true);
    }
    if(isDelivery(i) && t.local >= 8 && !this.deliveredSegments.has(i)) {
      if(t.local < 12 && Math.abs(this.playerX)<.85 && this.playerY<.6) {
        const points = this.largeParcel?750:450;
        this.deliveredSegments.add(i); this.deliveries++; this.bonus+=points;
        if(!this.hitSinceDelivery) this.cleanDeliveries++; this.bestCleanDeliveries=Math.max(this.bestCleanDeliveries,this.cleanDeliveries); this.hitSinceDelivery=false;
        this.playerMesh.popParcel();
        this.particles.emitBurst({pos:new THREE.Vector3(this.playerX+.6,1.2,-.6),count:10,colors:[0xd49b5e,0xc9352b],speed:3,upBias:2,life:.6});
        // Mini-Maxi bet the gang would be at the first post before you.
        if(!this.betSettled) { this.betSettled = true; this.bonus += 100; this.say(`Zugestellt +${points}! Mini-Maxi: „Na guat, Wette verloren.“ Wettbonus +100`, true); }
        else this.say(`Zugestellt! +${points} – neues Paket geschnappt.`, true);
        this.sound.playUiClick();
      } else if(t.local>=12) {
        this.deliveredSegments.add(i); this.cleanDeliveries=0;
        if(!this.betSettled) { this.betSettled = true; this.say('Paketpost verpasst. Mini-Maxi: „Gwonnen! Wette is Wette.“', true); }
        else this.say('Paketpost verpasst. Nächste Station folgt.', true);
      }
    }
    for(const o of this.world.getAllObstacles()) {
      // Danger ahead is announced once, early enough to act on.
      if(o.kind==='pedestrian' && o.worldZ < -12 && o.worldZ > -25 && !this.announced.has('o'+o.id)) { this.announced.add('o'+o.id); this.say('Achtung links: Ein Passant überquert die Gasse!', true); }
      if(o.kind==='roof_gap' && o.worldZ < -30 && o.worldZ > -45 && !this.announced.has('o'+o.id)) { this.announced.add('o'+o.id); this.say(`Dachlücke ${o.lane<0?'links':o.lane>0?'rechts':'in der Mitte'} voraus – springen oder ausweichen!`, true); }
      if(o.kind==='high_wall' && o.worldZ < -25 && o.worldZ > -40 && !this.announced.has('wall')) { this.announced.add('wall'); this.say('Hohe Mauer: springen und an der Mauer nochmal springen – oder ausweichen.', true); }
      if(o.worldZ < o.halfDepth+.5 || o.worldZ > o.halfDepth+2 || this.scoredObstacles.has(o.id)) continue;
      this.scoredObstacles.add(o.id);
      if(o.forgiven || this.invulnTimer>0) continue;
      const dx=Math.abs(this.playerX-o.lane*LANE_WIDTH);
      if(dx < .65 && o.kind==='high_wall' && this.playerY>2) { this.bonus+=150; this.say('Mauersprung geschafft! +150'); this.lastManoeuvre=this.distanceMeters; }
      else if(o.kind==='crates' && this.crateRun>0) continue; // a crate path pays once, as a whole (Kistenweg bonus)
      else if(dx < .65 && (this.playerY>.25 || this.isSliding)) {
        this.bonus+=75;
        if(this.distanceMeters-this.lastManoeuvre<26) {this.combos++;this.bonus+=100;this.say('Saubere Parkourkette +100');}
        else this.say(o.requiresSlide?'Sauber unter dem Tor! +75':'Sauber übers Hindernis! +75');
        this.lastManoeuvre=this.distanceMeters;
      } else if(dx>o.halfWidth+.42 && dx<o.halfWidth+.75) {this.bonus+=50;this.say('Knapp vorbei! +50');}
    }
    // Bound bookkeeping for endless runs.
    const minId = Math.min(...this.world.getAllObstacles().map(o=>o.id));
    for(const id of this.scoredObstacles) if(id<minId) this.scoredObstacles.delete(id);
  }

  private finishRun(reason: string, caught = false): void {
    if(this.status!=='playing') return;
    this.status='gameover'; this.gameoverTime=0; this.sound.stopVoice(); this.sound.playCollision(true);
    this.score=Math.floor(this.distanceMeters*DISTANCE_SCORE_MULTIPLIER)+this.runPretzels*PRETZEL_SCORE_BONUS+this.bonus;
    const result=this.saveManager.recordRun(this.score,this.runPretzels-this.spent);
    const challenges: string[]=[];
    if(this.bestCleanDeliveries>=3) challenges.push('Drei saubere Lieferungen');
    if(this.gangShaken && !caught) challenges.push('Die ganze Gang abgehängt');
    if(this.combos>=3) challenges.push('Drei Parkourketten');
    if(this.shortcuts>0) challenges.push('Treppenprofi');
    const newChallenges = this.saveManager.recordProgress(this.deliveries,challenges);
    this.summary={score:this.score,highScore:this.saveManager.getData().highScore,isNewRecord:result.isNewRecord,
      distanceMeters:Math.floor(this.distanceMeters),runPretzels:this.runPretzels-this.spent,totalPretzels:this.saveManager.getData().totalPretzels,
      deliveries:this.deliveries,spent:this.spent,reason,highlight:this.shortcuts+' Treppenwege · '+this.combos+' Parkourketten',trackCode:this.code,challenges,newChallenges};
    this.particles.emitBurst({pos:new THREE.Vector3(this.playerX,1,0),count:35,colors:[0xd5a16a,0xf1b747,0xffead0],speed:5,upBias:4,life:1.2});
    // The result panel appears after the physical parcel tumble, not before it.
  }

  private updateFollowCamera(dt: number): void {
    const aspect = this.camera.aspect;
    // When the gang is within 10 m the camera rises and pulls back, so the riders right behind come into view.
    const near = this.status === 'playing' && this.lookTimer <= 0 ? Math.max(0, Math.min(1, (10 - this.lastGap) / 6)) : 0;
    const pullBack = (aspect < 0.85 ? 8.85 : 8.45) + near * 3.5;
    const targetCamX = this.playerX * 0.46;
    const targetCamY = 6.85 + near * 1.4 + this.playerY * 0.34;
    const targetCamZ = this.lookTimer > 0 ? -6 : pullBack;

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, dt * 8.5);
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, dt * 7.5);
    this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1, dt * 8.0);

    if (this.cameraShakeTimer > 0 && !this.saveManager.getData().reducedMotion) {
      const mag = this.cameraShakeTimer * 0.55;
      this.camera.position.x += (Math.random() - 0.5) * mag;
      this.camera.position.y += (Math.random() - 0.5) * mag;
    }

    this.camera.lookAt(this.playerX * 0.25, 0.95 + this.playerY * 0.25, this.lookTimer > 0 ? 13 : -13 + near * 3);
  }

  private emitHud(biomeChanged: boolean): void {
    const save = this.saveManager.getData();
    const t = terrainAt(this.distanceMeters,this.playerX);
    const nextStation = isDelivery(t.index) && t.local<12 && !this.deliveredSegments.has(t.index) ? t.index : (Math.floor(t.index/9)+1)*9;
    this.callbacks.onHudUpdate({
      score: this.score,
      highScore: Math.max(save.highScore, this.score),
      distanceMeters: Math.floor(this.distanceMeters),
      runPretzels: this.runPretzels-this.spent,
      totalPretzels: save.totalPretzels + this.runPretzels-this.spent,
      biomeName: BIOMES[this.currentBiome].name,
      biomeChanged,
      dangerRatio: Math.max(0, 1-this.chase.gap(this.distanceMeters)/8),
      gap: this.chase.gap(this.distanceMeters),
      delivery: 'Paketpost in ' + Math.max(0, Math.ceil(nextStation*18-14+8-this.distanceMeters)) + ' m · Mitte' + (this.deliveries ? ' · ' + this.deliveries + ' zugestellt' : ''),
      playerX: this.playerX,
      gang: this.chase.riders.map(r => ({ name: r.name, x: r.x, gap: this.distanceMeters - r.s })),
      message: this.messageTimer>0?this.message:'', trackCode:this.code,
      powerUps: { ...this.powerUps },
      speedKmh: Math.round(this.baseRunSpeed * 2.1),
    });
  }
}
