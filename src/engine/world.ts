import * as THREE from 'three';
import { BiomeConfig, CoinTier, PowerupType } from '../types/game';
import { ProceduralTextureSet } from './textures';

export const LANE_X = [-3.2, 0, 3.2] as const;
export const CHUNK_LENGTH = 44;
export const ROAD_WIDTH = 11.2;

export type ObstacleKind =
  | 'low_barrier' // Jump over
  | 'high_gate' // Slide/duck under
  | 'boulder_wall' // Switch lane around
  | 'moving_truck' // Oncoming decorated truck / convoy (switch lane around)
  | 'ramp_bridge'; // Drive up ramp to elevated bridge (height = 2.4)

export interface SpawnedObstacle {
  id: number;
  kind: ObstacleKind;
  lane: number; // 0, 1, 2
  z: number; // world Z
  length: number;
  width: number;
  minY: number; // bottom clearance (for high_gate, minY = 1.25 so sliding passes!)
  maxY: number; // top height (for low_barrier, maxY = 1.15 so jumping clears!)
  speed: number; // >0 for oncoming traffic (+Z), <0 for same-way slower traffic (-Z)
  mesh: THREE.Group;
  wheels?: THREE.Object3D[];
  trafficKind?: 'truck' | 'taxi_suv' | 'convoy_van';
  trafficDirection?: 'oncoming' | 'same_way';
  hornPlayed?: boolean;
  bridgeDeckY?: number; // for ramp_bridge: deck top height
}

export interface SpawnedPuddle {
  id: number;
  lane: number;
  x: number;
  z: number;
  radius: number;
  splashed: boolean;
  mesh: THREE.Group;
}

export interface SpawnedCoin {
  id: number;
  tier: CoinTier;
  value: number;
  lane: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  mesh: THREE.Group;
}

export interface SpawnedPowerup {
  id: number;
  type: PowerupType;
  lane: number;
  x: number;
  y: number;
  z: number;
  collected: boolean;
  mesh: THREE.Group;
}

export interface RoadChunk {
  group: THREE.Group;
  zStart: number; // center Z
  obstacles: SpawnedObstacle[];
  puddles: SpawnedPuddle[];
  coins: SpawnedCoin[];
  powerups: SpawnedPowerup[];
}

export class WorldBuilder {
  private tex: ProceduralTextureSet;
  private sharedMaterials: Map<string, THREE.Material> = new Map();
  private sharedGeometries: Map<string, THREE.BufferGeometry> = new Map();
  private nextId = 1;

  constructor(tex: ProceduralTextureSet) {
    this.tex = tex;
  }

  private getGeo(key: string, factory: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let g = this.sharedGeometries.get(key);
    if (!g) {
      g = factory();
      this.sharedGeometries.set(key, g);
    }
    return g;
  }

  private getMat(key: string, factory: () => THREE.Material): THREE.Material {
    let m = this.sharedMaterials.get(key);
    if (!m) {
      m = factory();
      this.sharedMaterials.set(key, m);
    }
    return m;
  }

  public dispose(): void {
    this.sharedGeometries.forEach((g) => g.dispose());
    this.sharedMaterials.forEach((m) => m.dispose());
    this.sharedGeometries.clear();
    this.sharedMaterials.clear();
  }

  // Composite Leh-Ladakh Stupa (Chorten): 6 parts (plinth, dome, harmika, spire, finial, gold band)
  public buildChorten(scale = 1): THREE.Group {
    const g = new THREE.Group();
    const whiteMat = this.getMat('chorten_white', () => new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.78,
      metalness: 0.05,
    }));
    const redMat = this.getMat('chorten_crimson', () => new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.65,
      metalness: 0.1,
    }));
    const goldMat = this.getMat('chorten_gold', () => new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.22,
      metalness: 0.88,
    }));

    const base1 = new THREE.Mesh(
      this.getGeo('ch_b1', () => new THREE.BoxGeometry(2.8, 0.7, 2.8)),
      whiteMat
    );
    base1.position.y = 0.35;
    base1.castShadow = true;
    base1.receiveShadow = true;

    const base2 = new THREE.Mesh(
      this.getGeo('ch_b2', () => new THREE.BoxGeometry(2.1, 0.55, 2.1)),
      redMat
    );
    base2.position.y = 0.975;

    const dome = new THREE.Mesh(
      this.getGeo('ch_dome', () => new THREE.CylinderGeometry(0.75, 1.05, 1.15, 14)),
      whiteMat
    );
    dome.position.y = 1.82;
    dome.castShadow = true;

    const harmika = new THREE.Mesh(
      this.getGeo('ch_harm', () => new THREE.BoxGeometry(0.82, 0.45, 0.82)),
      goldMat
    );
    harmika.position.y = 2.6;

    const spire = new THREE.Mesh(
      this.getGeo('ch_spire', () => new THREE.ConeGeometry(0.42, 1.45, 12)),
      goldMat
    );
    spire.position.y = 3.55;

    const finial = new THREE.Mesh(
      this.getGeo('ch_fin', () => new THREE.SphereGeometry(0.18, 10, 10)),
      goldMat
    );
    finial.position.y = 4.35;

    g.add(base1, base2, dome, harmika, spire, finial);
    g.scale.setScalar(scale);
    return g;
  }

  // Composite Himalayan Deodar Pine Tree (4 parts: trunk + 3 layered foliage tiers)
  public buildDeodarTree(scale = 1, snowy = false): THREE.Group {
    const g = new THREE.Group();
    const trunkMat = this.getMat('pine_trunk', () => new THREE.MeshStandardMaterial({
      color: 0x4a3222,
      roughness: 0.92,
      metalness: 0.02,
    }));
    const leafKey = snowy ? 'pine_leaf_snow' : 'pine_leaf';
    const leafMat = this.getMat(leafKey, () => new THREE.MeshStandardMaterial({
      color: snowy ? 0x3b6e66 : 0x1e4d3b,
      roughness: 0.82,
      metalness: 0.04,
    }));
    const snowCapMat = this.getMat('snow_cap', () => new THREE.MeshStandardMaterial({
      color: 0xeaf4ff,
      roughness: 0.65,
      metalness: 0.05,
    }));

    const trunk = new THREE.Mesh(
      this.getGeo('tree_trunk', () => new THREE.CylinderGeometry(0.22, 0.36, 1.8, 8)),
      trunkMat
    );
    trunk.position.y = 0.9;
    trunk.castShadow = true;

    const tier1 = new THREE.Mesh(
      this.getGeo('tree_t1', () => new THREE.ConeGeometry(1.55, 2.2, 9)),
      leafMat
    );
    tier1.position.y = 2.3;
    tier1.castShadow = true;

    const tier2 = new THREE.Mesh(
      this.getGeo('tree_t2', () => new THREE.ConeGeometry(1.22, 1.9, 9)),
      leafMat
    );
    tier2.position.y = 3.45;
    tier2.castShadow = true;

    const tier3 = new THREE.Mesh(
      this.getGeo('tree_t3', () => new THREE.ConeGeometry(0.85, 1.6, 9)),
      snowy ? snowCapMat : leafMat
    );
    tier3.position.y = 4.45;

    g.add(trunk, tier1, tier2, tier3);
    g.scale.setScalar(scale);
    return g;
  }

  // Composite Mountain Peak / Crag (3-4 jagged rock strata + optional snow cap)
  public buildMountainPeak(biome: BiomeConfig, height: number, width: number, seed: number): THREE.Group {
    const g = new THREE.Group();
    const rockMat = this.getMat(`rock_${biome.id}`, () => new THREE.MeshStandardMaterial({
      color: biome.rockPrimary,
      map: this.tex.rockSurface,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    }));
    const subMat = this.getMat(`rock2_${biome.id}`, () => new THREE.MeshStandardMaterial({
      color: biome.rockSecondary,
      roughness: 0.92,
      metalness: 0.04,
      flatShading: true,
    }));
    const snowMat = this.getMat('peak_snow', () => new THREE.MeshStandardMaterial({
      color: 0xf1f7ff,
      roughness: 0.55,
      metalness: 0.05,
      flatShading: true,
    }));

    const mainCone = new THREE.Mesh(
      this.getGeo('mtn_cone', () => new THREE.ConeGeometry(1, 1, 7)),
      rockMat
    );
    mainCone.scale.set(width, height, width * 0.85);
    mainCone.position.y = height * 0.5;
    mainCone.rotation.y = seed;
    g.add(mainCone);

    const spur = new THREE.Mesh(
      this.getGeo('mtn_cone', () => new THREE.ConeGeometry(1, 1, 7)),
      subMat
    );
    spur.scale.set(width * 0.65, height * 0.62, width * 0.65);
    spur.position.set(width * 0.42 * (seed % 2 === 0 ? 1 : -1), height * 0.31, width * 0.2);
    spur.rotation.y = seed * 1.7;
    g.add(spur);

    if (biome.hasSnow || height > 22) {
      const cap = new THREE.Mesh(
        this.getGeo('mtn_cap', () => new THREE.ConeGeometry(0.42, 0.38, 7)),
        snowMat
      );
      cap.scale.set(width, height, width * 0.85);
      cap.position.y = height * 0.83;
      cap.rotation.y = seed;
      g.add(cap);
    }

    return g;
  }

  // Decorative roadside Tibetan Prayer Flag Span (2 timber poles + sagging colorful banner)
  public buildPrayerFlagArch(): THREE.Group {
    const g = new THREE.Group();
    const poleMat = this.getMat('timber_pole', () => new THREE.MeshStandardMaterial({
      color: 0x5c3a21,
      roughness: 0.88,
      metalness: 0.05,
    }));
    const flagMat = this.getMat('prayer_flag_mat', () => new THREE.MeshStandardMaterial({
      map: this.tex.prayerFlags,
      roughness: 0.78,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }));

    const poleGeo = this.getGeo('pf_pole', () => new THREE.CylinderGeometry(0.14, 0.18, 6.2, 8));
    const poleL = new THREE.Mesh(poleGeo, poleMat);
    poleL.position.set(-5.8, 3.1, 0);
    poleL.castShadow = true;
    const poleR = new THREE.Mesh(poleGeo, poleMat);
    poleR.position.set(5.8, 3.1, 0);
    poleR.castShadow = true;

    const banner = new THREE.Mesh(
      this.getGeo('pf_banner', () => new THREE.PlaneGeometry(11.4, 0.95, 10, 1)),
      flagMat
    );
    banner.position.set(0, 5.45, 0);

    const finialGeo = this.getGeo('pf_fin', () => new THREE.ConeGeometry(0.22, 0.55, 8));
    const goldMat = this.getMat('chorten_gold', () => new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85,
    }));
    const finL = new THREE.Mesh(finialGeo, goldMat);
    finL.position.set(-5.8, 6.35, 0);
    const finR = new THREE.Mesh(finialGeo, goldMat);
    finR.position.set(5.8, 6.35, 0);

    g.add(poleL, poleR, banner, finL, finR);
    return g;
  }

  // Obstacle 1: Low Barrier (Jump Over) - 4 parts
  private buildLowBarrier(): THREE.Group {
    const g = new THREE.Group();
    const stripeMat = this.getMat('hazard_stripe', () => new THREE.MeshStandardMaterial({
      map: this.tex.hazardStripe,
      roughness: 0.55,
      metalness: 0.15,
    }));
    const metalMat = this.getMat('steel_dark', () => new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.7,
    }));
    const glowMat = this.getMat('barrier_amber', () => new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    }));

    const beam = new THREE.Mesh(
      this.getGeo('lb_beam', () => new THREE.BoxGeometry(2.55, 0.52, 0.36)),
      stripeMat
    );
    beam.position.y = 0.72;
    beam.castShadow = true;

    const legGeo = this.getGeo('lb_leg', () => new THREE.BoxGeometry(0.22, 0.95, 0.45));
    const legL = new THREE.Mesh(legGeo, metalMat);
    legL.position.set(-1.05, 0.475, 0);
    const legR = new THREE.Mesh(legGeo, metalMat);
    legR.position.set(1.05, 0.475, 0);

    const beacon = new THREE.Mesh(
      this.getGeo('lb_beac', () => new THREE.SphereGeometry(0.13, 10, 10)),
      glowMat
    );
    beacon.position.set(0, 1.04, 0);

    g.add(beam, legL, legR, beacon);
    return g;
  }

  // Obstacle 2: High Monastery Gate (Slide Under!) - 5 parts
  private buildHighGate(): THREE.Group {
    const g = new THREE.Group();
    const woodMat = this.getMat('monastery_red', () => new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.72,
      metalness: 0.08,
    }));
    const goldMat = this.getMat('chorten_gold', () => new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85,
    }));
    const flagMat = this.getMat('prayer_flag_mat', () => new THREE.MeshStandardMaterial({
      map: this.tex.prayerFlags,
      roughness: 0.78,
      side: THREE.DoubleSide,
    }));

    const postGeo = this.getGeo('hg_post', () => new THREE.BoxGeometry(0.28, 3.2, 0.32));
    const postL = new THREE.Mesh(postGeo, woodMat);
    postL.position.set(-1.35, 1.6, 0);
    postL.castShadow = true;
    const postR = new THREE.Mesh(postGeo, woodMat);
    postR.position.set(1.35, 1.6, 0);
    postR.castShadow = true;

    // Overhead lintel sits between y=1.35 and y=2.65 -> player must SLIDE!
    const lintel = new THREE.Mesh(
      this.getGeo('hg_lintel', () => new THREE.BoxGeometry(3.0, 0.85, 0.55)),
      woodMat
    );
    lintel.position.set(0, 2.05, 0);
    lintel.castShadow = true;

    const trim = new THREE.Mesh(
      this.getGeo('hg_trim', () => new THREE.BoxGeometry(3.15, 0.18, 0.62)),
      goldMat
    );
    trim.position.set(0, 2.55, 0);

    const curtain = new THREE.Mesh(
      this.getGeo('hg_curt', () => new THREE.PlaneGeometry(2.55, 0.45)),
      flagMat
    );
    curtain.position.set(0, 1.45, 0.29);

    g.add(postL, postR, lintel, trim, curtain);
    return g;
  }

  // Obstacle 3: Himalayan Boulder Cluster (Lane Switch around) - 4 parts
  private buildBoulderWall(biome: BiomeConfig): THREE.Group {
    const g = new THREE.Group();
    const mat = this.getMat(`rock_${biome.id}`, () => new THREE.MeshStandardMaterial({
      color: biome.rockPrimary,
      map: this.tex.rockSurface,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    }));
    const subMat = this.getMat(`rock2_${biome.id}`, () => new THREE.MeshStandardMaterial({
      color: biome.rockSecondary,
      roughness: 0.92,
      flatShading: true,
    }));

    const mainRock = new THREE.Mesh(
      this.getGeo('bould_main', () => new THREE.DodecahedronGeometry(1.1, 0)),
      mat
    );
    mainRock.scale.set(1.05, 1.25, 0.95);
    mainRock.position.set(0, 1.15, 0);
    mainRock.castShadow = true;

    const sideL = new THREE.Mesh(
      this.getGeo('bould_sub', () => new THREE.DodecahedronGeometry(0.68, 0)),
      subMat
    );
    sideL.position.set(-0.78, 0.62, 0.22);
    sideL.rotation.set(0.4, 0.8, 0.2);
    sideL.castShadow = true;

    const sideR = new THREE.Mesh(
      this.getGeo('bould_sub', () => new THREE.DodecahedronGeometry(0.68, 0)),
      subMat
    );
    sideR.position.set(0.76, 0.58, -0.2);
    sideR.rotation.set(-0.3, 0.5, 0.4);
    sideR.castShadow = true;

    g.add(mainRock, sideL, sideR);
    return g;
  }

  // Obstacle 4: Animated Traffic Vehicles (Trucks, Ladakh Tourist Taxis, Highway Vans) with spinning wheels
  private buildTrafficVehicle(
    trafficKind: 'truck' | 'taxi_suv' | 'convoy_van',
    variant: number
  ): { group: THREE.Group; wheels: THREE.Object3D[] } {
    const g = new THREE.Group();
    const wheels: THREE.Object3D[] = [];
    const darkMat = this.getMat('tr_dark', () => new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.9,
    }));
    const rimMat = this.getMat('tr_rim', () => new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.28,
      metalness: 0.85,
    }));
    const headMat = this.getMat('tr_hl', () => new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 2.2,
    }));
    const tailMat = this.getMat('tr_tl', () => new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 2.0,
    }));
    const glassMat = this.getMat('tr_glass', () => new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.15,
      metalness: 0.4,
    }));
    const goldMat = this.getMat('chorten_gold', () => new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85,
    }));

    const addTrafficWheel = (wx: number, wz: number, radius: number, width: number) => {
      const wg = new THREE.Group();
      const tireGeo = this.getGeo(`tr_tire_${radius}`, () => {
        const geo = new THREE.CylinderGeometry(radius, radius, width, 14);
        geo.rotateZ(Math.PI / 2);
        return geo;
      });
      const hubGeo = this.getGeo(`tr_hub_${radius}`, () => {
        const geo = new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, width + 0.03, 10);
        geo.rotateZ(Math.PI / 2);
        return geo;
      });
      wg.add(new THREE.Mesh(tireGeo, darkMat), new THREE.Mesh(hubGeo, rimMat));
      wg.position.set(wx, radius, wz);
      g.add(wg);
      wheels.push(wg);
    };

    if (trafficKind === 'truck') {
      const colors = [0xd97706, 0xbe123c, 0x0f766e, 0x4d7c0f];
      const cabMat = this.getMat(`tr_cab_${variant}`, () => new THREE.MeshStandardMaterial({
        color: colors[variant % colors.length],
        roughness: 0.35,
        metalness: 0.4,
      }));
      const cargoMat = this.getMat('tr_cargo', () => new THREE.MeshStandardMaterial({
        color: 0x78350f,
        map: this.tex.woodenPlank,
        roughness: 0.8,
        metalness: 0.05,
      }));

      // Truck faces +Z (oncoming)
      const cab = new THREE.Mesh(
        this.getGeo('tr_cab_geo', () => new THREE.BoxGeometry(2.1, 1.75, 1.85)),
        cabMat
      );
      cab.position.set(0, 1.35, 2.35);
      cab.castShadow = true;

      const crown = new THREE.Mesh(
        this.getGeo('tr_crown_geo', () => new THREE.BoxGeometry(2.15, 0.32, 1.2)),
        goldMat
      );
      crown.position.set(0, 2.38, 2.35);

      const wind = new THREE.Mesh(
        this.getGeo('tr_wind', () => new THREE.BoxGeometry(1.75, 0.56, 0.08)),
        glassMat
      );
      wind.position.set(0, 1.62, 3.28);

      const cargo = new THREE.Mesh(
        this.getGeo('tr_cargo_geo', () => new THREE.BoxGeometry(2.22, 2.1, 4.4)),
        cargoMat
      );
      cargo.position.set(0, 1.62, -0.85);
      cargo.castShadow = true;

      [
        [-1.02, 2.35],
        [1.02, 2.35],
        [-1.02, -0.2],
        [1.02, -0.2],
        [-1.02, -2.0],
        [1.02, -2.0],
      ].forEach(([wx, wz]) => addTrafficWheel(wx, wz, 0.46, 0.32));

      const hlGeo = this.getGeo('tr_hl_geo', () => new THREE.BoxGeometry(0.32, 0.18, 0.08));
      const hlL = new THREE.Mesh(hlGeo, headMat);
      hlL.position.set(-0.72, 0.92, 3.29);
      const hlR = new THREE.Mesh(hlGeo, headMat);
      hlR.position.set(0.72, 0.92, 3.29);

      g.add(cab, crown, wind, cargo, hlL, hlR);
    } else if (trafficKind === 'taxi_suv') {
      // Ladakh Tourist Taxi / Expedition SUV (faces +Z oncoming)
      const colors = [0xf8fafc, 0xfacc15, 0x0284c7, 0xdc2626];
      const bodyMat = this.getMat(`tx_body_${variant}`, () => new THREE.MeshStandardMaterial({
        color: colors[variant % colors.length],
        roughness: 0.28,
        metalness: 0.45,
      }));
      const lower = new THREE.Mesh(
        this.getGeo('tx_lower', () => new THREE.BoxGeometry(1.85, 0.72, 3.8)),
        bodyMat
      );
      lower.position.set(0, 0.74, 0);
      lower.castShadow = true;

      const cabin = new THREE.Mesh(
        this.getGeo('tx_cabin', () => new THREE.BoxGeometry(1.68, 0.62, 2.2)),
        bodyMat
      );
      cabin.position.set(0, 1.38, -0.25);
      cabin.castShadow = true;

      const rack = new THREE.Mesh(
        this.getGeo('tx_rack', () => new THREE.BoxGeometry(1.42, 0.12, 1.65)),
        goldMat
      );
      rack.position.set(0, 1.74, -0.25);

      const wind = new THREE.Mesh(
        this.getGeo('tx_wind', () => new THREE.BoxGeometry(1.52, 0.48, 0.08)),
        glassMat
      );
      wind.position.set(0, 1.36, 0.87);

      [
        [-0.9, 1.2],
        [0.9, 1.2],
        [-0.9, -1.2],
        [0.9, -1.2],
      ].forEach(([wx, wz]) => addTrafficWheel(wx, wz, 0.4, 0.26));

      const hlGeo = this.getGeo('tx_hl', () => new THREE.BoxGeometry(0.28, 0.14, 0.08));
      const hlL = new THREE.Mesh(hlGeo, headMat);
      hlL.position.set(-0.62, 0.78, 1.91);
      const hlR = new THREE.Mesh(hlGeo, headMat);
      hlR.position.set(0.62, 0.78, 1.91);

      g.add(lower, cabin, rack, wind, hlL, hlR);
    } else {
      // Same-direction Highway Cruiser Van (faces -Z, glowing red taillights toward player!)
      const colors = [0x334155, 0x0d9488, 0xb45309, 0x1d4ed8];
      const vanMat = this.getMat(`vn_body_${variant}`, () => new THREE.MeshStandardMaterial({
        color: colors[variant % colors.length],
        roughness: 0.34,
        metalness: 0.4,
      }));
      const hull = new THREE.Mesh(
        this.getGeo('vn_hull', () => new THREE.BoxGeometry(1.92, 1.42, 4.1)),
        vanMat
      );
      hull.position.set(0, 1.08, 0);
      hull.castShadow = true;

      const rearGlass = new THREE.Mesh(
        this.getGeo('vn_rglass', () => new THREE.BoxGeometry(1.52, 0.52, 0.08)),
        glassMat
      );
      rearGlass.position.set(0, 1.4, 2.06);

      const stripe = new THREE.Mesh(
        this.getGeo('vn_stripe', () => new THREE.BoxGeometry(1.96, 0.16, 4.12)),
        goldMat
      );
      stripe.position.set(0, 0.96, 0);

      [
        [-0.92, 1.28],
        [0.92, 1.28],
        [-0.92, -1.28],
        [0.92, -1.28],
      ].forEach(([wx, wz]) => addTrafficWheel(wx, wz, 0.4, 0.26));

      const tlGeo = this.getGeo('vn_tl', () => new THREE.BoxGeometry(0.32, 0.18, 0.08));
      const tlL = new THREE.Mesh(tlGeo, tailMat);
      tlL.position.set(-0.68, 0.84, 2.07);
      const tlR = new THREE.Mesh(tlGeo, tailMat);
      tlR.position.set(0.68, 0.84, 2.07);

      g.add(hull, rearGlass, stripe, tlL, tlR);
    }

    return { group: g, wheels };
  }

  // Reflective Himalayan Meltwater / Lake-Shore Road Puddle
  private buildRoadPuddle(biome: BiomeConfig): THREE.Group {
    const g = new THREE.Group();
    const puddleColor = biome.waterColor ?? (biome.hasSnow ? 0x38bdf8 : 0x0ea5a3);
    const waterMat = this.getMat(`puddle_${biome.id}`, () => new THREE.MeshPhysicalMaterial({
      color: puddleColor,
      roughness: 0.06,
      metalness: 0.25,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.72,
    }));
    const rimMat = this.getMat(`puddle_rim_${biome.id}`, () => new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.45,
    }));

    const disc = new THREE.Mesh(
      this.getGeo('puddle_disc', () => {
        const geo = new THREE.CircleGeometry(1.25, 18);
        geo.rotateX(-Math.PI / 2);
        return geo;
      }),
      waterMat
    );
    disc.scale.set(1.05, 1, 1.55);

    const ripple = new THREE.Mesh(
      this.getGeo('puddle_ring', () => {
        const geo = new THREE.RingGeometry(0.75, 0.88, 18);
        geo.rotateX(-Math.PI / 2);
        return geo;
      }),
      rimMat
    );
    ripple.position.y = 0.004;
    ripple.scale.set(1.05, 1, 1.55);

    g.add(disc, ripple);
    g.position.y = 0.032; // cleanly above road y = 0.02
    return g;
  }

  // Interactive Sky Ramp + Elevated Trestle Bridge (4+ parts)
  private buildRampBridge(): THREE.Group {
    const g = new THREE.Group();
    const plankMat = this.getMat('wood_plank_mat', () => new THREE.MeshStandardMaterial({
      map: this.tex.woodenPlank,
      roughness: 0.82,
      metalness: 0.06,
    }));
    const railMat = this.getMat('chorten_gold', () => new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.75,
    }));
    const darkMat = this.getMat('steel_dark', () => new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.55,
      metalness: 0.65,
    }));

    // Ramp spans z = +8 to z = +1 (leading up from y=0 to y=2.4)
    const ramp = new THREE.Mesh(
      this.getGeo('br_ramp', () => new THREE.BoxGeometry(2.5, 0.24, 7.4)),
      plankMat
    );
    ramp.position.set(0, 1.18, 4.5);
    ramp.rotation.x = Math.atan2(2.35, 7.0); // slopes UP toward -Z
    ramp.receiveShadow = true;

    // Elevated deck spans z = +1 to z = -11 at y = 2.4
    const deck = new THREE.Mesh(
      this.getGeo('br_deck', () => new THREE.BoxGeometry(2.55, 0.26, 12.2)),
      plankMat
    );
    deck.position.set(0, 2.35, -5.0);
    deck.castShadow = true;
    deck.receiveShadow = true;

    // Side guard rails & support pillars
    const railGeo = this.getGeo('br_rail', () => new THREE.BoxGeometry(0.12, 0.38, 12.2));
    const railL = new THREE.Mesh(railGeo, railMat);
    railL.position.set(-1.24, 2.65, -5.0);
    const railR = new THREE.Mesh(railGeo, railMat);
    railR.position.set(1.24, 2.65, -5.0);

    const postGeo = this.getGeo('br_post', () => new THREE.CylinderGeometry(0.12, 0.14, 2.35, 8));
    [-10.5, -5.0, 0.5].forEach((pz) => {
      const pL = new THREE.Mesh(postGeo, darkMat);
      pL.position.set(-1.1, 1.175, pz);
      const pR = new THREE.Mesh(postGeo, darkMat);
      pR.position.set(1.1, 1.175, pz);
      g.add(pL, pR);
    });

    g.add(ramp, deck, railL, railR);
    return g;
  }

  // Composite Coin Mesh (3-part beveled medallion + inner gem/emblem)
  public buildCoinMesh(tier: CoinTier, biome: BiomeConfig): THREE.Group {
    const g = new THREE.Group();
    const colorMap: Record<CoinTier, number> = {
      copper: 0xd97706,
      silver: 0xe2e8f0,
      gold: 0xfacc15,
      biome: biome.coinHex,
    };
    const rimColor = colorMap[tier];

    const rimMat = this.getMat(`coin_rim_${tier}_${biome.id}`, () => new THREE.MeshStandardMaterial({
      color: rimColor,
      emissive: rimColor,
      emissiveIntensity: tier === 'biome' ? 0.55 : 0.25,
      roughness: 0.18,
      metalness: 0.9,
    }));
    const coreMat = this.getMat(`coin_core_${tier}_${biome.id}`, () => new THREE.MeshStandardMaterial({
      color: tier === 'biome' ? 0xffffff : 0xfef08a,
      emissive: rimColor,
      emissiveIntensity: tier === 'biome' ? 0.9 : 0.35,
      roughness: 0.15,
      metalness: 0.65,
    }));

    const scale = tier === 'biome' ? 1.22 : tier === 'gold' ? 1.08 : 0.95;

    const disc = new THREE.Mesh(
      this.getGeo('coin_disc', () => {
        const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 10);
        geo.rotateX(Math.PI / 2);
        return geo;
      }),
      rimMat
    );
    const ring = new THREE.Mesh(
      this.getGeo('coin_ring', () => new THREE.TorusGeometry(0.42, 0.06, 8, 12)),
      rimMat
    );
    const gem = new THREE.Mesh(
      this.getGeo('coin_gem', () => new THREE.OctahedronGeometry(0.22, 0)),
      coreMat
    );
    gem.scale.set(1, 1, 0.6);

    g.add(disc, ring, gem);
    g.scale.setScalar(scale);
    return g;
  }

  // Composite Powerup Collectible (3-4 parts)
  public buildPowerupMesh(type: PowerupType): THREE.Group {
    const g = new THREE.Group();
    const colorMap: Record<PowerupType, number> = {
      magnet: 0xf43f5e,
      shield: 0x38bdf8,
      double: 0xfacc15,
      nitro: 0x2dd4bf,
    };
    const mat = this.getMat(`pw_${type}`, () => new THREE.MeshStandardMaterial({
      color: colorMap[type],
      emissive: colorMap[type],
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.75,
    }));
    const haloMat = this.getMat(`pw_halo_${type}`, () => new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: colorMap[type],
      emissiveIntensity: 1.2,
      roughness: 0.15,
    }));

    const halo = new THREE.Mesh(
      this.getGeo('pw_halo', () => new THREE.TorusGeometry(0.68, 0.06, 8, 20)),
      haloMat
    );
    g.add(halo);

    if (type === 'magnet') {
      const arch = new THREE.Mesh(
        this.getGeo('pw_mag', () => new THREE.TorusGeometry(0.32, 0.11, 10, 16, Math.PI)),
        mat
      );
      arch.position.y = 0.05;
      const tipMat = this.getMat('chrome_pw', () => new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.9,
        roughness: 0.15,
      }));
      const tipL = new THREE.Mesh(this.getGeo('pw_tip', () => new THREE.BoxGeometry(0.22, 0.22, 0.22)), tipMat);
      tipL.position.set(-0.32, -0.08, 0);
      const tipR = tipL.clone();
      tipR.position.x = 0.32;
      g.add(arch, tipL, tipR);
    } else if (type === 'shield') {
      const core = new THREE.Mesh(
        this.getGeo('pw_octa', () => new THREE.OctahedronGeometry(0.42, 0)),
        mat
      );
      const belt = new THREE.Mesh(
        this.getGeo('pw_belt', () => new THREE.TorusGeometry(0.45, 0.05, 8, 16)),
        haloMat
      );
      belt.rotation.x = Math.PI / 2;
      g.add(core, belt);
    } else if (type === 'double') {
      const bar1 = new THREE.Mesh(
        this.getGeo('pw_star', () => new THREE.BoxGeometry(0.55, 0.55, 0.18)),
        mat
      );
      const bar2 = bar1.clone();
      bar2.rotation.z = Math.PI / 4;
      g.add(bar1, bar2);
    } else {
      // nitro
      const body = new THREE.Mesh(
        this.getGeo('pw_nit', () => new THREE.CylinderGeometry(0.22, 0.26, 0.65, 12)),
        mat
      );
      const cone = new THREE.Mesh(
        this.getGeo('pw_nit_top', () => new THREE.ConeGeometry(0.24, 0.28, 12)),
        haloMat
      );
      cone.position.y = 0.44;
      g.add(body, cone);
    }

    return g;
  }

  public createRoadChunk(
    zCenter: number,
    biome: BiomeConfig,
    spawnEntities: boolean,
    density: number,
    movingChance: number,
    rampChance: number,
    coinMultiplier: number
  ): RoadChunk {
    const group = new THREE.Group();
    group.position.set(0, 0, zCenter);

    // 1. Road Surface
    const roadTex =
      biome.roadStyle === 'snow_track'
        ? this.tex.roadSnow
        : biome.roadStyle === 'golden_pass'
          ? this.tex.roadSand
          : biome.roadStyle === 'canyon_stone'
            ? this.tex.roadStone
            : this.tex.roadAsphalt;

    const roadMat = this.getMat(`road_${biome.id}`, () => new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.86,
      metalness: 0.05,
    }));
    const road = new THREE.Mesh(
      this.getGeo('chunk_road', () => {
        const g = new THREE.PlaneGeometry(ROAD_WIDTH, CHUNK_LENGTH);
        g.rotateX(-Math.PI / 2);
        return g;
      }),
      roadMat
    );
    road.position.y = 0.02; // Offset >= 0.02 above terrain to prevent Z-fighting
    road.receiveShadow = true;
    group.add(road);

    // Raised stone shoulder curbs
    const curbMat = this.getMat(`curb_${biome.id}`, () => new THREE.MeshStandardMaterial({
      color: biome.rockSecondary,
      roughness: 0.9,
      metalness: 0.04,
    }));
    const curbGeo = this.getGeo('chunk_curb', () => new THREE.BoxGeometry(0.65, 0.24, CHUNK_LENGTH));
    const curbL = new THREE.Mesh(curbGeo, curbMat);
    curbL.position.set(-ROAD_WIDTH / 2 - 0.3, 0.12, 0);
    curbL.receiveShadow = true;
    const curbR = new THREE.Mesh(curbGeo, curbMat);
    curbR.position.set(ROAD_WIDTH / 2 + 0.3, 0.12, 0);
    curbR.receiveShadow = true;
    group.add(curbL, curbR);

    // 2. Vast Outer Himalayan Terrain & Pangong/Zanskar Water Plane
    const terrainMat = this.getMat(`terrain_${biome.id}`, () => new THREE.MeshStandardMaterial({
      color: biome.groundTint,
      map: this.tex.rockSurface,
      roughness: 0.95,
      metalness: 0.02,
    }));

    // Right shoulder ground (cliffs/dunes)
    const groundR = new THREE.Mesh(
      this.getGeo('chunk_ground_side', () => {
        const g = new THREE.PlaneGeometry(140, CHUNK_LENGTH);
        g.rotateX(-Math.PI / 2);
        return g;
      }),
      terrainMat
    );
    groundR.position.set(ROAD_WIDTH / 2 + 70, 0, 0);
    groundR.receiveShadow = true;
    group.add(groundR);

    // Left shoulder: Turquoise lake / river if biome has water, else valley floor
    if (biome.waterColor !== null) {
      const waterMat = this.getMat(`water_${biome.id}`, () => new THREE.MeshStandardMaterial({
        color: biome.waterColor!,
        map: this.tex.waterSurface,
        roughness: 0.16,
        metalness: 0.35,
      }));
      const bankL = new THREE.Mesh(
        this.getGeo('chunk_bank', () => {
          const g = new THREE.PlaneGeometry(4.5, CHUNK_LENGTH);
          g.rotateX(-Math.PI / 2);
          return g;
        }),
        terrainMat
      );
      bankL.position.set(-ROAD_WIDTH / 2 - 2.25, 0, 0);
      const waterL = new THREE.Mesh(
        this.getGeo('chunk_water', () => {
          const g = new THREE.PlaneGeometry(140, CHUNK_LENGTH);
          g.rotateX(-Math.PI / 2);
          return g;
        }),
        waterMat
      );
      waterL.position.set(-ROAD_WIDTH / 2 - 74.5, -0.35, 0);
      group.add(bankL, waterL);
    } else {
      const groundL = new THREE.Mesh(
        this.getGeo('chunk_ground_side', () => {
          const g = new THREE.PlaneGeometry(140, CHUNK_LENGTH);
          g.rotateX(-Math.PI / 2);
          return g;
        }),
        terrainMat
      );
      groundL.position.set(-ROAD_WIDTH / 2 - 70, 0, 0);
      groundL.receiveShadow = true;
      group.add(groundL);
    }

    // 3. Himalayan Scenery (Mountains, Chortens, Deodar Pines, Prayer Flag Arches)
    const mtn1 = this.buildMountainPeak(biome, 24 + (Math.abs(zCenter) % 14), 24, zCenter * 0.13);
    mtn1.position.set(32, -0.2, -8);
    const mtn2 = this.buildMountainPeak(biome, 34 + (Math.abs(zCenter) % 18), 34, zCenter * 0.27);
    mtn2.position.set(58, -0.2, 10);
    const mtnL = this.buildMountainPeak(biome, 28 + (Math.abs(zCenter) % 16), 32, zCenter * 0.31);
    mtnL.position.set(biome.waterColor !== null ? -68 : -36, -0.4, 2);
    group.add(mtn1, mtn2, mtnL);

    const chunkSeed = Math.abs(Math.round(zCenter / CHUNK_LENGTH));
    if (chunkSeed % 3 === 0) {
      const arch = this.buildPrayerFlagArch();
      arch.position.set(0, 0, 0);
      group.add(arch);
    }
    if (chunkSeed % 4 === 1) {
      const chorten = this.buildChorten(0.9);
      chorten.position.set(8.6, 0, -10);
      group.add(chorten);
    }
    if (biome.id === 'khardung' || biome.id === 'zanskar' || chunkSeed % 2 === 0) {
      const treeR = this.buildDeodarTree(0.85 + (chunkSeed % 3) * 0.15, biome.hasSnow);
      treeR.position.set(9.2, 0, 12);
      group.add(treeR);
      if (biome.waterColor === null) {
        const treeL = this.buildDeodarTree(0.95, biome.hasSnow);
        treeL.position.set(-9.5, 0, -12);
        group.add(treeL);
      }
    }

    // 4. Spawn Obstacles, Ramps, Road Puddles, Coins & Powerups
    const obstacles: SpawnedObstacle[] = [];
    const puddles: SpawnedPuddle[] = [];
    const coins: SpawnedCoin[] = [];
    const powerups: SpawnedPowerup[] = [];

    if (!spawnEntities) {
      return { group, zStart: zCenter, obstacles, puddles, coins, powerups };
    }

    // Divide chunk into 2 obstacle rows: local z = +10 and local z = -12
    const rows = [10, -12];
    let hasBridgeInChunk = false;
    let hasTrafficInChunk = false;

    for (const localZ of rows) {
      const worldZ = zCenter + localZ;

      // Chance to spawn an elevated ramp bridge in one lane
      if (!hasBridgeInChunk && localZ === 10 && Math.random() < rampChance) {
        hasBridgeInChunk = true;
        const bLane = Math.floor(Math.random() * 3);
        const bridgeMesh = this.buildRampBridge();
        bridgeMesh.position.set(LANE_X[bLane], 0, localZ - 4);
        group.add(bridgeMesh);

        obstacles.push({
          id: this.nextId++,
          kind: 'ramp_bridge',
          lane: bLane,
          z: worldZ - 4,
          length: 20,
          width: 2.4,
          minY: 0,
          maxY: 2.35,
          speed: 0,
          mesh: bridgeMesh,
          bridgeDeckY: 2.45,
        });

        // Line of high-value coins along the elevated bridge!
        for (let c = 0; c < 6; c++) {
          const tier: CoinTier = c >= 4 ? 'biome' : 'gold';
          const value = tier === 'biome' ? biome.coinValue : 5;
          const cz = localZ - 2 - c * 2.3;
          const coinMesh = this.buildCoinMesh(tier, biome);
          coinMesh.position.set(LANE_X[bLane], 3.25, cz);
          group.add(coinMesh);
          coins.push({
            id: this.nextId++,
            tier,
            value: Math.round(value * coinMultiplier),
            lane: bLane,
            x: LANE_X[bLane],
            y: 3.25,
            z: zCenter + cz,
            collected: false,
            mesh: coinMesh,
          });
        }
        continue;
      }

      if (Math.random() > density) {
        // Free coin line row + optional road puddle in another lane
        const coinLane = Math.floor(Math.random() * 3);
        for (let i = -1; i <= 1; i++) {
          const tier: CoinTier = Math.random() < 0.22 ? 'biome' : Math.random() < 0.45 ? 'silver' : 'copper';
          const baseVal = tier === 'biome' ? biome.coinValue : tier === 'silver' ? 2 : 1;
          const coinMesh = this.buildCoinMesh(tier, biome);
          const cz = localZ + i * 2.8;
          coinMesh.position.set(LANE_X[coinLane], 0.9, cz);
          group.add(coinMesh);
          coins.push({
            id: this.nextId++,
            tier,
            value: Math.round(baseVal * coinMultiplier),
            lane: coinLane,
            x: LANE_X[coinLane],
            y: 0.9,
            z: zCenter + cz,
            collected: false,
            mesh: coinMesh,
          });
        }
        if (Math.random() < (biome.waterColor !== null ? 0.65 : 0.42)) {
          const puddleMesh = this.buildRoadPuddle(biome);
          puddleMesh.position.set(LANE_X[coinLane], 0.032, localZ + 3.5);
          group.add(puddleMesh);
          puddles.push({
            id: this.nextId++,
            lane: coinLane,
            x: LANE_X[coinLane],
            z: worldZ + 3.5,
            radius: 1.5,
            splashed: false,
            mesh: puddleMesh,
          });
        }
        continue;
      }

      // Always leave AT LEAST 1 completely open lane, and cap moving traffic at 1 per chunk for fair pacing!
      const lanes = [0, 1, 2];
      const safeLane = Math.floor(Math.random() * 3);
      const numObstacles = hasTrafficInChunk ? 1 : Math.random() < 0.44 ? 2 : 1;
      const blockedCandidates = lanes.filter((l) => l !== safeLane);

      for (let k = 0; k < numObstacles; k++) {
        const lane = blockedCandidates[k];
        if (lane === undefined) continue;

        const r = Math.random();
        let kind: ObstacleKind;
        if (!hasTrafficInChunk && r < movingChance) {
          kind = 'moving_truck';
          hasTrafficInChunk = true;
        } else if (r < movingChance + 0.28) {
          kind = 'low_barrier';
        } else if (r < movingChance + 0.56) {
          kind = 'high_gate';
        } else {
          kind = 'boulder_wall';
        }

        let obsMesh: THREE.Group;
        let obsWheels: THREE.Object3D[] | undefined;
        let trafficKind: 'truck' | 'taxi_suv' | 'convoy_van' | undefined;
        let trafficDirection: 'oncoming' | 'same_way' | undefined;
        let width = 2.1;
        let length = 1.6;
        let minY = 0;
        let maxY = 2.2;
        let speed = 0;

        if (kind === 'low_barrier') {
          obsMesh = this.buildLowBarrier();
          maxY = 1.1;
          length = 0.7;
        } else if (kind === 'high_gate') {
          obsMesh = this.buildHighGate();
          minY = 1.25; // Sliding lowers player height below 1.05
          maxY = 2.75;
          length = 0.85;
        } else if (kind === 'moving_truck') {
          const tRoll = Math.random();
          if (tRoll < 0.42) {
            trafficKind = 'truck';
            trafficDirection = 'oncoming';
            width = 2.15;
            length = 6.2;
            maxY = 2.7;
            speed = 7.5 + Math.random() * 3.5; // Balanced oncoming truck speed
          } else if (tRoll < 0.74) {
            trafficKind = 'taxi_suv';
            trafficDirection = 'oncoming';
            width = 1.85;
            length = 3.8;
            maxY = 2.0;
            speed = 9.0 + Math.random() * 3.5; // Nimble oncoming Ladakh taxi
          } else {
            trafficKind = 'convoy_van';
            trafficDirection = 'same_way';
            width = 1.92;
            length = 4.1;
            maxY = 2.1;
            speed = -(8.5 + Math.random() * 3.5); // Moves ahead slower than player!
          }
          const built = this.buildTrafficVehicle(trafficKind, Math.floor(Math.random() * 4));
          obsMesh = built.group;
          obsWheels = built.wheels;
        } else {
          obsMesh = this.buildBoulderWall(biome);
          width = 2.1;
          length = 1.9;
          maxY = 2.4;
        }

        obsMesh.position.set(LANE_X[lane], 0, localZ);
        group.add(obsMesh);

        obstacles.push({
          id: this.nextId++,
          kind,
          lane,
          z: worldZ,
          length,
          width,
          minY,
          maxY,
          speed,
          mesh: obsMesh,
          wheels: obsWheels,
          trafficKind,
          trafficDirection,
          hornPlayed: false,
        });
      }

      // Spawn a road puddle in the safe lane (~50% chance) so players get immersive water splashes!
      if (Math.random() < (biome.waterColor !== null ? 0.62 : 0.38)) {
        const puddleMesh = this.buildRoadPuddle(biome);
        puddleMesh.position.set(LANE_X[safeLane], 0.032, localZ);
        group.add(puddleMesh);
        puddles.push({
          id: this.nextId++,
          lane: safeLane,
          x: LANE_X[safeLane],
          z: worldZ,
          radius: 1.5,
          splashed: false,
          mesh: puddleMesh,
        });
      }

      // Put coins in the safe lane (or powerup occasionally)
      if (Math.random() < 0.14) {
        const types: PowerupType[] = ['magnet', 'shield', 'double', 'nitro'];
        const pType = types[Math.floor(Math.random() * types.length)];
        const pMesh = this.buildPowerupMesh(pType);
        pMesh.position.set(LANE_X[safeLane], 1.15, localZ);
        group.add(pMesh);
        powerups.push({
          id: this.nextId++,
          type: pType,
          lane: safeLane,
          x: LANE_X[safeLane],
          y: 1.15,
          z: worldZ,
          collected: false,
          mesh: pMesh,
        });
      } else {
        for (let i = -1; i <= 1; i++) {
          const tier: CoinTier =
            Math.random() < 0.18
              ? 'biome'
              : Math.random() < 0.35
                ? 'gold'
                : Math.random() < 0.65
                  ? 'silver'
                  : 'copper';
          const baseVal =
            tier === 'biome'
              ? biome.coinValue
              : tier === 'gold'
                ? 5
                : tier === 'silver'
                  ? 2
                  : 1;
          const coinMesh = this.buildCoinMesh(tier, biome);
          const cz = localZ + i * 2.4;
          coinMesh.position.set(LANE_X[safeLane], 0.9, cz);
          group.add(coinMesh);
          coins.push({
            id: this.nextId++,
            tier,
            value: Math.round(baseVal * coinMultiplier),
            lane: safeLane,
            x: LANE_X[safeLane],
            y: 0.9,
            z: zCenter + cz,
            collected: false,
            mesh: coinMesh,
          });
        }
      }
    }

    return { group, zStart: zCenter, obstacles, puddles, coins, powerups };
  }
}
