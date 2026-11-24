import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
}

export class ParticleSystem {
  public readonly root = new THREE.Group();
  private readonly pool: Particle[] = [];
  private readonly drizzleLines: THREE.LineSegments;
  private drizzlePositions: Float32Array;
  private readonly drizzleCount = 90;


  constructor() {
    const geo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
    for (let i = 0; i < 110; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xf5c542, transparent: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.root.add(mesh);
      this.pool.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        gravity: 12,
      });
    }

    // Subtle Schnürlregen evening drizzle streaks
    this.drizzlePositions = new Float32Array(this.drizzleCount * 6);
    for (let i = 0; i < this.drizzleCount; i++) {
      this.resetRainDrop(i, Math.random() * 14);
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.drizzlePositions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0xdcebf7,
      transparent: true,
      opacity: 0.34,
    });
    this.drizzleLines = new THREE.LineSegments(rainGeo, rainMat);
    this.drizzleLines.visible = false;
    this.root.add(this.drizzleLines);
  }

  private resetRainDrop(idx: number, yVal = 12 + Math.random() * 4): void {
    const x = (Math.random() - 0.5) * 18;
    const z = 6 - Math.random() * 34;
    const base = idx * 6;
    this.drizzlePositions[base] = x;
    this.drizzlePositions[base + 1] = yVal;
    this.drizzlePositions[base + 2] = z;
    this.drizzlePositions[base + 3] = x - 0.08;
    this.drizzlePositions[base + 4] = yVal - 0.65;
    this.drizzlePositions[base + 5] = z + 0.12;
  }

  public emitBurst(opts: {
    pos: THREE.Vector3;
    count: number;
    colors: number[];
    speed: number;
    upBias?: number;
    life?: number;
  }): void {
    let spawned = 0;
    for (const p of this.pool) {
      if (p.life > 0) continue;
      const color = opts.colors[spawned % opts.colors.length];
      (p.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      p.mesh.position.copy(opts.pos);
      p.mesh.scale.setScalar(1);
      p.mesh.visible = true;

      const angle = Math.random() * Math.PI * 2;
      const horiz = (0.3 + Math.random() * 0.7) * opts.speed;
      p.vel.set(
        Math.cos(angle) * horiz,
        (opts.upBias ?? 2.2) + Math.random() * opts.speed * 0.8,
        Math.sin(angle) * horiz
      );
      p.maxLife = (opts.life ?? 0.45) * (0.8 + Math.random() * 0.4);
      p.life = p.maxLife;
      p.gravity = 14;

      spawned++;
      if (spawned >= opts.count) break;
    }
  }

  public reset(): void { for (const p of this.pool) { p.life = 0; p.mesh.visible = false; } }

  public update(opts: {
    dt: number;
    hasDrizzle: boolean;
    isRunning: boolean;
  }): void {
    // Update burst particles
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= opts.dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        continue;
      }
      p.vel.y -= p.gravity * opts.dt;
      p.mesh.position.addScaledVector(p.vel, opts.dt);
      p.mesh.rotation.x += opts.dt * 6;
      p.mesh.rotation.y += opts.dt * 5;
      const ratio = p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.05, ratio));
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
    }

    // Schnürlregen drizzle update
    this.drizzleLines.visible = opts.hasDrizzle;
    if (opts.hasDrizzle) {
      for (let i = 0; i < this.drizzleCount; i++) {
        const base = i * 6;
        const fall = 16.5 * opts.dt;
        this.drizzlePositions[base + 1] -= fall;
        this.drizzlePositions[base + 4] -= fall;
        if (this.drizzlePositions[base + 4] < 0) {
          this.resetRainDrop(i);
        }
      }
      this.drizzleLines.geometry.attributes.position.needsUpdate = true;
    }
  }
}
