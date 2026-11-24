import * as THREE from 'three';
import { MaterialLibrary } from '../materials';
import { ObstacleKind, PowerUpKind } from '../types';

export class PropsBuilder {
  private readonly coneMat = new THREE.MeshStandardMaterial({
    color: 0xe86125,
    roughness: 0.55,
    flatShading: true,
  });
  private readonly bikeFrameMat = new THREE.MeshStandardMaterial({
    color: 0x26756d,
    roughness: 0.4,
    metalness: 0.35,
  });
  private readonly umbrellaPowerMat = new THREE.MeshStandardMaterial({
    color: 0x1f788a,
    roughness: 0.4,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  private readonly magnetRedMat = new THREE.MeshStandardMaterial({
    color: 0xd9342b,
    roughness: 0.38,
    metalness: 0.25,
  });

  constructor(private readonly mats: MaterialLibrary) {}

  /**
   * Goldbraune Salzburger Brezel with twisted knot and coarse white salt crystals.
   */
  public createPretzel(): THREE.Group {
    const g = new THREE.Group();

    // Outer heart/oval loop
    const outerLoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.068, 8, 18, Math.PI * 1.65),
      this.mats.pretzelCrust
    );
    outerLoop.rotation.z = Math.PI * 0.68;
    outerLoop.scale.set(1.12, 0.92, 1);

    // Crossed inner arms of the pretzel knot
    const armGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.44, 7);
    const armLeft = new THREE.Mesh(armGeo, this.mats.pretzelCrust);
    armLeft.position.set(-0.05, -0.02, 0);
    armLeft.rotation.z = -0.62;

    const armRight = new THREE.Mesh(armGeo, this.mats.pretzelCrust);
    armRight.position.set(0.05, -0.02, 0.02);
    armRight.rotation.z = 0.62;

    // Top thick belly arch
    const belly = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.082, 8, 10, Math.PI * 0.85),
      this.mats.pretzelCrust
    );
    belly.position.y = 0.05;
    belly.rotation.z = Math.PI * 0.08;

    g.add(outerLoop, armLeft, armRight, belly);

    // White salt crystals
    const saltGeo = new THREE.BoxGeometry(0.048, 0.048, 0.048);
    const saltOffsets: Array<[number, number, number]> = [
      [-0.18, 0.22, 0.06],
      [0.0, 0.28, 0.07],
      [0.18, 0.21, 0.06],
      [-0.26, 0.04, 0.05],
      [0.26, 0.04, 0.05],
    ];
    for (const [sx, sy, sz] of saltOffsets) {
      const crystal = new THREE.Mesh(saltGeo, this.mats.pretzelSalt);
      crystal.position.set(sx, sy, sz);
      crystal.rotation.set(0.4, 0.6, 0.2);
      g.add(crystal);
    }

    return g;
  }

  public createPowerUp(kind: PowerUpKind): THREE.Group {
    const g = new THREE.Group();

    // Distinct glowing ring base so power-ups stand out immediately from collectibles
    const auraColor =
      kind === 'umbrella' ? 0x35b8cf : kind === 'watch' ? 0xf5c542 : 0xf05448;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.045, 8, 22),
      new THREE.MeshBasicMaterial({ color: auraColor })
    );
    g.add(ring);

    if (kind === 'umbrella') {
      // Schnürlregen-Schirm
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 0.26, 9),
        this.umbrellaPowerMat
      );
      canopy.position.y = 0.14;
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.56, 7),
        this.mats.woodDark
      );
      shaft.position.y = -0.05;
      const hook = new THREE.Mesh(
        new THREE.TorusGeometry(0.065, 0.022, 6, 10, Math.PI),
        this.mats.woodDark
      );
      hook.position.set(0.065, -0.32, 0);
      hook.rotation.z = Math.PI;
      g.add(canopy, shaft, hook);
    } else if (kind === 'watch') {
      // Goldene Taschenuhr
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.12, 16),
        this.mats.goldFoil
      );
      body.rotation.x = Math.PI / 2;
      const dial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.13, 16),
        this.mats.pretzelSalt
      );
      dial.rotation.x = Math.PI / 2;

      const hand1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.16, 0.15),
        this.mats.wroughtIron
      );
      hand1.position.set(-0.04, 0.05, 0);
      hand1.rotation.z = 0.55;

      const hand2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.12, 0.15),
        this.mats.wroughtIron
      );
      hand2.position.set(0.05, 0.04, 0);
      hand2.rotation.z = -0.75;

      const crown = new THREE.Mesh(
        new THREE.TorusGeometry(0.08, 0.024, 6, 12),
        this.mats.goldFoil
      );
      crown.position.y = 0.38;

      g.add(body, dial, hand1, hand2, crown);
    } else {
      // Brezel-Magnet (Horseshoe magnet)
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.085, 8, 14, Math.PI),
        this.magnetRedMat
      );
      arch.position.y = 0.06;
      const legGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.22, 8);
      const legL = new THREE.Mesh(legGeo, this.magnetRedMat);
      legL.position.set(-0.24, -0.05, 0);
      const legR = new THREE.Mesh(legGeo, this.magnetRedMat);
      legR.position.set(0.24, -0.05, 0);

      const tipGeo = new THREE.CylinderGeometry(0.088, 0.088, 0.11, 8);
      const tipL = new THREE.Mesh(tipGeo, this.mats.foilInnerSilver);
      tipL.position.set(-0.24, -0.2, 0);
      const tipR = new THREE.Mesh(tipGeo, this.mats.foilInnerSilver);
      tipR.position.set(0.24, -0.2, 0);

      g.add(arch, legL, legR, tipL, tipR);
    }

    return g;
  }

  private variant = 0;
  public createObstacle(kind: ObstacleKind, variant = 0): THREE.Group {
    this.variant = variant;
    switch (kind) {
      case 'pedestrian': {
        const g=new THREE.Group();
        const coat=new THREE.Mesh(new THREE.BoxGeometry(.6,.85,.42),this.bikeFrameMat);coat.position.y=.95;g.add(coat);
        const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.26,0),this.mats.parcelCardboard);head.position.y=1.63;g.add(head);
        for(const x of [-.18,.18]) {const leg=new THREE.Mesh(new THREE.BoxGeometry(.18,.6,.22),this.mats.woodDark);leg.position.set(x,.3,0);g.add(leg);}
        const pretzel=this.createPretzel();pretzel.position.set(-.48,1.7,0);pretzel.scale.setScalar(.65);g.add(pretzel);
        const warning=new THREE.Mesh(new THREE.ConeGeometry(.18,.45,3),this.coneMat);warning.position.y=2.2;g.add(warning);
        return g;
      }
      case 'crates':
        return this.buildCratesAndParcels();
      case 'market_stall':
        return this.buildMarketStall();
      case 'barrier_low':
        return this.buildLowBarrier();
      case 'bench_bike':
        return this.buildBenchAndBike();
      case 'low_arch':
        return this.buildLowSlideArch();
      case 'puddle_work':
        return this.buildPuddleAndRoadwork();
      case 'roof_gap':
        return this.buildRoofGap();
    }
  }

  private buildCratesAndParcels(): THREE.Group {
    const g = new THREE.Group();
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.78, 0.84), this.mats.woodWarm);
    crate1.position.set(-0.32, 0.39, 0.05);
    crate1.castShadow = true;
    crate1.receiveShadow = true;

    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.1, 0.88), this.mats.woodDark);
    slat.position.set(-0.32, 0.68, 0.05);

    const parcel1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.56, 0.68),
      this.mats.parcelCardboard
    );
    parcel1.position.set(0.42, 0.28, -0.05);
    parcel1.rotation.y = 0.2;
    parcel1.castShadow = true;

    const tape = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.08, 0.14),
      this.mats.parcelRibbon
    );
    tape.position.set(0.42, 0.54, -0.05);
    tape.rotation.y = 0.2;

    const topBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.34, 0.46),
      this.mats.parcelCardboard
    );
    topBox.position.set(0.36, 0.73, -0.04);
    topBox.castShadow = true;

    g.add(crate1, slat, parcel1, tape, topBox);
    return g;
  }

  private buildMarketStall(): THREE.Group {
    const g = new THREE.Group();
    // Solid wooden counter
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.0, 1.85), this.mats.woodWarm);
    counter.position.y = 0.5;
    counter.castShadow = true;
    counter.receiveShadow = true;
    g.add(counter);

    // 4 timber corner posts
    const postGeo = new THREE.BoxGeometry(0.11, 2.25, 0.11);
    for (const sx of [-0.8, 0.8]) {
      for (const sz of [-0.82, 0.82]) {
        const post = new THREE.Mesh(postGeo, this.mats.woodDark);
        post.position.set(sx, 1.12, sz);
        post.castShadow = true;
        g.add(post);
      }
    }

    // Striped pitched market roof
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.48, 0.72, 4),
      this.variant % 2 === 0 ? this.mats.redStripedAwning : this.mats.greenStripedAwning
    );
    roof.position.y = 2.42;
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.0, 1, 1.06);
    roof.castShadow = true;
    g.add(roof);

    // Pretzel & apple baskets on counter
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.45), this.mats.woodDark);
    basket.position.set(-0.35, 1.1, 0.45);
    g.add(basket);

    return g;
  }

  private buildLowBarrier(): THREE.Group {
    const g = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.32, 0.14), this.mats.hazardStripe);
    board.position.y = 0.68;
    board.castShadow = true;

    const legGeo = new THREE.BoxGeometry(0.12, 0.88, 0.12);
    for (const sx of [-0.68, 0.68]) {
      const leg1 = new THREE.Mesh(legGeo, this.mats.woodDark);
      leg1.position.set(sx, 0.42, 0.12);
      leg1.rotation.x = -0.24;
      const leg2 = new THREE.Mesh(legGeo, this.mats.woodDark);
      leg2.position.set(sx, 0.42, -0.12);
      leg2.rotation.x = 0.24;
      g.add(leg1, leg2);
    }

    g.add(board);
    return g;
  }

  private buildBenchAndBike(): THREE.Group {
    const g = new THREE.Group();

    // Salzburg wooden park bench
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 0.48), this.mats.woodWarm);
    seat.position.set(-0.1, 0.44, 0.12);
    seat.castShadow = true;

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.42, 0.09), this.mats.woodWarm);
    back.position.set(-0.1, 0.68, -0.1);
    back.rotation.x = -0.15;
    back.castShadow = true;

    const legGeo = new THREE.BoxGeometry(0.1, 0.45, 0.48);
    for (const lx of [-0.68, 0.48]) {
      const leg = new THREE.Mesh(legGeo, this.mats.wroughtIron);
      leg.position.set(lx, 0.22, 0.12);
      g.add(leg);
    }
    g.add(seat, back);

    // Parked bicycle next to bench
    const bike = new THREE.Group();
    const wheelGeo = new THREE.TorusGeometry(0.28, 0.04, 7, 14);
    const wFront = new THREE.Mesh(wheelGeo, this.mats.wroughtIron);
    wFront.position.set(-0.36, 0.3, 0);
    const wRear = new THREE.Mesh(wheelGeo, this.mats.wroughtIron);
    wRear.position.set(0.36, 0.3, 0);

    const frameBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.72, 6),
      this.bikeFrameMat
    );
    frameBar.position.set(0, 0.48, 0);
    frameBar.rotation.z = Math.PI / 2;

    const handlePost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.026, 0.026, 0.56, 6),
      this.bikeFrameMat
    );
    handlePost.position.set(-0.3, 0.56, 0);
    handlePost.rotation.z = -0.22;

    const handleBar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.38, 6),
      this.mats.wroughtIron
    );
    handleBar.position.set(-0.35, 0.82, 0);
    handleBar.rotation.x = Math.PI / 2;

    bike.add(wFront, wRear, frameBar, handlePost, handleBar);
    bike.position.set(0.22, 0, -0.28);
    bike.rotation.y = 0.18;
    bike.rotation.x = 0.1;
    g.add(bike);

    return g;
  }

  private buildLowSlideArch(): THREE.Group {
    const g = new THREE.Group();

    // Two wide outer stone pillars leaving clear slide tunnel (0 .. 1.08m) underneath!
    const pillarGeo = new THREE.BoxGeometry(0.28, 2.75, 0.82);
    const leftPillar = new THREE.Mesh(pillarGeo, this.mats.stoneLight);
    leftPillar.position.set(-0.92, 1.375, 0);
    leftPillar.castShadow = true;

    const rightPillar = new THREE.Mesh(pillarGeo, this.mats.stoneLight);
    rightPillar.position.set(0.92, 1.375, 0);
    rightPillar.castShadow = true;

    // Overhead solid stone lintel & arch (y = 1.12 .. 2.85)
    const upperBlock = new THREE.Mesh(
      new THREE.BoxGeometry(2.12, 1.55, 0.86),
      this.mats.stoneLight
    );
    upperBlock.position.set(0, 1.98, 0);
    upperBlock.castShadow = true;

    // Clear visual striped clearance bar along bottom edge of lintel so player immediately spots "SLIDE!"
    const clearanceTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.62, 0.18, 0.9),
      this.mats.hazardStripe
    );
    clearanceTrim.position.set(0, 1.17, 0);

    // Small terracotta cap on top
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(2.24, 0.16, 0.96),
      this.mats.roofTerracotta
    );
    cap.position.set(0, 2.82, 0);

    g.add(leftPillar, rightPillar, upperBlock, clearanceTrim, cap);
    return g;
  }

  private buildPuddleAndRoadwork(): THREE.Group {
    const g = new THREE.Group();

    // Shimmering rainwater puddle
    const puddleGeo = new THREE.CircleGeometry(0.86, 14);
    puddleGeo.rotateX(-Math.PI / 2);
    puddleGeo.scale(1.0, 1, 0.82);
    const puddle = new THREE.Mesh(puddleGeo, this.mats.puddleWater);
    puddle.position.y = 0.025;
    g.add(puddle);

    // Two Salzburg roadwork cones + low warning plank
    for (const cx of [-0.58, 0.58]) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 0.32), this.mats.wroughtIron);
      base.position.set(cx, 0.03, -0.15);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.52, 8), this.coneMat);
      cone.position.set(cx, 0.3, -0.15);
      cone.castShadow = true;
      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.1, 0.12, 8),
        this.mats.pretzelSalt
      );
      stripe.position.set(cx, 0.3, -0.15);
      g.add(base, cone, stripe);
    }

    const lowBoard = new THREE.Mesh(
      new THREE.BoxGeometry(1.18, 0.12, 0.08),
      this.mats.hazardStripe
    );
    lowBoard.position.set(0, 0.36, -0.15);
    g.add(lowBoard);

    return g;
  }

  private buildRoofGap(): THREE.Group {
    const g = new THREE.Group();

    // Deep dark alley void cutting across the rooftop lane!
    const voidMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.05, 0.06, 3.0),
      new THREE.MeshBasicMaterial({ color: 0x161218 })
    );
    voidMesh.position.y = 0.02;
    g.add(voidMesh);

    // Recessed dark pit walls
    const innerDrop = new THREE.Mesh(
      new THREE.BoxGeometry(2.05, 1.4, 3.0),
      new THREE.MeshBasicMaterial({ color: 0x1c171f, side: THREE.BackSide })
    );
    innerDrop.position.y = -0.68;
    g.add(innerDrop);

    // Distinct bright wooden/striped edge curbs at front and back of the roof gap so it's unmistakable from afar!
    const frontLip = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.16, 0.22),
      this.mats.hazardStripe
    );
    frontLip.position.set(0, 0.08, 1.55);

    const backLip = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.16, 0.22),
      this.mats.woodWarm
    );
    backLip.position.set(0, 0.08, -1.55);

    g.add(frontLip, backLip);
    return g;
  }
}
