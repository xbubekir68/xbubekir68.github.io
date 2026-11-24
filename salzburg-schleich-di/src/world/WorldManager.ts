import * as THREE from 'three';
import {
  BIOME_ORDER,
  BIOMES,
  LANE_WIDTH,
  MAGNET_PULL_RADIUS,
  REMOVE_SEGMENT_Z,
  SEGMENT_LENGTH,
  SEGMENTS_PER_BIOME,
  VISIBLE_SEGMENTS_AHEAD,
} from '../constants';
import { PropsBuilder } from '../entities/PropsBuilder';
import { getObstacleDimensions } from '../game/Collision';
import { MaterialLibrary } from '../materials';
import {
  ActiveObstacleData,
  BiomeId,
  Lane,
  PowerUpKind,
} from '../types';
import { seededRandom, isDelivery, isFork } from './Route';
import { addRouteDetails } from './RouteDetails';
import { PatternGenerator } from './PatternGenerator';
import { SalzburgScenery } from './SalzburgScenery';

interface LiveObstacle {
  data: ActiveObstacleData;
  mesh: THREE.Group;
  localZ: number;
}

interface LivePretzel {
  mesh: THREE.Group;
  lane: Lane;
  localZ: number;
  baseY: number;
  collected: boolean;
  magnetized: boolean;
  worldPos: THREE.Vector3;
}

interface LivePowerUp {
  mesh: THREE.Group;
  kind: PowerUpKind;
  lane: Lane;
  localZ: number;
  baseY: number;
  collected: boolean;
}

interface LiveSegment {
  index: number;
  biome: BiomeId;
  z: number; // World Z of the front edge of this segment (extends from z to z - SEGMENT_LENGTH)
  group: THREE.Group;
  waterMesh?: THREE.Mesh;
  obstacles: LiveObstacle[];
  pretzels: LivePretzel[];
  powerUps: LivePowerUp[];
}

export class WorldManager {
  public readonly root = new THREE.Group();
  public readonly backdropGroup: THREE.Group;

  private readonly scenery: SalzburgScenery;
  private readonly props: PropsBuilder;
  private readonly generator: PatternGenerator;

  private segments: LiveSegment[] = [];
  private nextSegmentIndex = 0;
  private nextObstacleId = 1;
  private prevSafeLanes: Lane[] = [-1, 0, 1];
  private spinClock = 0;

  constructor(mats: MaterialLibrary) {
    this.scenery = new SalzburgScenery(mats);
    this.props = new PropsBuilder(mats);
    this.generator = new PatternGenerator();
    // Tag reusable resources once; generated segment materials can then be disposed safely.
    for (const owner of [mats, this.scenery, this.props]) for(const value of Object.values(owner)) {
      for(const resource of Array.isArray(value)?value:[value]) {
        if(resource instanceof THREE.Material || resource instanceof THREE.Texture) resource.userData.shared = true;
      }
    }

    this.backdropGroup = this.scenery.createSalzburgBackdrop();
    this.root.add(this.backdropGroup);
  }

  public reset(code = 'SD2-SALZBURG'): void {
    for (const seg of this.segments) {
      this.disposeSegment(seg);
    }
    this.segments = [];
    this.nextSegmentIndex = 0;
    this.prevSafeLanes = [-1, 0, 1];
    this.generator.reset(seededRandom(code));
    this.nextObstacleId = 1;
    this.spinClock = 0;

    // Pre-populate road starting from behind the camera (z = 14) out to 8 segments ahead
    let cursorZ = 14;
    for (let i = 0; i < VISIBLE_SEGMENTS_AHEAD + 2; i++) {
      this.spawnNextSegment(cursorZ, 0);
      cursorZ -= SEGMENT_LENGTH;
    }
  }

  public getCurrentBiome(): BiomeId {
    for (const seg of this.segments) {
      if (seg.z >= 0 && seg.z - SEGMENT_LENGTH <= 0) {
        return seg.biome;
      }
    }
    return this.segments[0]?.biome ?? 'getreidegasse';
  }

  private getBiomeForSegmentIndex(index: number): { biome: BiomeId; isTransition: boolean } {
    const cycleSlot = Math.floor(index / SEGMENTS_PER_BIOME) % BIOME_ORDER.length;
    const biome = BIOME_ORDER[cycleSlot];
    const isTransition = index > 0 && index % SEGMENTS_PER_BIOME === 0;
    return { biome, isTransition };
  }

  private spawnNextSegment(frontZ: number, _difficulty: number): void {
    const segIdx = this.nextSegmentIndex++;
    const { biome, isTransition } = this.getBiomeForSegmentIndex(segIdx);
    const biomeCfg = BIOMES[biome];

    const plan = this.generator.generateSegment({
      segmentIndex: segIdx,
      biome,
      isTransition,
      difficulty: Math.min(1, segIdx / 90),
      prevSafeLanes: this.prevSafeLanes,
    });
    this.prevSafeLanes = plan.safeLanesOut;

    const { group, waterMesh } = this.scenery.createSegmentMesh(
      biome,
      isTransition,
      segIdx,
      biomeCfg.groundColor,
      biomeCfg.curbColor
    );
    addRouteDetails(group, segIdx, isDelivery(segIdx), isFork(segIdx));
    group.position.z = frontZ;

    const liveObstacles: LiveObstacle[] = [];
    for (const spec of plan.obstacles) {
      const dims = getObstacleDimensions(spec.kind);
      const mesh = this.props.createObstacle(spec.kind, segIdx);
      mesh.position.set(spec.lane * LANE_WIDTH, 0, spec.localZ);
      group.add(mesh);

      liveObstacles.push({
        localZ: spec.localZ,
        mesh,
        data: {
          id: this.nextObstacleId++,
          kind: spec.kind,
          lane: spec.lane,
          worldZ: frontZ + spec.localZ,
          halfWidth: dims.halfWidth,
          halfDepth: dims.halfDepth,
          minY: dims.minY,
          maxY: dims.maxY,
          requiresSlide: dims.requiresSlide,
          isGap: dims.isGap,
          forgiven: false,
        },
      });
    }

    const livePretzels: LivePretzel[] = [];
    for (const pSpec of plan.pretzels) {
      const mesh = this.props.createPretzel();
      mesh.position.set(pSpec.lane * LANE_WIDTH, pSpec.y, pSpec.localZ);
      group.add(mesh);
      livePretzels.push({
        mesh,
        lane: pSpec.lane,
        localZ: pSpec.localZ,
        baseY: pSpec.y,
        collected: false,
        magnetized: false,
        worldPos: new THREE.Vector3(pSpec.lane * LANE_WIDTH, pSpec.y, frontZ + pSpec.localZ),
      });
    }

    const livePowerUps: LivePowerUp[] = [];
    for (const puSpec of plan.powerUps) {
      const mesh = this.props.createPowerUp(puSpec.kind);
      mesh.position.set(puSpec.lane * LANE_WIDTH, puSpec.y, puSpec.localZ);
      group.add(mesh);
      livePowerUps.push({
        mesh,
        kind: puSpec.kind,
        lane: puSpec.lane,
        localZ: puSpec.localZ,
        baseY: puSpec.y,
        collected: false,
      });
    }

    this.root.add(group);
    this.segments.push({
      index: segIdx,
      biome,
      z: frontZ,
      group,
      waterMesh,
      obstacles: liveObstacles,
      pretzels: livePretzels,
      powerUps: livePowerUps,
    });
  }

  public update(opts: {
    dt: number;
    retainBehind?: number;
    forwardDelta: number;
    difficulty: number;
    playerX: number;
    playerY: number;
    magnetActive: boolean;
    umbrellaActive: boolean;
    onCollectPretzel: (worldPos: THREE.Vector3) => void;
    onCollectPowerUp: (kind: PowerUpKind, worldPos: THREE.Vector3) => void;
  }): void {
    this.spinClock += opts.dt;

    // Advance segments toward +Z (player sprints toward -Z at origin)
    for (const seg of this.segments) {
      seg.z += opts.forwardDelta;
      seg.group.position.z = seg.z;

      if (seg.waterMesh) {
        seg.waterMesh.position.y = -0.75 + Math.sin(this.spinClock * 2.4 + seg.index) * 0.05;
      }

      for (const obs of seg.obstacles) {
        obs.data.worldZ = seg.z + obs.localZ;
        if(obs.data.kind==='pedestrian') {
          // Distance-driven, announced crossing into the left lane only; centre/right stay open.
          const progress=Math.max(0,Math.min(1,(obs.data.worldZ+24)/16));
          obs.mesh.position.x=-4.1+progress*1.75;
          obs.data.centerX=obs.mesh.position.x;
          obs.mesh.rotation.z=Math.sin(progress*Math.PI*8)*.04;
        }


      }

      // Update Pretzels
      for (const p of seg.pretzels) {
        if (p.collected) continue;

        if (!p.magnetized) {
          // Gentle bobbing & spinning; when gliding with umbrella, lift ground pretzels into glide stream!
          const targetBaseY = opts.umbrellaActive ? Math.max(p.baseY, 3.38) : p.baseY;
          p.mesh.position.y +=
            (targetBaseY + Math.sin(this.spinClock * 4.2 + p.localZ) * 0.1 - p.mesh.position.y) *
            Math.min(1, opts.dt * 7.5);
          p.mesh.rotation.y = this.spinClock * 2.5 + p.localZ * 0.3;
          p.worldPos.set(
            p.lane * LANE_WIDTH,
            p.mesh.position.y,
            seg.z + p.localZ
          );

          if (opts.magnetActive) {
            const dx = opts.playerX - p.worldPos.x;
            const dy = opts.playerY + 0.95 - p.worldPos.y;
            const dz = 0 - p.worldPos.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            if (distSq < MAGNET_PULL_RADIUS * MAGNET_PULL_RADIUS && p.worldPos.z < 2.2) {
              p.magnetized = true;
              // Reparent to world root for smooth homing curve
              this.root.attach(p.mesh);
            }
          }
        } else {
          // Homing smoothly into courier's hands!
          const targetX = opts.playerX;
          const targetY = opts.playerY + 0.95;
          const targetZ = 0;
          const pullSpeed = Math.min(1, opts.dt * 15.5);
          p.mesh.position.x += (targetX - p.mesh.position.x) * pullSpeed;
          p.mesh.position.y += (targetY - p.mesh.position.y) * pullSpeed;
          p.mesh.position.z += (targetZ - p.mesh.position.z) * pullSpeed;
          p.mesh.rotation.y += opts.dt * 9;
          p.worldPos.copy(p.mesh.position);
        }

        // Check collection radius
        const dx = Math.abs(opts.playerX - p.worldPos.x);
        const dy = Math.abs(opts.playerY + 0.85 - p.worldPos.y);
        const dz = Math.abs(p.worldPos.z);
        if (dx < 0.92 && dy < 1.15 && dz < 0.95) {
          p.collected = true;
          p.mesh.visible = false;
          opts.onCollectPretzel(p.worldPos);
        }
      }

      // Update Power-Ups
      for (const pu of seg.powerUps) {
        if (pu.collected) continue;
        const worldZ = seg.z + pu.localZ;
        const bobY = pu.baseY + Math.sin(this.spinClock * 3.6 + pu.localZ) * 0.14;
        pu.mesh.position.y = bobY;
        pu.mesh.rotation.y = this.spinClock * 2.1;

        const worldX = pu.lane * LANE_WIDTH;
        const dx = Math.abs(opts.playerX - worldX);
        const dy = Math.abs(opts.playerY + 0.85 - bobY);
        const dz = Math.abs(worldZ);
        if (dx < 1.05 && dy < 1.35 && dz < 1.05) {
          pu.collected = true;
          pu.mesh.visible = false;
          opts.onCollectPowerUp(pu.kind, new THREE.Vector3(worldX, bobY, worldZ));
        }
      }
    }

    // Recycle segments behind camera and spawn new segments ahead!
    while (this.segments.length > 0 && this.segments[0].z - SEGMENT_LENGTH > Math.max(REMOVE_SEGMENT_Z, opts.retainBehind ?? 22)) {
      const expired = this.segments.shift()!;
      this.disposeSegment(expired);
    }

    while (!this.segments.length || this.segments[this.segments.length - 1].z > -VISIBLE_SEGMENTS_AHEAD * SEGMENT_LENGTH) {
      const lastZ =
        this.segments.length > 0
          ? this.segments[this.segments.length - 1].z - SEGMENT_LENGTH
          : 0;
      this.spawnNextSegment(lastZ, opts.difficulty);
    }
  }

  private disposeSegment(seg: LiveSegment): void {
    for (const p of seg.pretzels) if (p.magnetized) { seg.group.attach(p.mesh); }
    this.root.remove(seg.group);
    const geometries = new Set<THREE.BufferGeometry>();
    seg.group.traverse(obj => { if (obj instanceof THREE.Mesh) geometries.add(obj.geometry); });
    geometries.forEach(g => g.dispose());
    // Shared material-library resources stay alive. Per-segment resources are marked by their builders.
    seg.group.traverse(obj => { if (obj instanceof THREE.Mesh) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of materials) if (!m.userData.shared) { const map=(m as THREE.MeshBasicMaterial).map; if(map && !map.userData.shared) map.dispose(); m.dispose(); }
    }});
  }
  public getAllObstacles(): ActiveObstacleData[] { return this.segments.flatMap(s => s.obstacles.map(o => o.data)); }
  public getNearbyObstacles(): ActiveObstacleData[] {
    const out: ActiveObstacleData[] = [];
    for (const seg of this.segments) {
      if (seg.z < -4 || seg.z - SEGMENT_LENGTH > 4) continue;
      for (const obs of seg.obstacles) {
        if (Math.abs(obs.data.worldZ) < 3.2) {
          out.push(obs.data);
        }
      }
    }
    return out;
  }

  /**
   * Forgives nearby obstacles right after a stumble or when landing from umbrella glide so double-hits never happen.
   */
  public forgiveImmediateObstacles(maxAheadZ = 4.5): void {
    for (const seg of this.segments) {
      for (const obs of seg.obstacles) {
        if (obs.data.worldZ > -maxAheadZ && obs.data.worldZ < 2.0) {
          obs.data.forgiven = true;
        }
      }
    }
  }
}
