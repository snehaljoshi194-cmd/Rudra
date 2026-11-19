import * as THREE from 'three';

export interface ProceduralTextureSet {
  roadAsphalt: THREE.CanvasTexture;
  roadSnow: THREE.CanvasTexture;
  roadSand: THREE.CanvasTexture;
  roadStone: THREE.CanvasTexture;
  rockSurface: THREE.CanvasTexture;
  waterSurface: THREE.CanvasTexture;
  prayerFlags: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  woodenPlank: THREE.CanvasTexture;
  hazardStripe: THREE.CanvasTexture;
}

function configureColorTex(
  canvas: HTMLCanvasElement,
  maxAniso: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

function makeRoadCanvas(style: 'asphalt' | 'snow_track' | 'golden_pass' | 'canyon_stone'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  const baseColors = {
    asphalt: '#2b303a',
    snow_track: '#4b5563',
    golden_pass: '#443c35',
    canyon_stone: '#3c3133',
  };
  ctx.fillStyle = baseColors[style];
  ctx.fillRect(0, 0, 512, 512);

  // Mineral grit & gravel texture
  for (let i = 0; i < 4800; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const s = 1 + Math.random() * 2.5;
    const alpha = 0.05 + Math.random() * 0.1;
    ctx.fillStyle =
      Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.4})`;
    ctx.fillRect(x, y, s, s);
  }

  // Snow/sand shoulder drift edges
  if (style === 'snow_track') {
    const gradL = ctx.createLinearGradient(0, 0, 95, 0);
    gradL.addColorStop(0, 'rgba(226, 238, 252, 0.85)');
    gradL.addColorStop(1, 'rgba(226, 238, 252, 0)');
    ctx.fillStyle = gradL;
    ctx.fillRect(0, 0, 95, 512);

    const gradR = ctx.createLinearGradient(512, 0, 417, 0);
    gradR.addColorStop(0, 'rgba(226, 238, 252, 0.85)');
    gradR.addColorStop(1, 'rgba(226, 238, 252, 0)');
    ctx.fillStyle = gradR;
    ctx.fillRect(417, 0, 95, 512);
  } else if (style === 'golden_pass') {
    const gradL = ctx.createLinearGradient(0, 0, 85, 0);
    gradL.addColorStop(0, 'rgba(217, 179, 130, 0.72)');
    gradL.addColorStop(1, 'rgba(217, 179, 130, 0)');
    ctx.fillStyle = gradL;
    ctx.fillRect(0, 0, 85, 512);

    const gradR = ctx.createLinearGradient(512, 0, 427, 0);
    gradR.addColorStop(0, 'rgba(217, 179, 130, 0.72)');
    gradR.addColorStop(1, 'rgba(217, 179, 130, 0)');
    ctx.fillStyle = gradR;
    ctx.fillRect(427, 0, 85, 512);
  }

  // Outer Himalayan highway solid yellow/white edge stripes
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(26, 0, 10, 512);
  ctx.fillRect(476, 0, 10, 512);

  // 3-lane divider dashed lines (at 1/3 and 2/3 width -> x=178 and x=334)
  ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(175, y, 7, 36);
    ctx.fillRect(330, y, 7, 36);
  }

  return c;
}

function makeRockCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#8b735b';
  ctx.fillRect(0, 0, 256, 256);

  // Stratified Himalayan rock bands
  for (let y = 0; y < 256; y += 12) {
    ctx.fillStyle =
      y % 24 === 0 ? 'rgba(255,245,230,0.09)' : 'rgba(25,20,18,0.12)';
    ctx.fillRect(0, y, 256, 6 + Math.random() * 6);
  }
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle =
      Math.random() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.1)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 2);
  }
  return c;
}

function makeWaterCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0d9488';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 120; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const w = 18 + Math.random() * 45;
    ctx.fillStyle =
      Math.random() > 0.4 ? 'rgba(153, 246, 228, 0.16)' : 'rgba(15, 118, 110, 0.22)';
    ctx.fillRect(x, y, w, 3);
  }
  return c;
}

function makePrayerFlagsCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  // Traditional 5 Tibetan Lungta colors: Blue, White, Red, Green, Yellow
  const colors = ['#2563eb', '#f8fafc', '#dc2626', '#16a34a', '#eab308'];
  const segW = 512 / 10;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = colors[i % 5];
    ctx.fillRect(i * segW + 2, 10, segW - 4, 108);
    // Subtle woodblock print lines
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    for (let line = 24; line < 100; line += 14) {
      ctx.fillRect(i * segW + 8, line, segW - 16, 2);
    }
  }
  // Rope across top
  ctx.fillStyle = '#d6d3d1';
  ctx.fillRect(0, 4, 512, 6);
  return c;
}

function makeContactShadowCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.34)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return c;
}

function makeWoodenPlankCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#784828';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y += 32) {
    ctx.fillStyle = y % 64 === 0 ? '#6e4022' : '#835130';
    ctx.fillRect(0, y + 2, 256, 28);
    ctx.fillStyle = '#2d180c';
    ctx.fillRect(0, y, 256, 3);
  }
  return c;
}

function makeHazardStripeCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#18181b';
  for (let x = -128; x < 384; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 24, 0);
    ctx.lineTo(x + 88, 128);
    ctx.lineTo(x + 64, 128);
    ctx.closePath();
    ctx.fill();
  }
  return c;
}

export function createProceduralTextures(renderer: THREE.WebGLRenderer): ProceduralTextureSet {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const contactShadow = new THREE.CanvasTexture(makeContactShadowCanvas());
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;

  const prayerFlags = new THREE.CanvasTexture(makePrayerFlagsCanvas());
  prayerFlags.colorSpace = THREE.SRGBColorSpace;
  prayerFlags.anisotropy = maxAniso;
  prayerFlags.needsUpdate = true;

  return {
    roadAsphalt: configureColorTex(makeRoadCanvas('asphalt'), maxAniso, 1, 3),
    roadSnow: configureColorTex(makeRoadCanvas('snow_track'), maxAniso, 1, 3),
    roadSand: configureColorTex(makeRoadCanvas('golden_pass'), maxAniso, 1, 3),
    roadStone: configureColorTex(makeRoadCanvas('canyon_stone'), maxAniso, 1, 3),
    rockSurface: configureColorTex(makeRockCanvas(), maxAniso, 2, 2),
    waterSurface: configureColorTex(makeWaterCanvas(), maxAniso, 4, 4),
    prayerFlags,
    contactShadow,
    woodenPlank: configureColorTex(makeWoodenPlankCanvas(), maxAniso, 1, 2),
    hazardStripe: configureColorTex(makeHazardStripeCanvas(), maxAniso, 2, 1),
  };
}
