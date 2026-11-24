import * as THREE from 'three';
import { OUTFITS } from '../constants';
import { MaterialLibrary } from '../materials';
import { OutfitId } from '../types';

export class PlayerMesh {
  public readonly root = new THREE.Group();
  private readonly bodyRig = new THREE.Group();
  private readonly torsoGroup = new THREE.Group();
  private readonly headGroup = new THREE.Group();
  private readonly hatSlot = new THREE.Group();
  private readonly leftLeg = new THREE.Group();
  private readonly rightLeg = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly parcelGroup = new THREE.Group();
  private readonly umbrellaGroup = new THREE.Group();
  private readonly magnetHalo: THREE.Mesh;
  private readonly groundShadow: THREE.Mesh;

  private jacketMat: THREE.MeshStandardMaterial;
  private accentMat: THREE.MeshStandardMaterial;
  private pantsMat: THREE.MeshStandardMaterial;
  private hatMat: THREE.MeshStandardMaterial;

  private runPhase = 0;
  private umbrellaScale = 0;

  constructor(private readonly mats: MaterialLibrary, initialOutfit: OutfitId) {
    const cfg = OUTFITS[initialOutfit];

    this.jacketMat = new THREE.MeshStandardMaterial({
      color: cfg.jacketColor,
      roughness: 0.68,
      flatShading: true,
    });
    this.accentMat = new THREE.MeshStandardMaterial({
      color: cfg.accentColor,
      roughness: 0.6,
      flatShading: true,
    });
    this.pantsMat = new THREE.MeshStandardMaterial({
      color: cfg.pantsColor,
      roughness: 0.78,
      flatShading: true,
    });
    this.hatMat = new THREE.MeshStandardMaterial({
      color: cfg.hatColor,
      roughness: 0.62,
      flatShading: true,
    });

    // Ground shadow blob (stays at y = 0.02 so jump/glide position is always crystal clear)
    const shadowGeo = new THREE.CircleGeometry(0.56, 20);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x1a120c,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    this.groundShadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.groundShadow.position.y = 0.02;
    this.root.add(this.groundShadow);

    // Magnet aura ring
    const haloGeo = new THREE.RingGeometry(0.68, 0.82, 24);
    haloGeo.rotateX(-Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xf4be3b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    this.magnetHalo = new THREE.Mesh(haloGeo, haloMat);
    this.magnetHalo.position.y = 0.9;
    this.magnetHalo.visible = false;
    this.bodyRig.add(this.magnetHalo);

    this.buildCharacter();
    this.buildUmbrella();
    this.applyOutfit(initialOutfit);

    this.root.add(this.bodyRig);
  }

  private buildCharacter(): void {
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf2c29b,
      roughness: 0.7,
      flatShading: true,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x282320,
      roughness: 0.75,
      flatShading: true,
    });
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x4a2e1b,
      roughness: 0.8,
      flatShading: true,
    });

    // Legs (hip pivots at y = 0.72)
    const legGeo = new THREE.BoxGeometry(0.21, 0.58, 0.22);
    legGeo.translate(0, -0.29, 0);
    const shoeGeo = new THREE.BoxGeometry(0.23, 0.14, 0.32);
    shoeGeo.translate(0, -0.62, -0.04);

    const lLegMesh = new THREE.Mesh(legGeo, this.pantsMat);
    const lShoeMesh = new THREE.Mesh(shoeGeo, shoeMat);
    lLegMesh.castShadow = true;
    this.leftLeg.add(lLegMesh, lShoeMesh);
    this.leftLeg.position.set(-0.15, 0.72, 0);

    const rLegMesh = new THREE.Mesh(legGeo, this.pantsMat);
    const rShoeMesh = new THREE.Mesh(shoeGeo, shoeMat);
    rLegMesh.castShadow = true;
    this.rightLeg.add(rLegMesh, rShoeMesh);
    this.rightLeg.position.set(0.15, 0.72, 0);

    this.bodyRig.add(this.leftLeg, this.rightLeg);

    // Torso
    this.torsoGroup.position.set(0, 0.72, 0);
    const torsoGeo = new THREE.BoxGeometry(0.54, 0.62, 0.32);
    torsoGeo.translate(0, 0.31, 0);
    const torsoMesh = new THREE.Mesh(torsoGeo, this.jacketMat);
    torsoMesh.castShadow = true;
    this.torsoGroup.add(torsoMesh);

    // Scarf / Collar accent
    const collarGeo = new THREE.BoxGeometry(0.56, 0.11, 0.35);
    collarGeo.translate(0, 0.58, 0);
    const collarMesh = new THREE.Mesh(collarGeo, this.accentMat);
    this.torsoGroup.add(collarMesh);

    // Courier cross-body messenger strap & small back pouch
    const strapGeo = new THREE.BoxGeometry(0.1, 0.66, 0.36);
    const strapMesh = new THREE.Mesh(strapGeo, this.mats.woodDark);
    strapMesh.position.set(0, 0.31, 0);
    strapMesh.rotation.z = 0.42;
    this.torsoGroup.add(strapMesh);

    const backpackGeo = new THREE.BoxGeometry(0.38, 0.36, 0.16);
    const backpackMesh = new THREE.Mesh(backpackGeo, this.accentMat);
    backpackMesh.position.set(0, 0.33, 0.21);
    backpackMesh.castShadow = true;
    this.torsoGroup.add(backpackMesh);

    // Head (pivot at neck y = 0.64 above hip)
    this.headGroup.position.set(0, 0.66, 0);
    const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
    headGeo.translate(0, 0.19, 0);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.castShadow = true;

    const hairGeo = new THREE.BoxGeometry(0.4, 0.16, 0.4);
    hairGeo.translate(0, 0.33, 0.02);
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);

    this.hatSlot.position.set(0, 0.36, 0);
    this.headGroup.add(headMesh, hairMesh, this.hatSlot);
    this.torsoGroup.add(this.headGroup);

    // Arms holding the urgent parcel forward/side so it's clearly visible!
    const armGeo = new THREE.BoxGeometry(0.16, 0.48, 0.16);
    armGeo.translate(0, -0.22, 0);
    const handGeo = new THREE.BoxGeometry(0.15, 0.14, 0.15);
    handGeo.translate(0, -0.47, 0);

    const lArmMesh = new THREE.Mesh(armGeo, this.jacketMat);
    const lHandMesh = new THREE.Mesh(handGeo, skinMat);
    lArmMesh.castShadow = true;
    this.leftArm.add(lArmMesh, lHandMesh);
    this.leftArm.position.set(-0.35, 0.56, 0);

    const rArmMesh = new THREE.Mesh(armGeo, this.jacketMat);
    const rHandMesh = new THREE.Mesh(handGeo, skinMat);
    rArmMesh.castShadow = true;
    this.rightArm.add(rArmMesh, rHandMesh);
    this.rightArm.position.set(0.35, 0.56, 0);

    this.torsoGroup.add(this.leftArm, this.rightArm);

    // Urgent Parcel (dringendes Paket) carried carefully at right-front hip/chest!
    const boxGeo = new THREE.BoxGeometry(0.42, 0.3, 0.34);
    const boxMesh = new THREE.Mesh(boxGeo, this.mats.parcelCardboard);
    boxMesh.castShadow = true;

    const ribbon1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.06, 0.36),
      this.mats.parcelRibbon
    );
    const ribbon2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.32, 0.36),
      this.mats.parcelRibbon
    );
    const label = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.12, 0.02),
      this.mats.pretzelSalt
    );
    label.position.set(0.06, 0.05, 0.175);

    this.parcelGroup.add(boxMesh, ribbon1, ribbon2, label);
    // Offset slightly right so from the rear-3/4 camera you always see the parcel clearly!
    this.parcelGroup.position.set(0.28, 0.24, -0.24);
    this.parcelGroup.rotation.y = -0.22;
    this.torsoGroup.add(this.parcelGroup);

    this.bodyRig.add(this.torsoGroup);
  }

  private buildUmbrella(): void {
    // Schnürlregen-Schirm held above courier
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.15, 8),
      this.mats.woodDark
    );
    shaft.position.y = 0.52;

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 0.42, 10, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x206a78,
        roughness: 0.45,
        side: THREE.DoubleSide,
        flatShading: true,
      })
    );
    canopy.position.y = 1.05;

    const finial = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.14, 8),
      this.mats.goldFoil
    );
    finial.position.y = 1.3;

    this.umbrellaGroup.add(shaft, canopy, finial);
    this.umbrellaGroup.position.set(-0.22, 1.38, -0.05);
    this.umbrellaGroup.rotation.z = 0.08;
    this.umbrellaGroup.visible = false;
    this.bodyRig.add(this.umbrellaGroup);
  }

  public applyOutfit(outfitId: OutfitId): void {
    const cfg = OUTFITS[outfitId];
    this.jacketMat.color.setHex(cfg.jacketColor);
    this.accentMat.color.setHex(cfg.accentColor);
    this.pantsMat.color.setHex(cfg.pantsColor);
    this.hatMat.color.setHex(cfg.hatColor);

    while (this.hatSlot.children.length > 0) {
      this.hatSlot.remove(this.hatSlot.children[0]);
    }

    if (cfg.hatStyle === 'cap') {
      const crown = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.42), this.hatMat);
      crown.position.y = 0.05;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.22), this.hatMat);
      visor.position.set(0, 0.0, -0.26);
      this.hatSlot.add(crown, visor);
    } else if (cfg.hatStyle === 'explorer') {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.05, 12), this.hatMat);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.2, 10), this.hatMat);
      crown.position.y = 0.11;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.05, 10), this.accentMat);
      band.position.y = 0.04;
      this.hatSlot.add(brim, crown, band);
    } else {
      // Südwester rainhat with sloped back neck brim
      const brim = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.12, 12), this.hatMat);
      brim.position.set(0, 0.04, 0.04);
      brim.rotation.x = 0.18;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.18, 10), this.hatMat);
      crown.position.y = 0.11;
      this.hatSlot.add(brim, crown);
    }
  }

  public update(opts: {
    dt: number;
    playerX: number;
    playerY: number;
    lateralVel: number;
    speed: number;
    isSliding: boolean;
    isJumping: boolean;
    isGliding: boolean;
    hasMagnet: boolean;
    invulnTimer: number;
    isMenuIdle: boolean;
  }): void {
    this.root.position.set(opts.playerX, 0, 0);
    this.bodyRig.position.y = opts.playerY;

    // Ground shadow shrinks slightly with height so ground alignment remains clear
    const heightScale = Math.max(0.45, 1 - opts.playerY * 0.12);
    this.groundShadow.scale.setScalar(heightScale);
    (this.groundShadow.material as THREE.MeshBasicMaterial).opacity = 0.36 * heightScale;

    // Invulnerability blink feedback after a stumble
    if (opts.invulnTimer > 0) {
      this.bodyRig.visible = Math.floor(opts.invulnTimer * 18) % 2 === 0;
    } else {
      this.bodyRig.visible = true;
    }

    // Umbrella smooth pop-open / close
    const targetUmb = opts.isGliding ? 1 : 0;
    this.umbrellaScale += (targetUmb - this.umbrellaScale) * Math.min(1, opts.dt * 14);
    this.umbrellaGroup.visible = this.umbrellaScale > 0.03;
    this.umbrellaGroup.scale.setScalar(Math.max(0.01, this.umbrellaScale));

    // Magnet halo
    this.magnetHalo.visible = opts.hasMagnet;
    if (opts.hasMagnet) {
      this.magnetHalo.rotation.z += opts.dt * 3.5;
    }

    if (opts.isMenuIdle) {
      this.runPhase += opts.dt * 2.6;
      this.bodyRig.rotation.set(0, Math.sin(this.runPhase * 0.5) * 0.25, 0);
      this.torsoGroup.position.y = 0.72 + Math.abs(Math.sin(this.runPhase)) * 0.03;
      this.torsoGroup.rotation.x = 0.05;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.set(-0.35, 0, 0.12);
      this.rightArm.rotation.set(-0.75, -0.2, -0.15);
      return;
    }

    // Lean into lane turns
    const targetRoll = -opts.lateralVel * 0.032;
    this.bodyRig.rotation.z += (targetRoll - this.bodyRig.rotation.z) * Math.min(1, opts.dt * 14);
    this.bodyRig.rotation.y = -opts.lateralVel * 0.025;

    if (opts.isSliding && opts.playerY < 0.35) {
      // Low cobblestone slide clutching the parcel!
      this.bodyRig.rotation.x = -0.88;
      this.torsoGroup.position.y = 0.38;
      this.leftLeg.position.y = 0.38;
      this.rightLeg.position.y = 0.38;
      this.leftLeg.rotation.x = 0.95;
      this.rightLeg.rotation.x = 0.65;
      this.leftArm.rotation.set(-0.9, 0.2, 0);
      this.rightArm.rotation.set(-0.95, -0.2, 0);
      return;
    }

    // Reset slide offsets
    this.bodyRig.rotation.x += (0 - this.bodyRig.rotation.x) * Math.min(1, opts.dt * 16);
    this.leftLeg.position.y = 0.72;
    this.rightLeg.position.y = 0.72;

    if (opts.isGliding) {
      this.runPhase += opts.dt * 5.0;
      this.torsoGroup.position.y = 0.72 + Math.sin(this.runPhase) * 0.04;
      this.torsoGroup.rotation.x = 0.1;
      this.leftLeg.rotation.x = Math.sin(this.runPhase) * 0.28 + 0.18;
      this.rightLeg.rotation.x = -Math.sin(this.runPhase) * 0.28 + 0.18;
      this.leftArm.rotation.set(-2.45, 0.1, 0.15); // Holding umbrella overhead!
      this.rightArm.rotation.set(-0.85, -0.25, -0.15); // Clutching parcel!
      return;
    }

    if (opts.isJumping) {
      this.torsoGroup.position.y = 0.74;
      this.torsoGroup.rotation.x = 0.18;
      this.leftLeg.rotation.x = 0.55;
      this.rightLeg.rotation.x = -0.35;
      this.leftArm.rotation.set(-0.95, 0.15, 0.2);
      this.rightArm.rotation.set(-0.95, -0.25, -0.15);
      return;
    }

    // Energetic courier run cycle
    this.runPhase += opts.dt * (opts.speed * 0.68);
    const swing = Math.sin(this.runPhase);
    const bounce = Math.abs(Math.cos(this.runPhase)) * 0.075;

    this.torsoGroup.position.y = 0.72 + bounce;
    this.torsoGroup.rotation.x = 0.16;
    this.leftLeg.rotation.x = swing * 0.85;
    this.rightLeg.rotation.x = -swing * 0.85;

    // Left arm pumps with stride, right arm cradles the urgent parcel steadily!
    this.leftArm.rotation.set(-swing * 0.65 - 0.25, 0.1, 0.12);
    this.rightArm.rotation.set(-0.82 + bounce * 0.6, -0.28, -0.14);
    this.parcelGroup.position.y = 0.24 + bounce * 0.35;
  }
}
