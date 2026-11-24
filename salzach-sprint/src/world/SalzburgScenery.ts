import * as THREE from 'three';
import { ROAD_WIDTH, SEGMENT_LENGTH } from '../constants';
import { MaterialLibrary } from '../materials';
import { BiomeId } from '../types';

const FACADE_COLORS = [0xe8c174, 0xe2a494, 0xa8bfa2, 0xeee3ce, 0xe3ac7b, 0xd8c9a7];

export class SalzburgScenery {
  private readonly facadeMats: THREE.MeshStandardMaterial[];
  private readonly hedgeMat: THREE.MeshStandardMaterial;
  private readonly grassMat: THREE.MeshStandardMaterial;
  private readonly flowerRedMat: THREE.MeshStandardMaterial;
  private readonly flowerGoldMat: THREE.MeshStandardMaterial;
  private readonly cliffMat: THREE.MeshStandardMaterial;
  private readonly mountainMat: THREE.MeshStandardMaterial;
  private readonly windowMat: THREE.MeshStandardMaterial;

  constructor(private readonly mats: MaterialLibrary) {
    this.facadeMats = FACADE_COLORS.map(
      (color) =>
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.85,
          flatShading: true,
        })
    );
    this.hedgeMat = new THREE.MeshStandardMaterial({
      color: 0x2f6b3f,
      roughness: 0.85,
      flatShading: true,
    });
    this.grassMat = new THREE.MeshStandardMaterial({
      color: 0x5d9451,
      roughness: 0.9,
      flatShading: true,
    });
    this.flowerRedMat = new THREE.MeshStandardMaterial({
      color: 0xd9483b,
      roughness: 0.7,
      flatShading: true,
    });
    this.flowerGoldMat = new THREE.MeshStandardMaterial({
      color: 0xf2b938,
      roughness: 0.7,
      flatShading: true,
    });
    this.cliffMat = new THREE.MeshStandardMaterial({
      color: 0x7c756e,
      roughness: 0.92,
      flatShading: true,
    });
    this.mountainMat = new THREE.MeshStandardMaterial({
      color: 0x6f6885,
      roughness: 0.95,
      flatShading: true,
    });
    this.windowMat = new THREE.MeshStandardMaterial({
      color: 0xffdf9e,
      emissive: 0xffb347,
      emissiveIntensity: 0.35,
      roughness: 0.4,
    });
  }

  /**
   * Distant Salzburg panorama: Alpine peaks + Mönchsberg cliff + Festung Hohensalzburg + baroque copper domes.
   */
  public createSalzburgBackdrop(): THREE.Group {
    const vista = new THREE.Group();
    vista.position.set(0, -2, -132);

    // Alpine peaks (Untersberg & Gaisberg silhouettes)
    const peakConfigs: Array<[number, number, number, number]> = [
      [-68, 36, 46, -18],
      [-28, 44, 52, -24],
      [34, 48, 58, -26],
      [76, 38, 48, -20],
    ];
    for (const [x, h, r, z] of peakConfigs) {
      const mtn = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), this.mountainMat);
      mtn.position.set(x, h * 0.45, z);
      vista.add(mtn);
    }

    // Festungsberg steep rock cliff
    const cliff = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 26, 24, 8),
      this.cliffMat
    );
    cliff.position.set(18, 11, 0);
    vista.add(cliff);

    // Festung Hohensalzburg iconic white castle complex atop the cliff!
    const fortress = new THREE.Group();
    fortress.position.set(18, 23, 0);

    const mainKeep = new THREE.Mesh(
      new THREE.BoxGeometry(16, 8.5, 10),
      this.mats.stoneLight
    );
    mainKeep.position.y = 4.2;

    const keepRoof = new THREE.Mesh(
      new THREE.BoxGeometry(16.8, 1.8, 10.6),
      this.mats.roofTerracotta
    );
    keepRoof.position.y = 9.2;

    const westBastion = new THREE.Mesh(
      new THREE.CylinderGeometry(3.8, 4.2, 10, 10),
      this.mats.stoneLight
    );
    westBastion.position.set(-9.5, 4.5, 1.5);
    const westCap = new THREE.Mesh(
      new THREE.ConeGeometry(4.4, 3.6, 10),
      this.mats.roofTerracotta
    );
    westCap.position.set(-9.5, 11.2, 1.5);

    const highTower = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.6, 13.5, 10),
      this.mats.stoneLight
    );
    highTower.position.set(5.2, 6.5, -1);
    const towerCap = new THREE.Mesh(
      new THREE.ConeGeometry(2.9, 3.8, 10),
      this.mats.copperPatina
    );
    towerCap.position.set(5.2, 15.0, -1);

    fortress.add(mainKeep, keepRoof, westBastion, westCap, highTower, towerCap);
    vista.add(fortress);

    // Baroque Altstadt copper dome silhouettes at base
    for (const dx of [-22, -13]) {
      const drum = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 3.4, 7, 10),
        this.mats.stoneLight
      );
      drum.position.set(dx, 5.5, 8);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(3.3, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
        this.mats.copperPatina
      );
      dome.position.set(dx, 9.0, 8);
      vista.add(drum, dome);
    }

    return vista;
  }

  /**
   * Builds a complete 18m modular segment for the given Salzburg biome.
   */
  public createSegmentMesh(
    biome: BiomeId,
    isTransition: boolean,
    segmentIndex: number,
    groundColor: number,
    curbColor: number
  ): { group: THREE.Group; waterMesh?: THREE.Mesh } {
    const group = new THREE.Group();

    // Base street / garden gravel / rooftop plank road
    const roadMat = new THREE.MeshStandardMaterial({
      color: groundColor,
      map: biome === 'mirabellgarten' ? null : this.mats.cobblestoneTex,
      roughness: 0.88,
    });
    const road = new THREE.Mesh(
      new THREE.BoxGeometry(ROAD_WIDTH, 0.4, SEGMENT_LENGTH),
      roadMat
    );
    road.position.set(0, -0.2, -SEGMENT_LENGTH / 2);
    road.receiveShadow = true;
    group.add(road);

    // Subtle lane guidestone inlays
    const laneLineMat = new THREE.MeshStandardMaterial({
      color: curbColor,
      roughness: 0.9,
    });
    for (const lx of [-1.18, 1.18]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.02, SEGMENT_LENGTH),
        laneLineMat
      );
      strip.position.set(lx, 0.01, -SEGMENT_LENGTH / 2);
      group.add(strip);
    }

    // Sidewalks / Curbs
    const curbMat = new THREE.MeshStandardMaterial({
      color: curbColor,
      roughness: 0.86,
      flatShading: true,
    });
    for (const side of [-1, 1]) {
      // On Salzachufer, left side opens to the river quay
      const curbWidth = biome === 'salzachufer' && side === -1 ? 1.1 : 6.0;
      const curbX = side * (ROAD_WIDTH / 2 + curbWidth / 2);
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(curbWidth, 0.56, SEGMENT_LENGTH),
        curbMat
      );
      curb.position.set(curbX, -0.12, -SEGMENT_LENGTH / 2);
      curb.receiveShadow = true;
      group.add(curb);
    }

    // Opening Konfektstube vignette on very first segment
    if (segmentIndex === 0) {
      this.addStartConfectioneryVignette(group);
    }

    if (isTransition) {
      this.addBiomeTransitionGate(group, biome);
    }

    let waterMesh: THREE.Mesh | undefined;
    switch (biome) {
      case 'getreidegasse':
        this.decorateGetreidegasse(group, segmentIndex);
        break;
      case 'salzachufer':
        waterMesh = this.decorateSalzachufer(group, segmentIndex);
        break;
      case 'mirabellgarten':
        this.decorateMirabellgarten(group, segmentIndex);
        break;
      case 'festung':
        this.decorateFestung(group, segmentIndex);
        break;
      case 'daecher':
        this.decorateAltstadtDaecher(group, segmentIndex);
        break;
    }

    return { group, waterMesh };
  }

  private addStartConfectioneryVignette(group: THREE.Group): void {
    // Tipped chocolate display pedestal right behind starting position showing how the chase began!
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 1.1, 10),
      this.mats.woodWarm
    );
    stand.position.set(-3.2, 0.42, -1.5);
    stand.rotation.z = -1.18;
    const goldTray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.65, 0.1, 12),
      this.mats.goldFoil
    );
    goldTray.position.set(-2.6, 0.25, -1.5);
    goldTray.rotation.z = -1.05;
    group.add(stand, goldTray);
  }

  private addBiomeTransitionGate(group: THREE.Group, targetBiome: BiomeId): void {
    // High archway / portal marking entry into the next Salzburg section (high y=4.6 so it never blocks camera!)
    const pillarL = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 5.4, 1.2),
      this.mats.stoneLight
    );
    pillarL.position.set(-ROAD_WIDTH / 2 - 0.55, 2.7, -2.2);
    const pillarR = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 5.4, 1.2),
      this.mats.stoneLight
    );
    pillarR.position.set(ROAD_WIDTH / 2 + 0.55, 2.7, -2.2);

    const headerMat =
      targetBiome === 'daecher'
        ? this.mats.copperPatina
        : targetBiome === 'mirabellgarten'
          ? this.hedgeMat
          : this.mats.stoneLight;

    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(ROAD_WIDTH + 2.4, 0.9, 1.2),
      headerMat
    );
    beam.position.set(0, 5.2, -2.2);

    group.add(pillarL, pillarR, beam);
  }

  private decorateGetreidegasse(group: THREE.Group, segIdx: number): void {
    // Narrow canyon of colorful Salzburg townhouses + wrought-iron guild signs (Ausleger)
    for (const side of [-1, 1]) {
      for (let b = 0; b < 3; b++) {
        const z = -3.0 - b * 6.0;
        const h = 7.5 + ((segIdx + b + (side > 0 ? 2 : 0)) % 3) * 1.6;
        const mat =
          this.facadeMats[(segIdx * 3 + b + (side > 0 ? 1 : 0)) % this.facadeMats.length];

        const house = new THREE.Mesh(new THREE.BoxGeometry(4.2, h, 5.85), mat);
        house.position.set(side * (ROAD_WIDTH / 2 + 2.3), h / 2, z);
        house.receiveShadow = true;
        group.add(house);

        // Pitched roof / Salzburg attic parapet
        const parapet = new THREE.Mesh(
          new THREE.BoxGeometry(4.35, 0.55, 5.95),
          this.mats.stoneLight
        );
        parapet.position.set(side * (ROAD_WIDTH / 2 + 2.3), h + 0.25, z);
        group.add(parapet);

        // Warm glowing windows
        for (const wy of [2.8, 5.1]) {
          if (wy < h - 1.2) {
            const win = new THREE.Mesh(
              new THREE.BoxGeometry(0.12, 1.05, 0.85),
              this.windowMat
            );
            win.position.set(side * (ROAD_WIDTH / 2 + 0.22), wy, z);
            group.add(win);
          }
        }

        // Wrought-iron guild shop sign (schmiedeeisernes Ladenschild) with golden pretzel/emblem!
        if ((b + segIdx) % 2 === 0) {
          const arm = new THREE.Mesh(
            new THREE.BoxGeometry(1.35, 0.08, 0.08),
            this.mats.wroughtIron
          );
          arm.position.set(side * (ROAD_WIDTH / 2 - 0.35), 3.85, z);

          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.32, 0.04, 6, 12),
            this.mats.goldFoil
          );
          ring.position.set(side * (ROAD_WIDTH / 2 - 0.82), 3.45, z);
          ring.rotation.y = Math.PI / 2;

          group.add(arm, ring);
        }
      }
    }
  }

  private decorateSalzachufer(group: THREE.Group, segIdx: number): THREE.Mesh {
    // Left side: Quay railing + wide emerald-turquoise Salzach river + bridge pier
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(24, SEGMENT_LENGTH, 4, 4),
      this.mats.waterSalzach
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(-ROAD_WIDTH / 2 - 13.0, -0.75, -SEGMENT_LENGTH / 2);
    group.add(water);

    // Promenade iron railing along left river edge
    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, SEGMENT_LENGTH),
      this.mats.wroughtIron
    );
    topRail.position.set(-ROAD_WIDTH / 2 - 0.35, 0.92, -SEGMENT_LENGTH / 2);
    group.add(topRail);

    for (let p = 0; p < 6; p++) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.95, 0.09),
        this.mats.wroughtIron
      );
      post.position.set(-ROAD_WIDTH / 2 - 0.35, 0.46, -1.5 - p * 3.0);
      group.add(post);
    }

    // Periodic Salzach iron footbridge (Steg) spanning across the river on the left
    if (segIdx % 3 === 1) {
      const bridgeDeck = new THREE.Mesh(
        new THREE.BoxGeometry(22, 0.55, 2.8),
        this.mats.stoneMedium
      );
      bridgeDeck.position.set(-ROAD_WIDTH / 2 - 12, 0.35, -9);
      const truss = new THREE.Mesh(
        new THREE.BoxGeometry(22, 1.3, 0.18),
        this.mats.copperPatina
      );
      truss.position.set(-ROAD_WIDTH / 2 - 12, 1.2, -7.7);
      group.add(bridgeDeck, truss);
    }

    // Right side: Promenade trees & riverside villas
    for (let t = 0; t < 2; t++) {
      const z = -4.5 - t * 9.0;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.3, 2.2, 7),
        this.mats.woodDark
      );
      trunk.position.set(ROAD_WIDTH / 2 + 1.6, 1.1, z);
      const crown = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.55, 0),
        this.hedgeMat
      );
      crown.position.set(ROAD_WIDTH / 2 + 1.6, 3.1, z);
      crown.castShadow = true;
      group.add(trunk, crown);
    }

    const villa = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 7.2, SEGMENT_LENGTH - 1.5),
      this.facadeMats[segIdx % this.facadeMats.length]
    );
    villa.position.set(ROAD_WIDTH / 2 + 5.6, 3.6, -SEGMENT_LENGTH / 2);
    group.add(villa);

    return water;
  }

  private decorateMirabellgarten(group: THREE.Group, segIdx: number): void {
    // Symmetrical baroque hedges, flowerbeds, fountains & decorative stone figures!
    for (const side of [-1, 1]) {
      const baseX = side * (ROAD_WIDTH / 2 + 3.1);

      // Green parterre lawn
      const lawn = new THREE.Mesh(
        new THREE.BoxGeometry(5.6, 0.14, SEGMENT_LENGTH - 0.4),
        this.grassMat
      );
      lawn.position.set(baseX, 0.2, -SEGMENT_LENGTH / 2);
      group.add(lawn);

      // Symmetrical clipped boxwood hedge border
      const hedge = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.72, SEGMENT_LENGTH - 1.6),
        this.hedgeMat
      );
      hedge.position.set(side * (ROAD_WIDTH / 2 + 0.85), 0.52, -SEGMENT_LENGTH / 2);
      hedge.castShadow = true;
      group.add(hedge);

      // Baroque geometric flowerbeds
      for (let f = 0; f < 2; f++) {
        const z = -4.5 - f * 9.0;
        const flowerMat = (f + segIdx) % 2 === 0 ? this.flowerRedMat : this.flowerGoldMat;
        const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.26, 3.2), flowerMat);
        bed.position.set(baseX, 0.36, z);
        group.add(bed);
      }

      // Alternating Marble Fountain (Brunnen) and Decorative Stone Statue/Urn (Steinfigur)
      if (segIdx % 2 === 0) {
        const basin = new THREE.Mesh(
          new THREE.CylinderGeometry(1.5, 1.35, 0.55, 12),
          this.mats.stoneLight
        );
        basin.position.set(baseX + side * 0.4, 0.52, -9.0);
        const waterDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(1.32, 1.32, 0.58, 12),
          this.mats.waterSalzach
        );
        waterDisc.position.set(baseX + side * 0.4, 0.53, -9.0);
        const spire = new THREE.Mesh(
          new THREE.ConeGeometry(0.38, 1.6, 8),
          this.mats.puddleWater
        );
        spire.position.set(baseX + side * 0.4, 1.5, -9.0);
        group.add(basin, waterDisc, spire);
      } else {
        // Baroque stone pedestal + sculpted garden urn/lion silhouette (non-musical!)
        const plinth = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 1.25, 0.95),
          this.mats.stoneLight
        );
        plinth.position.set(baseX, 0.82, -9.0);
        const statueBody = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.58, 0),
          this.mats.stoneLight
        );
        statueBody.position.set(baseX, 1.85, -9.0);
        statueBody.scale.set(0.85, 1.35, 0.85);
        statueBody.castShadow = true;
        group.add(plinth, statueBody);
      }
    }
  }

  private decorateFestung(group: THREE.Group, segIdx: number): void {
    // Bright Hohensalzburg limestone fortress walls, crenellations, timber walkways & courtyard towers!
    for (const side of [-1, 1]) {
      const wallX = side * (ROAD_WIDTH / 2 + 1.5);
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 4.4, SEGMENT_LENGTH),
        this.mats.stoneLight
      );
      wall.position.set(wallX, 2.2, -SEGMENT_LENGTH / 2);
      wall.receiveShadow = true;
      group.add(wall);

      // Battlements (Zinnen)
      for (let c = 0; c < 5; c++) {
        const merlon = new THREE.Mesh(
          new THREE.BoxGeometry(1.68, 0.85, 1.8),
          this.mats.stoneLight
        );
        merlon.position.set(wallX, 4.8, -1.8 - c * 3.6);
        group.add(merlon);
      }

      // Stone ramp buttresses along inner courtyard wall
      if ((segIdx + (side > 0 ? 1 : 0)) % 2 === 0) {
        const ramp = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 1.6, 4.2),
          this.mats.stoneMedium
        );
        ramp.position.set(side * (ROAD_WIDTH / 2 + 0.5), 0.65, -9.0);
        ramp.rotation.x = 0.22;
        group.add(ramp);
      }
    }

    // High fortress courtyard tower on alternating segments
    if (segIdx % 2 === 1) {
      const towerSide = segIdx % 4 === 1 ? 1 : -1;
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(2.2, 2.4, 10.5, 10),
        this.mats.stoneLight
      );
      tower.position.set(towerSide * (ROAD_WIDTH / 2 + 3.2), 5.2, -9.0);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(2.6, 3.2, 10),
        this.mats.roofTerracotta
      );
      cone.position.set(towerSide * (ROAD_WIDTH / 2 + 3.2), 12.0, -9.0);
      group.add(tower, cone);
    }
  }

  private decorateAltstadtDaecher(group: THREE.Group, segIdx: number): void {
    // Old Town rooftop landscape: sloped terracotta & copper roofs, brick chimneys, copper domes!
    for (const side of [-1, 1]) {
      const roofX = side * (ROAD_WIDTH / 2 + 2.8);
      const gable = new THREE.Mesh(
        new THREE.ConeGeometry(3.8, 3.6, 4),
        (segIdx + (side > 0 ? 1 : 0)) % 2 === 0
          ? this.mats.roofTerracotta
          : this.mats.copperPatina
      );
      gable.position.set(roofX, 1.5, -SEGMENT_LENGTH / 2);
      gable.rotation.y = Math.PI / 4;
      gable.scale.set(1.0, 1, 3.3);
      group.add(gable);

      // Brick chimneys (Schornsteine)
      for (let ch = 0; ch < 2; ch++) {
        const cz = -4.2 - ch * 9.2;
        const chimney = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 2.6, 0.75),
          this.mats.roofTerracotta
        );
        chimney.position.set(side * (ROAD_WIDTH / 2 + 1.35), 2.1, cz);
        chimney.castShadow = true;

        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(0.92, 0.18, 0.92),
          this.mats.stoneLight
        );
        cap.position.set(side * (ROAD_WIDTH / 2 + 1.35), 3.45, cz);
        group.add(chimney, cap);
      }
    }
  }
}
