import * as THREE from 'three';
import { ROAD_WIDTH, SEGMENT_LENGTH, SEGMENTS_PER_BIOME } from '../constants';
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
    cliff.name = 'festungsberg';
    vista.add(cliff);

    // Festung Hohensalzburg iconic white castle complex atop the cliff!
    const fortress = new THREE.Group();
    fortress.position.set(18, 23, 0);
    fortress.name = 'festung';

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
    roadMat.userData.segmentOwned = true;
    road.receiveShadow = true;
    group.add(road);

    // Subtle lane guidestone inlays
    const laneLineMat = new THREE.MeshStandardMaterial({
      color: curbColor,
      roughness: 0.9,
    });
    laneLineMat.userData.segmentOwned = true;
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
    curbMat.userData.segmentOwned = true;
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

    if (isTransition) {
      this.addBiomeTransitionGate(group, biome);
    }
    if (segmentIndex % SEGMENTS_PER_BIOME === 5) this.addLandmark(group, biome);

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

  /** One recognisable Salzburg sight per district pass, always beside the lanes. */
  private addLandmark(group: THREE.Group, biome: BiomeId): void {
    const mat = (color: number) => { const m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: .8 }); m.userData.segmentOwned = true; return m; };
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; group.add(o); return o; };
    const label = (text: string, x: number, y: number, z: number, w: number) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 96;
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#2b1a10'; ctx.font = 'bold 54px serif'; ctx.textAlign = 'center'; ctx.fillText(text, 256, 68);
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true }); m.userData.segmentOwned = true;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 96 / 512), m); p.position.set(x, y, z); p.rotation.y = -Math.sign(x) * Math.PI / 2; group.add(p);
    };
    switch (biome) {
      case 'getreidegasse': {
        // The tall yellow house of Getreidegasse No. 9, slightly forward of its neighbours.
        const x = ROAD_WIDTH / 2 + 2.15;
        add(new THREE.BoxGeometry(4.1, 12.5, 6.2), mat(0xf0c419), x, 6.25, -9);
        for (const wy of [3.2, 5.6, 8, 10.4]) for (const wz of [-10.8, -9, -7.2]) add(new THREE.BoxGeometry(.1, 1.05, .7), this.windowMat, ROAD_WIDTH / 2 + .08, wy, wz);
        label('Getreidegasse 9', ROAD_WIDTH / 2 + .05, 2.1, -9, 4.4);
        break;
      }
      case 'salzachufer': {
        // Makartsteg footbridge with its colourful padlocks.
        const x = -ROAD_WIDTH / 2 - 12;
        add(new THREE.BoxGeometry(22, .4, 2.6), this.mats.stoneMedium, x, .3, -9);
        for (const z of [-10.2, -7.8]) add(new THREE.BoxGeometry(22, .9, .06), this.mats.wroughtIron, x, .95, z);
        const colors = [0xd9483b, 0xf2b938, 0x35a3c9, 0x8ac650, 0xe079b0].map(mat);
        for (let k = 0; k < 44; k++) add(new THREE.BoxGeometry(.14, .18, .08), colors[k % 5], x - 10.5 + k * .48, .75 + (k % 3) * .12, k % 2 ? -7.76 : -10.24);
        label('Makartsteg', -ROAD_WIDTH / 2 - .8, 1.8, -9, 3.2);
        break;
      }
      case 'mirabellgarten': {
        // Pegasus fountain: round basin, plinth and a winged horse.
        const x = ROAD_WIDTH / 2 + 4.2, z = -14.5, stone = this.mats.stoneLight;
        add(new THREE.CylinderGeometry(2.4, 2.2, .6, 16), stone, x, .45, z);
        add(new THREE.CylinderGeometry(2.15, 2.15, .62, 16), this.mats.waterSalzach, x, .47, z);
        add(new THREE.CylinderGeometry(.6, .8, 1.6, 8), stone, x, 1.5, z);
        const bronze = mat(0x8a6a3c);
        add(new THREE.BoxGeometry(.6, .6, 1.5), bronze, x, 2.75, z);
        add(new THREE.BoxGeometry(.32, .9, .35), bronze, x, 3.3, z - .75).rotation.x = .5;
        add(new THREE.BoxGeometry(.3, .32, .6), bronze, x, 3.75, z - 1.05);
        for (const [lx, lz] of [[-.2, -.55], [.2, -.55], [-.2, .55], [.2, .55]]) add(new THREE.BoxGeometry(.14, .75, .14), bronze, x + lx, 2.2, z + lz);
        for (const s of [-1, 1]) { const wing = add(new THREE.BoxGeometry(1.3, .06, .7), bronze, x + s * .85, 3.35, z + .1); wing.rotation.z = s * .55; }
        break;
      }
      case 'festung': {
        // Festungsbahn: a red funicular car on its inclined track outside the wall.
        const x = -ROAD_WIDTH / 2 - 4.6;
        const track = add(new THREE.BoxGeometry(1.4, .25, 24), this.mats.stoneMedium, x, 4, -9);
        track.rotation.x = .42;
        const car = add(new THREE.BoxGeometry(1.5, 1.6, 3), mat(0xc0392b), x, 6.1, -12);
        car.rotation.x = .42;
        add(new THREE.BoxGeometry(1.52, .5, 2.2), this.windowMat, x, 6.6, -12.2).rotation.x = .42;
        break;
      }
      case 'daecher': {
        // The cathedral's copper domes rise beside the roof path.
        const x = ROAD_WIDTH / 2 + 7;
        add(new THREE.CylinderGeometry(3, 3.2, 5, 12), this.mats.stoneLight, x, 1.5, -9);
        add(new THREE.SphereGeometry(3.1, 12, 8, 0, Math.PI * 2, 0, Math.PI * .55), this.mats.copperPatina, x, 4, -9);
        add(new THREE.CylinderGeometry(.5, .6, 1.6, 8), this.mats.stoneLight, x, 7.4, -9);
        add(new THREE.ConeGeometry(.65, 1.4, 8), this.mats.copperPatina, x, 8.9, -9);
        for (const z of [-2, -16]) {
          add(new THREE.BoxGeometry(2.2, 9, 2.2), this.mats.stoneLight, x - 1.5, 2.5, z);
          add(new THREE.ConeGeometry(1.4, 3, 4), this.mats.copperPatina, x - 1.5, 8.5, z).rotation.y = Math.PI / 4;
        }
        break;
      }
    }
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
      // A gable roof (triangular prism) running alongside the path; its eave stays outside the road.
      const gable = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4, 2.4, SEGMENT_LENGTH - .4, 3),
        (segIdx + (side > 0 ? 1 : 0)) % 2 === 0
          ? this.mats.roofTerracotta
          : this.mats.copperPatina
      );
      gable.rotation.x = -Math.PI / 2;
      gable.position.set(side * (ROAD_WIDTH / 2 + 2.35), 1.2, -SEGMENT_LENGTH / 2);
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
