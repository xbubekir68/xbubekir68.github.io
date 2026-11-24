import * as THREE from 'three';
import { BALL_DANGER_Z, BALL_NORMAL_Z, BALL_RADIUS } from '../constants';
import { MaterialLibrary } from '../materials';

export class ChocolateBall {
  public readonly root = new THREE.Group();
  private readonly spherePivot = new THREE.Group();
  private readonly groundShadow: THREE.Mesh;

  private currentX = 0;
  private currentZ = BALL_NORMAL_Z;
  private rollAngle = 0;

  constructor(mats: MaterialLibrary) {
    // Contact shadow under the giant boulder
    const shadowGeo = new THREE.CircleGeometry(BALL_RADIUS * 0.98, 24);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x160c06,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    this.groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.groundShadow.position.y = 0.018;
    this.root.add(this.groundShadow);

    // 1. Dark brown chocolate core (faceted low-poly sphere)
    const coreGeo = new THREE.IcosahedronGeometry(BALL_RADIUS, 2);
    const coreMesh = new THREE.Mesh(coreGeo, mats.darkChocolate);
    coreMesh.castShadow = true;
    coreMesh.receiveShadow = true;
    this.spherePivot.add(coreMesh);

    // Raised cocoa praline chunks so forward rotation is visibly dramatic
    const bumpGeo = new THREE.DodecahedronGeometry(0.28, 0);
    for (let i = 0; i < 14; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / 14);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const bump = new THREE.Mesh(bumpGeo, mats.darkChocolate);
      const r = BALL_RADIUS * 0.93;
      bump.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      bump.rotation.set(i * 0.7, i * 1.1, 0);
      this.spherePivot.add(bump);
    }

    // 2. Partially wrapped golden foil shells (~32% coverage so dark brown chocolate dominates!)
    const foilPatch1 = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS * 1.03, 14, 10, 0.25, Math.PI * 0.62, 0.35, Math.PI * 0.44),
      mats.goldFoil
    );
    foilPatch1.castShadow = true;
    this.spherePivot.add(foilPatch1);

    const foilPatch2 = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS * 1.03, 12, 10, 3.55, Math.PI * 0.52, 1.15, Math.PI * 0.42),
      mats.goldFoil
    );
    foilPatch2.castShadow = true;
    this.spherePivot.add(foilPatch2);

    // 3. Torn jagged golden foil flaps peeling away from the chocolate surface!
    const flapAngles = [
      [0.35, 0.85, 0.32],
      [1.55, 0.55, -0.38],
      [2.65, 1.25, 0.45],
      [3.85, 0.95, -0.35],
      [4.95, 1.55, 0.42],
      [1.1, 2.15, -0.28],
      [5.6, 0.65, 0.35],
    ];
    for (const [theta, phi, curl] of flapAngles) {
      const flapGroup = new THREE.Group();
      const flapShape = new THREE.ConeGeometry(0.34, 0.58, 3);
      flapShape.scale(1, 1, 0.08);
      const outerGold = new THREE.Mesh(flapShape, mats.goldFoil);
      const innerSilver = new THREE.Mesh(flapShape, mats.foilInnerSilver);
      innerSilver.position.z = -0.015;

      flapGroup.add(outerGold, innerSilver);
      const r = BALL_RADIUS * 1.02;
      flapGroup.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      flapGroup.lookAt(
        flapGroup.position.x * 2,
        flapGroup.position.y * 2,
        flapGroup.position.z * 2
      );
      flapGroup.rotateX(0.55 + curl);
      this.spherePivot.add(flapGroup);
    }

    this.spherePivot.position.y = BALL_RADIUS;
    this.root.add(this.spherePivot);
    this.root.position.set(0, 0, BALL_NORMAL_Z);
  }

  public reset(): void {
    this.currentX = 0;
    this.currentZ = BALL_NORMAL_Z;
    this.rollAngle = 0;
    this.root.position.set(0, 0, this.currentZ);
    this.spherePivot.position.y = BALL_RADIUS;
  }

  public update(opts: {
    dt: number;
    playerX: number;
    speed: number;
    dangerRatio: number; // 0 = normal distance, >0 = closer behind player
    isGameOver: boolean;
    isMenuIdle: boolean;
  }): void {
    if (opts.isMenuIdle) {
      // Poised menacingly behind courier in front of the Konfektstube!
      this.currentX = -1.35;
      this.currentZ = 3.25;
      this.rollAngle += opts.dt * 0.75;
      this.spherePivot.rotation.x = -this.rollAngle;
      this.spherePivot.rotation.y = 0.6;
      this.spherePivot.rotation.z = Math.sin(this.rollAngle) * 0.08;
      this.spherePivot.position.y = BALL_RADIUS;
      this.root.position.set(this.currentX, 0, this.currentZ);
      return;
    }

    // Target Z: stays visibly right behind player; surges forward on hit or overtakes on game over
    let targetZ = BALL_NORMAL_Z;
    if (opts.isGameOver) {
      targetZ = 0.55;
    } else if (opts.dangerRatio > 0) {
      // Keep sphere visibly close while recovery timer counts down
      const urgency = Math.min(1, 0.55 + opts.dangerRatio * 0.45);
      targetZ = BALL_NORMAL_Z - (BALL_NORMAL_Z - BALL_DANGER_Z) * urgency;
    }

    this.currentZ += (targetZ - this.currentZ) * Math.min(1, opts.dt * 6.5);

    // Heavy lateral pursuit inertia
    const prevX = this.currentX;
    this.currentX += (opts.playerX - this.currentX) * Math.min(1, opts.dt * 4.8);
    const lateralDelta = (this.currentX - prevX) / Math.max(0.001, opts.dt);

    // Roll forward toward -Z => negative X-axis rotation!
    const angularSpeed = opts.speed / BALL_RADIUS;
    this.rollAngle += angularSpeed * opts.dt;
    this.spherePivot.rotation.x = -this.rollAngle;
    this.spherePivot.rotation.z = -lateralDelta * 0.06;

    // Slight cobblestone rumble bounce
    const bounce = opts.speed > 1 ? Math.abs(Math.sin(this.rollAngle * 2.5)) * 0.065 : 0;
    this.spherePivot.position.y = BALL_RADIUS + bounce;

    this.root.position.set(this.currentX, 0, this.currentZ);
  }
}
