import * as THREE from 'three';
import { NaturalSoundEngine } from '../audio';
import {
  BASE_SPEED,
  BIOMES,
  DANGER_RECOVERY_TIME,
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
import { ChocolateBall } from '../entities/ChocolateBall';
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
  private readonly chocolateBall: ChocolateBall;
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

    this.chocolateBall = new ChocolateBall(this.mats);
    this.scene.add(this.chocolateBall.root);

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

    // Warm camera-side fill light so the courier's back and rolling chocolate foil gleam richly
    const fill = new THREE.DirectionalLight(0xffe0b2, 0.72);
    fill.position.set(-10, 12, 18);
    this.scene.add(fill);
  }

  public handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / Math.max(1, height);

    // Slightly wider vertical FOV on narrow portrait phones so all 3 lanes + rolling chocolate ball stay framed
    this.camera.fov = aspect < 0.85 ? 67 : 62;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public startLoop(): void {
    this.lastTime = performance.now();
    const tick = (now: number) => {
      this.rafId = requestAnimationFrame(tick);
      // Clamp dt to 50ms max for completely frame-rate-independent stability
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.step(dt);
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

    this.world.reset();
    this.chocolateBall.reset();
    this.currentBiome = 'getreidegasse';
    this.applyBiomeAtmosphere(this.currentBiome);

    this.status = 'playing';
    this.callbacks.onStatusChange('playing');
    this.emitHud(true);
  }

  public pauseGame(): void {
    if (this.status !== 'playing') return;
    this.status = 'paused';
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
    this.powerUps = { umbrella: 0, watch: 0, magnet: 0 };
    this.dangerTimer = 0;
    this.invulnTimer = 0;
    this.playerX = 0;
    this.playerY = 0;
    this.isSliding = false;
    this.isJumping = false;
    this.world.reset();
    this.chocolateBall.reset();
    this.currentBiome = 'getreidegasse';
    this.applyBiomeAtmosphere('getreidegasse');

    this.status = 'menu';
    this.callbacks.onStatusChange('menu');
  }

  public triggerManualAction(action: 'left' | 'right' | 'jump' | 'slide'): void {
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
      this.chocolateBall.update({
        dt,
        playerX: 0,
        speed: 0,
        dangerRatio: 0,
        isGameOver: false,
        isMenuIdle: true,
      });
      this.particles.update({
        dt,
        hasDrizzle: false,
        ballPos: this.chocolateBall.root.position,
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

      // Living Salzburg start-screen camera framing courier, Konfektstube & giant chocolate sphere
      const sway = Math.sin(this.menuOrbitClock * 0.45) * 0.7;
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
      // Let particles & chocolate boulder settle after run ends
      this.chocolateBall.update({
        dt,
        playerX: this.playerX,
        speed: 1.5,
        dangerRatio: 1,
        isGameOver: true,
        isMenuIdle: false,
      });
      this.particles.update({
        dt,
        hasDrizzle: BIOMES[this.currentBiome].hasDrizzle,
        ballPos: this.chocolateBall.root.position,
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
    this.baseRunSpeed = Math.min(MAX_SPEED, this.baseRunSpeed + SPEED_ACCEL * dt);

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

    const effectiveSpeed =
      this.powerUps.watch > 0 ? this.baseRunSpeed * WATCH_SPEED_FACTOR : this.baseRunSpeed;

    // 2. Process buffered player inputs
    const actions = this.input.consumeActions();
    for (const act of actions) {
      if (act === 'left' && this.targetLane > -1) {
        this.targetLane = (this.targetLane - 1) as Lane;
        this.sound.playLaneShift();
      } else if (act === 'right' && this.targetLane < 1) {
        this.targetLane = (this.targetLane + 1) as Lane;
        this.sound.playLaneShift();
      } else if (act === 'jump') {
        if (!isGliding && this.playerY <= 0.08) {
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
        if (this.playerY <= 0) {
          this.playerY = 0;
          this.velY = 0;
          this.isJumping = false;
          this.fastFalling = false;
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
      this.runPretzels * PRETZEL_SCORE_BONUS;

    const difficulty = Math.min(1, (this.baseRunSpeed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED));

    this.world.update({
      dt,
      forwardDelta,
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
      const nearby = this.world.getNearbyObstacles();
      for (const obs of nearby) {
        if (checkObstacleCollision(playerBox, obs)) {
          obs.forgiven = true;
          this.handlePlayerCollision(obs.isGap);
          break;
        }
      }
    }

    // 8. Visual & Audio Updates
    const dangerRatio = this.dangerTimer / DANGER_RECOVERY_TIME;
    const speedRatio = (this.baseRunSpeed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);

    this.playerMesh.update({
      dt,
      playerX: this.playerX,
      playerY: this.playerY,
      lateralVel,
      speed: effectiveSpeed,
      isSliding: this.isSliding,
      isJumping: this.isJumping,
      isGliding,
      hasMagnet: this.powerUps.magnet > 0,
      invulnTimer: this.invulnTimer,
      isMenuIdle: false,
    });

    this.chocolateBall.update({
      dt,
      playerX: this.playerX,
      speed: effectiveSpeed,
      dangerRatio,
      isGameOver: false,
      isMenuIdle: false,
    });

    const biomeCfg = BIOMES[this.currentBiome];
    this.particles.update({
      dt,
      hasDrizzle: biomeCfg.hasDrizzle,
      ballPos: this.chocolateBall.root.position,
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

  private handlePlayerCollision(wasGap: boolean): void {
    this.world.forgiveImmediateObstacles(4.2);

    if (this.dangerTimer > 0) {
      // Second hit before recovery timer expired -> Round ends!
      this.sound.playCollision(true);
      this.cameraShakeTimer = 0.45;
      this.particles.emitBurst({
        pos: new THREE.Vector3(this.playerX, this.playerY + 0.8, 0),
        count: 22,
        colors: [0xd49b5e, 0xc9352b, 0x3b1c11, 0xf0be42],
        speed: 5.5,
        upBias: 3.8,
        life: 0.65,
      });

      this.status = 'gameover';
      this.callbacks.onStatusChange('gameover');

      const finalScore =
        Math.floor(this.distanceMeters * DISTANCE_SCORE_MULTIPLIER) +
        this.runPretzels * PRETZEL_SCORE_BONUS;
      const { isNewRecord } = this.saveManager.recordRun(finalScore, this.runPretzels);
      const updatedSave = this.saveManager.getData();

      this.callbacks.onGameOver({
        score: finalScore,
        highScore: updatedSave.highScore,
        isNewRecord,
        distanceMeters: Math.floor(this.distanceMeters),
        runPretzels: this.runPretzels,
        totalPretzels: updatedSave.totalPretzels,
      });
      return;
    }

    // First collision -> Giant Chocolate Ball surges closer, brief invulnerability!
    this.dangerTimer = DANGER_RECOVERY_TIME;
    this.invulnTimer = HIT_INVULNERABILITY_TIME;
    this.cameraShakeTimer = 0.28;
    this.isSliding = false;
    this.slideTimer = 0;

    if (wasGap) {
      // Courier scrambles back up onto roof planks
      this.playerY = 0.18;
      this.velY = 7.8;
      this.isJumping = true;
    }

    this.sound.playCollision(false);
    this.particles.emitBurst({
      pos: new THREE.Vector3(this.playerX, this.playerY + 0.7, -0.3),
      count: 14,
      colors: [0xb9824c, 0xd49b5e, 0xfdfbf7],
      speed: 4.2,
      upBias: 2.6,
      life: 0.42,
    });
  }

  private updateFollowCamera(dt: number): void {
    const aspect = this.camera.aspect;
    const pullBack = aspect < 0.85 ? 8.85 : 8.45;
    const targetCamX = this.playerX * 0.46;
    const targetCamY = 6.85 + this.playerY * 0.34;
    const targetCamZ = pullBack;

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, dt * 8.5);
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, dt * 7.5);
    this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1, dt * 8.0);

    if (this.cameraShakeTimer > 0) {
      const mag = this.cameraShakeTimer * 0.55;
      this.camera.position.x += (Math.random() - 0.5) * mag;
      this.camera.position.y += (Math.random() - 0.5) * mag;
    }

    this.camera.lookAt(this.playerX * 0.25, 0.95 + this.playerY * 0.25, -13.0);
  }

  private emitHud(biomeChanged: boolean): void {
    const save = this.saveManager.getData();
    this.callbacks.onHudUpdate({
      score: this.score,
      highScore: Math.max(save.highScore, this.score),
      distanceMeters: Math.floor(this.distanceMeters),
      runPretzels: this.runPretzels,
      totalPretzels: save.totalPretzels + this.runPretzels,
      biomeName: BIOMES[this.currentBiome].name,
      biomeChanged,
      dangerRatio: this.dangerTimer / DANGER_RECOVERY_TIME,
      powerUps: { ...this.powerUps },
      speedKmh: Math.round(this.baseRunSpeed * 2.1),
    });
  }
}
