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
import { Chase } from './Chase';
import { isDelivery, isFork, segmentAt, terrainAt, trackCode } from '../world/Route';
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
  private code = 'SD2-SALZBURG';
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

  public configureRun(code: string, large: boolean): void { this.code = trackCode(code); this.largeParcel = large; }
  public getDebugState() { return { status: this.status, distance: this.distanceMeters, x: this.playerX, y: this.playerY,
    gap: this.chase.gap(this.distanceMeters), riders: this.chase.riders.map(r => ({name:r.name,s:r.s,x:r.x,state:r.state,speed:r.speed})),
    code:this.code, deliveries:this.deliveries, spent:this.spent, invulnerable:this.invulnTimer, obstacles:this.world.getAllObstacles() }; }
  private say(message: string): void {
    if(this.messageTimer > 0) return;
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
    this.distanceMeters=0; this.lookTimer=0; this.sound.stopVoice(); this.playerMesh.resetParcel(false); this.particles.reset();
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
    const terrain = terrainAt(this.distanceMeters, this.playerX);
    const support = this.world.getNearbyObstacles().find(o => o.kind==='crates' && Math.abs(o.lane*LANE_WIDTH-this.playerX)<.65 && Math.abs(o.worldZ)<o.halfDepth+.3 && this.playerY>=o.maxY-.08 && this.playerY<=o.maxY+.2);

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

    const effectiveSpeed = this.baseRunSpeed * (this.stumble > 0 ? .4 : 1) * (terrain.narrow ? .88 : 1) * (terrain.stairs ? (this.largeParcel ? .62 : .9) : 1) * (this.largeParcel ? .94 : 1);

    // 2. Process buffered player inputs
    const actions = this.input.consumeActions();
    for (const act of actions) {
      if (act === 'look') { this.lookTimer = 1.1; }
      else if (act === 'throw') {
        if (this.runPretzels - this.spent > 0 && this.chase.distract(this.distanceMeters)) {
          this.spent++; this.say('Brezel-Beni: „Jausenpause!“');
          this.particles.emitBurst({pos:new THREE.Vector3(this.playerX,1,1),count:5,colors:[0xe6ad54],speed:3,life:.8});
        } else this.say('Beni muss hinter dir und höchstens 45 m entfernt sein. Du brauchst eine Brezel.');
      }
      else if (act === 'left' && this.targetLane > -1 && !(terrain.stairs && terrain.local>5 && terrain.local<14)) {
        this.targetLane = (this.targetLane - 1) as Lane;
        this.sound.playLaneShift();
      } else if (act === 'right' && this.targetLane < 1 && !(terrain.stairs && terrain.local>5 && terrain.local<14)) {
        this.targetLane = (this.targetLane + 1) as Lane;
        this.sound.playLaneShift();
      } else if (act === 'jump') {
        const wall = this.world.getNearbyObstacles().find(o => (o.kind==='barrier_low' || o.kind==='crates') && Math.abs(o.lane*LANE_WIDTH-this.playerX)<.75 && o.worldZ<1 && o.worldZ>-2);
        if (!isGliding && (this.playerY <= 0.08 || support || (wall && this.playerY>.7 && this.playerY<1.5 && !this.wallJumpUsed))) {
          if(this.playerY>.08) { this.wallJumpUsed=true; this.say('Abgestoßen! Sprung vom Mauerrand.'); }
          if(wall) this.vaultTimer=.55;
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
    if (this.chase.event) this.say(this.chase.event);
    const gap = this.chase.gap(this.distanceMeters);
    const closest = this.chase.riders.filter(r=>r.active).sort((a,b)=>Math.abs(this.distanceMeters-a.s)-Math.abs(this.distanceMeters-b.s))[0];
    if (gap < 9 && closest) this.say(closest.name + ': „Schleich di!“ — ' + (closest.x < -1 ? 'links' : closest.x > 1 ? 'rechts' : 'Mitte') + ' hinter dir!');
    const caught = this.chase.caught(this.distanceMeters, this.playerX, this.playerY + terrain.height);
    if (caught && this.invulnTimer <= 0) { this.finishRun(caught.name + ' hat dich auf deiner Spur eingeholt.'); return; }
    this.updateObjectives();
    const dangerRatio = Math.max(0, 1 - gap / 18);
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
    const outfit=this.saveManager.getData().selectedOutfit;
    this.stumble = kind === 'puddle_work' && outfit === 'gripkurier' ? .65 : 1.8;
    this.invulnTimer = HIT_INVULNERABILITY_TIME;
    this.cameraShakeTimer = kind==='puddle_work' && outfit==='regenoutfit' ? 0 : .25;
    this.isSliding = false; this.slideTimer = 0;
    if(wasGap) { this.finishRun('Dachlücke verpasst — im Kartonstapel gelandet.'); return; }
    this.sound.playCollision(false);
    this.say('Angestoßen! Du verlierst Tempo — die Gang fährt weiter.');
  }

  private updateObjectives(): void {
    const t=terrainAt(this.distanceMeters,this.playerX), i=t.index;
    if(isFork(i) && t.local > 6 && t.local < 12) {
      if(this.playerX < -1.6 && !this.shortcutSegments.has(i)) {
        this.shortcutSegments.add(i); this.shortcuts++; this.bonus+=120;
        this.say('Treppenweg +120! Die Fahrräder müssen schieben.');
      } else if(this.playerX > 1.5) this.say('Offene Straße: schnell für dich — und für die Gang.');
    }
    if(isFork(segmentAt(this.distanceMeters+24))) this.say('Weggabelung: links Treppe + Brezeln, rechts freie Straße.');
    if(isDelivery(i) && t.local >= 8 && !this.deliveredSegments.has(i)) {
      if(t.local < 12 && Math.abs(this.playerX)<.85 && this.playerY<.6) {
        this.deliveredSegments.add(i); this.deliveries++; this.bonus+=this.largeParcel?750:450;
        if(!this.hitSinceDelivery) this.cleanDeliveries++; this.bestCleanDeliveries=Math.max(this.bestCleanDeliveries,this.cleanDeliveries); this.hitSinceDelivery=false;
        this.say('Zugestellt! +' + (this.largeParcel?750:450) + ' · Nächstes Paket übernommen.');
        this.sound.playUiClick();
      } else if(t.local>=12) { this.deliveredSegments.add(i); this.cleanDeliveries=0; this.say('Paketpost verpasst. Nächste Station folgt.'); }
    }
    for(const o of this.world.getAllObstacles()) {
      if(o.kind==='pedestrian' && o.worldZ < -12 && o.worldZ > -25) this.say('Achtung links: Ein Passant rettet seine Brezel!');
      if(o.worldZ < o.halfDepth+.5 || o.worldZ > o.halfDepth+2 || this.scoredObstacles.has(o.id)) continue;
      this.scoredObstacles.add(o.id);
      if(o.forgiven || this.invulnTimer>0) continue;
      const dx=Math.abs(this.playerX-o.lane*LANE_WIDTH);
      if(dx < .65 && (this.playerY>.25 || this.isSliding)) {
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

  private finishRun(reason: string): void {
    if(this.status!=='playing') return;
    this.status='gameover'; this.gameoverTime=0; this.sound.stopVoice(); this.sound.playCollision(true);
    this.score=Math.floor(this.distanceMeters*DISTANCE_SCORE_MULTIPLIER)+this.runPretzels*PRETZEL_SCORE_BONUS+this.bonus;
    const result=this.saveManager.recordRun(this.score,this.runPretzels-this.spent);
    const challenges: string[]=[];
    if(this.bestCleanDeliveries>=3) challenges.push('Drei saubere Lieferungen');
    if(this.chase.riders.every(r=>r.escaped)) challenges.push('Die ganze Gang abgehängt');
    if(this.combos>=3) challenges.push('Drei Parkourketten');
    if(this.shortcuts>0) challenges.push('Treppenprofi');
    this.saveManager.recordProgress(this.deliveries,challenges);
    this.summary={score:this.score,highScore:this.saveManager.getData().highScore,isNewRecord:result.isNewRecord,
      distanceMeters:Math.floor(this.distanceMeters),runPretzels:this.runPretzels-this.spent,totalPretzels:this.saveManager.getData().totalPretzels,
      deliveries:this.deliveries,spent:this.spent,reason,highlight:this.shortcuts+' Treppenwege · '+this.combos+' Parkourketten',trackCode:this.code,challenges};
    this.particles.emitBurst({pos:new THREE.Vector3(this.playerX,1,0),count:35,colors:[0xd5a16a,0xf1b747,0xffead0],speed:5,upBias:4,life:1.2});
    // The result panel appears after the physical parcel tumble, not before it.
  }

  private updateFollowCamera(dt: number): void {
    const aspect = this.camera.aspect;
    const pullBack = aspect < 0.85 ? 8.85 : 8.45;
    const targetCamX = this.playerX * 0.46;
    const targetCamY = 6.85 + this.playerY * 0.34;
    const targetCamZ = this.lookTimer > 0 ? -6 : pullBack;

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, dt * 8.5);
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, dt * 7.5);
    this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1, dt * 8.0);

    if (this.cameraShakeTimer > 0 && !this.saveManager.getData().reducedMotion) {
      const mag = this.cameraShakeTimer * 0.55;
      this.camera.position.x += (Math.random() - 0.5) * mag;
      this.camera.position.y += (Math.random() - 0.5) * mag;
    }

    this.camera.lookAt(this.playerX * 0.25, 0.95 + this.playerY * 0.25, this.lookTimer > 0 ? 13 : -13.0);
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
      dangerRatio: Math.max(0, 1-this.chase.gap(this.distanceMeters)/18),
      gap: this.chase.gap(this.distanceMeters),
      delivery: this.deliveries + ' zugestellt · Paketpost in ' + Math.max(0, Math.ceil(nextStation*18-14+8-this.distanceMeters)) + ' m · MITTE',
      message: this.messageTimer>0?this.message:'', trackCode:this.code,
      powerUps: { ...this.powerUps },
      speedKmh: Math.round(this.baseRunSpeed * 2.1),
    });
  }
}
