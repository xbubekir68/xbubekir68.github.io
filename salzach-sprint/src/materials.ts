import * as THREE from 'three';

function createStripedAwningTexture(primaryHex: string, secondaryHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const stripes = 8;
  const w = canvas.width / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? primaryHex : secondaryHex;
    ctx.fillRect(i * w, 0, w, canvas.height);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCobblestoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6f665d';
  ctx.fillRect(0, 0, 256, 256);

  const rows = 8;
  const cols = 8;
  const cw = 256 / cols;
  const ch = 256 / rows;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = 126 + ((r * 17 + c * 31) % 28);
      ctx.fillStyle = `rgb(${shade}, ${shade - 7}, ${shade - 14})`;
      const x = c * cw + offset + 2;
      const y = r * ch + 2;
      ctx.beginPath();
      ctx.roundRect(x, y, cw - 4, ch - 4, 5);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createChocolateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#4e2614';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle cocoa marbling & praline dimples
  for (let i = 0; i < 90; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    const r = 6 + (i % 14);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(112, 58, 34, 0.5)' : 'rgba(54, 24, 12, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class MaterialLibrary {
  public readonly redStripedAwning: THREE.MeshStandardMaterial;
  public readonly greenStripedAwning: THREE.MeshStandardMaterial;
  public readonly hazardStripe: THREE.MeshStandardMaterial;
  public readonly cobblestoneTex: THREE.CanvasTexture;
  public readonly darkChocolate: THREE.MeshStandardMaterial;
  public readonly goldFoil: THREE.MeshStandardMaterial;
  public readonly foilInnerSilver: THREE.MeshStandardMaterial;
  public readonly pretzelCrust: THREE.MeshStandardMaterial;
  public readonly pretzelSalt: THREE.MeshStandardMaterial;
  public readonly woodWarm: THREE.MeshStandardMaterial;
  public readonly woodDark: THREE.MeshStandardMaterial;
  public readonly parcelCardboard: THREE.MeshStandardMaterial;
  public readonly parcelRibbon: THREE.MeshStandardMaterial;
  public readonly wroughtIron: THREE.MeshStandardMaterial;
  public readonly stoneLight: THREE.MeshStandardMaterial;
  public readonly stoneMedium: THREE.MeshStandardMaterial;
  public readonly copperPatina: THREE.MeshStandardMaterial;
  public readonly roofTerracotta: THREE.MeshStandardMaterial;
  public readonly waterSalzach: THREE.MeshStandardMaterial;
  public readonly puddleWater: THREE.MeshStandardMaterial;

  constructor() {
    this.cobblestoneTex = createCobblestoneTexture();

    this.redStripedAwning = new THREE.MeshStandardMaterial({
      map: createStripedAwningTexture('#c8372d', '#fbf3e4'),
      roughness: 0.8,
      flatShading: true,
    });

    this.greenStripedAwning = new THREE.MeshStandardMaterial({
      map: createStripedAwningTexture('#2d6b4f', '#fbf3e4'),
      roughness: 0.8,
      flatShading: true,
    });

    this.hazardStripe = new THREE.MeshStandardMaterial({
      map: createStripedAwningTexture('#d83b2d', '#f7f4ee'),
      roughness: 0.65,
    });

    this.darkChocolate = new THREE.MeshStandardMaterial({
      map: createChocolateTexture(),
      color: 0x733a20,
      emissive: 0x2c1308,
      emissiveIntensity: 0.36,
      roughness: 0.46,
      metalness: 0.04,
      flatShading: true,
    });

    this.goldFoil = new THREE.MeshStandardMaterial({
      color: 0xfad150,
      emissive: 0x704c08,
      emissiveIntensity: 0.34,
      roughness: 0.3,
      metalness: 0.28,
      side: THREE.DoubleSide,
      flatShading: true,
    });

    this.foilInnerSilver = new THREE.MeshStandardMaterial({
      color: 0xe8e4dc,
      roughness: 0.3,
      metalness: 0.72,
      side: THREE.DoubleSide,
    });

    this.pretzelCrust = new THREE.MeshStandardMaterial({
      color: 0xb8641e,
      emissive: 0x3b1b04,
      emissiveIntensity: 0.22,
      roughness: 0.42,
      metalness: 0.08,
    });

    this.pretzelSalt = new THREE.MeshStandardMaterial({
      color: 0xfdfbf7,
      roughness: 0.3,
    });

    this.woodWarm = new THREE.MeshStandardMaterial({
      color: 0xb9824c,
      roughness: 0.82,
      flatShading: true,
    });

    this.woodDark = new THREE.MeshStandardMaterial({
      color: 0x6b4628,
      roughness: 0.86,
      flatShading: true,
    });

    this.parcelCardboard = new THREE.MeshStandardMaterial({
      color: 0xd49b5e,
      roughness: 0.78,
      flatShading: true,
    });

    this.parcelRibbon = new THREE.MeshStandardMaterial({
      color: 0xc9352b,
      roughness: 0.55,
    });

    this.wroughtIron = new THREE.MeshStandardMaterial({
      color: 0x26292e,
      roughness: 0.48,
      metalness: 0.55,
    });

    this.stoneLight = new THREE.MeshStandardMaterial({
      color: 0xe6dfd3,
      roughness: 0.88,
      flatShading: true,
    });

    this.stoneMedium = new THREE.MeshStandardMaterial({
      color: 0xb5aba0,
      roughness: 0.9,
      flatShading: true,
    });

    this.copperPatina = new THREE.MeshStandardMaterial({
      color: 0x4f9c88,
      roughness: 0.52,
      metalness: 0.3,
      flatShading: true,
    });

    this.roofTerracotta = new THREE.MeshStandardMaterial({
      color: 0xb8563b,
      roughness: 0.8,
      flatShading: true,
    });

    this.waterSalzach = new THREE.MeshStandardMaterial({
      color: 0x3ba39c,
      roughness: 0.22,
      metalness: 0.18,
      flatShading: true,
    });

    this.puddleWater = new THREE.MeshStandardMaterial({
      color: 0x5aa9c4,
      roughness: 0.12,
      metalness: 0.35,
      transparent: true,
      opacity: 0.86,
    });
  }
}
