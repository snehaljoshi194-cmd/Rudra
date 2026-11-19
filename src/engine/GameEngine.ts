import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BIOMES, computeRunScore, getLevelConfig, getVehicleSpec } from '../data/gameData';
import {
  BiomeConfig,
  CharacterGender,
  CoinTier,
  GameSettings,
  HighlightClip,
  HudSnapshot,
  LevelConfig,
  PowerupType,
  RunResult,
  UpgradeLevels,
  VehicleId,
} from '../types/game';
import { soundEngine } from './audio';
import { HighlightRecorder } from './highlightRecorder';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import { buildVehicleMesh, BuiltVehicle } from './vehicles';
import { CHUNK_LENGTH, LANE_X, RoadChunk, WorldBuilder } from './world';

// Pre-allocated scratch math helpers (zero GC in render loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _colorA = new THREE.Color();

export type EngineMode = 'menu' | 'store' | 'playing' | 'paused' | 'ended';

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onLevelComplete: (result: RunResult) => void;
  onGameOver: (result: RunResult) => void;
  onHighlightReady?: (clip: HighlightClip, isMidRunClip: boolean) => void;
}

interface BurstParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  startScale: number;
  endScale: number;
  baseOpacity: number;
  life: number;
  maxLife: number;
  mesh: THREE.Mesh;
}

export class GameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private tex: ProceduralTextureSet;
  private worldBuilder: WorldBuilder;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  private mode: EngineMode = 'menu';
  private frameId = 0;
  private lastTime = 0;
  private elapsed = 0;

  // Player & Vehicle
  private currentVehicleId: VehicleId = 'enfielder_350';
  private currentPaint = '#7f1d1d';
  private currentGender: CharacterGender = 'male';
  private playerVehicle: BuiltVehicle | null = null;
  private shieldBubble: THREE.Mesh;
  private exhaustTimer = 0;
  private skidTimer = 0;
  private skidAudioCooldown = 0;

  // World Chunks
  private chunks: RoadChunk[] = [];
  private currentBiome: BiomeConfig = BIOMES.pangong;
  private currentLevelConfig: LevelConfig = getLevelConfig(1);
  private upgrades: UpgradeLevels = { speed: 0, handling: 0, magnet: 0, nitro: 0 };
  private settings: GameSettings = {
    muted: false,
    volume: 0.75,
    graphics: 'high',
    cameraTilt: true,
    showHints: true,
  };

  // Gameplay State
  private playerLane = 1; // 0, 1, 2
  private playerX = 0;
  private playerY = 0;
  private playerZ = 0;
  private playerVelY = 0;
  private isGrounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private slideTimer = 0;
  private forwardSpeed = 24;
  private distanceMeters = 0;
  private runCoins = 0;
  private coinBreakdown: Record<CoinTier, number> = {
    copper: 0,
    silver: 0,
    gold: 0,
    biome: 0,
  };
  private coinStreak = 0;
  private streakDecayTimer = 0;
  private jumpsInRun = 0;
  private slidesInRun = 0;
  private powerupsInRun = 0;
  private nearMissesInRun = 0;
  private nearMissedObstacles = new Set<number>();
  private nearMissBanner: string | null = null;
  private nearMissBannerTimer = 0;
  private peakSpeedKmh = 0;
  private bestJumpHeightM = 0;
  private runTimeSec = 0;
  private highlightRecorder: HighlightRecorder;
  private shields = 0;
  private maxShields = 0;
  private invulnTimer = 0;
  private magnetTimer = 0;
  private doubleTimer = 0;
  private nitroTimer = 0;
  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private finishLineMesh: THREE.Group | null = null;
  private finishZ = -500;
  private hudThrottle = 0;

  // Showcase Orbit Interaction (Menu & Store)
  private showcaseAngle = 0.55;
  private showcaseTargetAngle = 0.55;
  private isDraggingShowcase = false;
  private lastPointerX = 0;
  private touchStartX = 0;
  private touchStartY = 0;
  private touchActive = false;

  // Pooled Particle Bursts & Ambient Snow/Dust
  private burstPool: BurstParticle[] = [];
  private ambientPoints: THREE.Points;
  private ambientPositions: Float32Array;

  // Bound listeners
  private onResizeBound: () => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.highlightRecorder = new HighlightRecorder(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.2,
      260
    );

    // Mandatory studio environment map for metallic reflections
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Balanced 3-point warm/cool outdoor rig
    this.hemiLight = new THREE.HemisphereLight(0x87cefa, 0x8a6d4b, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff3d6, 2.3);
    this.sunLight.position.set(22, 34, 18);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 110;
    const d = 24;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight(0x9bd7f2, 0.75);
    this.rimLight.position.set(-18, 14, -22);
    this.scene.add(this.rimLight);

    this.tex = createProceduralTextures(this.renderer);
    this.worldBuilder = new WorldBuilder(this.tex);

    // Shield bubble mesh (attached to player vehicle when shields > 0)
    this.shieldBubble = new THREE.Mesh(
      new THREE.SphereGeometry(1.75, 18, 14),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.22,
        wireframe: true,
      })
    );
    this.shieldBubble.position.y = 0.85;
    this.shieldBubble.visible = false;

    // Pooled particle system (shared by bursts, exhaust smoke, tire skid dust & water splashes)
    const partGeo = new THREE.IcosahedronGeometry(0.16, 0);
    for (let i = 0; i < 128; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(partGeo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.burstPool.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        gravity: 14,
        startScale: 1,
        endScale: 0.1,
        baseOpacity: 0.9,
        life: 0,
        maxLife: 0.5,
        mesh,
      });
    }

    // Ambient Himalayan wind/snow motes
    const moteCount = 160;
    this.ambientPositions = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      this.ambientPositions[i * 3] = (Math.random() - 0.5) * 34;
      this.ambientPositions[i * 3 + 1] = 0.5 + Math.random() * 14;
      this.ambientPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(this.ambientPositions, 3));
    const moteMat = new THREE.PointsMaterial({
      color: 0xf8fafc,
      size: 0.14,
      transparent: true,
      opacity: 0.65,
    });
    this.ambientPoints = new THREE.Points(moteGeo, moteMat);
    this.scene.add(this.ambientPoints);

    // Build initial showcase scene & vehicle
    this.applyBiomeAtmosphere(1);
    this.setVehicle('enfielder_350', '#b91c1c');
    this.rebuildInitialChunks(false);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind events
    this.onResizeBound = this.handleResize.bind(this);
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onBlurBound = this.handleBlur.bind(this);
    this.onPointerDownBound = this.handlePointerDown.bind(this);
    this.onPointerMoveBound = this.handlePointerMove.bind(this);
    this.onPointerUpBound = this.handlePointerUp.bind(this);

    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('blur', this.onBlurBound);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDownBound);
    window.addEventListener('pointermove', this.onPointerMoveBound);
    window.addEventListener('pointerup', this.onPointerUpBound);

    this.lastTime = performance.now();
    this.startLoop();
  }

  public applySettings(settings: GameSettings): void {
    this.settings = { ...settings };
    soundEngine.setMuted(settings.muted);
    soundEngine.setVolume(settings.volume);
    if (!this.isSoftwareGl) {
      this.renderer.setPixelRatio(
        settings.graphics === 'high' ? Math.min(window.devicePixelRatio, 2) : 1
      );
      this.renderer.shadowMap.enabled = settings.graphics === 'high';
    }
  }

  public setVehicle(
    id: VehicleId,
    paintHex: string,
    gender: CharacterGender = this.currentGender
  ): void {
    if (this.playerVehicle) {
      this.playerVehicle.group.remove(this.shieldBubble);
      this.scene.remove(this.playerVehicle.group);
    }
    this.currentVehicleId = id;
    this.currentPaint = paintHex;
    this.currentGender = gender;
    this.playerVehicle = buildVehicleMesh(id, paintHex, this.tex.contactShadow, gender);
    this.playerVehicle.group.add(this.shieldBubble);
    this.playerVehicle.group.position.set(this.playerX, this.playerY, this.playerZ);
    this.scene.add(this.playerVehicle.group);
  }

  public setMode(mode: EngineMode): void {
    this.mode = mode;
    if (mode === 'menu' || mode === 'store') {
      this.highlightRecorder.stopAll();
      soundEngine.stopEngine();
      this.playerX = 0;
      this.playerY = 0;
      this.playerZ = 0;
      this.playerVelY = 0;
      this.slideTimer = 0;
      this.shieldBubble.visible = false;
      if (this.playerVehicle) {
        this.playerVehicle.group.position.set(0, 0, 0);
        this.playerVehicle.group.rotation.set(0, 0, 0);
        this.playerVehicle.bodyGroup.scale.set(1, 1, 1);
      }
      if (this.finishLineMesh) {
        this.scene.remove(this.finishLineMesh);
        this.finishLineMesh = null;
      }
      this.applyBiomeAtmosphere(this.currentLevelConfig.level);
      this.rebuildInitialChunks(false);
    } else if (mode === 'paused') {
      this.highlightRecorder.pause();
      soundEngine.stopEngine();
    } else if (mode === 'playing') {
      this.highlightRecorder.resume();
      soundEngine.startEngine();
    }
  }

  public startLevel(levelNum: number, upgrades: UpgradeLevels): void {
    this.upgrades = { ...upgrades };
    this.currentLevelConfig = getLevelConfig(levelNum);
    this.applyBiomeAtmosphere(levelNum);

    const spec = getVehicleSpec(this.currentVehicleId);
    this.playerLane = 1;
    this.playerX = LANE_X[1];
    this.playerY = 0;
    this.playerZ = 0;
    this.playerVelY = 0;
    this.isGrounded = true;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.slideTimer = 0;
    this.distanceMeters = 0;
    this.runCoins = 0;
    this.coinBreakdown = { copper: 0, silver: 0, gold: 0, biome: 0 };
    this.coinStreak = 0;
    this.streakDecayTimer = 0;
    this.jumpsInRun = 0;
    this.slidesInRun = 0;
    this.powerupsInRun = 0;
    this.nearMissesInRun = 0;
    this.nearMissedObstacles.clear();
    this.nearMissBanner = null;
    this.nearMissBannerTimer = 0;
    this.peakSpeedKmh = Math.round(this.currentLevelConfig.baseSpeed * 3.4);
    this.bestJumpHeightM = 0;
    this.runTimeSec = 0;

    this.maxShields = spec.baseShields;
    this.shields = spec.baseShields;
    this.invulnTimer = 0;
    this.magnetTimer = 0;
    this.doubleTimer = 0;
    this.nitroTimer = 0;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;

    const speedBonus = 1 + spec.speedBonus + upgrades.speed * 0.035;
    this.forwardSpeed = this.currentLevelConfig.baseSpeed * speedBonus;

    // 1.35 world units per meter feel
    this.finishZ = -(this.currentLevelConfig.targetDistance * 1.35);

    this.rebuildInitialChunks(true);
    this.spawnFinishLineArch();

    if (this.playerVehicle) {
      this.playerVehicle.group.position.set(this.playerX, 0, 0);
      this.playerVehicle.group.rotation.set(0, 0, 0);
      this.playerVehicle.bodyGroup.scale.set(1, 1, 1);
      this.shieldBubble.visible = this.shields > 0;
    }

    this.mode = 'playing';
    this.highlightRecorder.startRun();
    soundEngine.startEngine();
    this.emitHud();
  }

  public applyBiomeAtmosphere(levelNum: number): void {
    const cfg = getLevelConfig(levelNum);
    this.currentLevelConfig = cfg;
    const biome = BIOMES[cfg.biome];
    this.currentBiome = biome;

    // Adjust sky/fog/sun slightly by timeOfDay
    const sky = new THREE.Color(biome.skyHorizon);
    const fog = new THREE.Color(biome.fogColor);
    const sunCol = new THREE.Color(biome.sunColor);
    let sunMult = 1.0;

    if (cfg.timeOfDay === 'dawn') {
      sky.lerp(_colorA.setHex(0xfca5a5), 0.25);
      fog.lerp(_colorA.setHex(0xfdba74), 0.2);
      sunCol.setHex(0xffb38a);
      sunMult = 0.92;
    } else if (cfg.timeOfDay === 'sunset') {
      sky.lerp(_colorA.setHex(0xf97316), 0.35);
      fog.lerp(_colorA.setHex(0xea580c), 0.25);
      sunCol.setHex(0xff8c5a);
      sunMult = 0.95;
    } else if (cfg.timeOfDay === 'night') {
      sky.lerp(_colorA.setHex(0x0f172a), 0.55);
      fog.lerp(_colorA.setHex(0x1e1b4b), 0.45);
      sunCol.setHex(0xc7d2fe);
      sunMult = 0.78;
    }

    this.scene.background = sky;
    this.scene.fog = new THREE.FogExp2(fog.getHex(), biome.fogDensity);
    this.sunLight.color.copy(sunCol);
    this.sunLight.intensity = biome.sunIntensity * sunMult;
    this.hemiLight.color.setHex(biome.hemiSky);
    this.hemiLight.groundColor.setHex(biome.hemiGround);
  }

  private clearChunks(): void {
    for (const c of this.chunks) {
      this.scene.remove(c.group);
    }
    this.chunks = [];
    if (this.finishLineMesh) {
      this.scene.remove(this.finishLineMesh);
      this.finishLineMesh = null;
    }
  }

  private rebuildInitialChunks(spawnEntities: boolean): void {
    this.clearChunks();
    // Build chunks from z = +CHUNK_LENGTH ahead to -6 * CHUNK_LENGTH
    for (let i = -1; i < 6; i++) {
      const zCenter = -i * CHUNK_LENGTH;
      const shouldSpawn = spawnEntities && i >= 1; // First 2 chunks safe runway!
      const chunk = this.worldBuilder.createRoadChunk(
        zCenter,
        this.currentBiome,
        shouldSpawn,
        this.currentLevelConfig.obstacleDensity,
        this.currentLevelConfig.movingTrafficChance,
        this.currentLevelConfig.rampChance,
        this.currentLevelConfig.coinMultiplier
      );
      this.scene.add(chunk.group);
      this.chunks.push(chunk);
    }
  }

  private spawnFinishLineArch(): void {
    const g = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.2,
      metalness: 0.9,
    });
    const bannerMat = new THREE.MeshStandardMaterial({
      color: this.currentBiome.coinHex,
      emissive: this.currentBiome.coinHex,
      emissiveIntensity: 0.9,
      roughness: 0.25,
    });

    const pillarGeo = new THREE.CylinderGeometry(0.32, 0.42, 6.4, 12);
    const pL = new THREE.Mesh(pillarGeo, goldMat);
    pL.position.set(-5.6, 3.2, 0);
    const pR = new THREE.Mesh(pillarGeo, goldMat);
    pR.position.set(5.6, 3.2, 0);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(12.0, 1.1, 0.75), bannerMat);
    beam.position.set(0, 5.6, 0);
    const stupaTop = this.worldBuilder.buildChorten(0.55);
    stupaTop.position.set(0, 6.15, 0);

    g.add(pL, pR, beam, stupaTop);
    g.position.set(0, 0, this.finishZ);
    this.scene.add(g);
    this.finishLineMesh = g;
  }

  public triggerSteer(dir: -1 | 1): void {
    if (this.mode !== 'playing') return;
    const next = Math.max(0, Math.min(2, this.playerLane + dir));
    if (next !== this.playerLane) {
      this.playerLane = next;
      soundEngine.playLaneSwitch();
      if (this.isGrounded) {
        if (this.skidAudioCooldown <= 0) {
          soundEngine.playSkid();
          this.skidAudioCooldown = 0.22;
        }
        const halfTrack = this.playerVehicle?.tireHalfTrack ?? 0.6;
        this.spawnSkidDust(this.playerX - dir * halfTrack, this.playerY + 0.12, this.playerZ + 0.85, 5);
      }
    }
  }

  public triggerJump(): void {
    if (this.mode !== 'playing') return;
    this.jumpBufferTimer = 0.14;
  }

  public triggerSlide(): void {
    if (this.mode !== 'playing') return;
    if (!this.isGrounded) {
      // Fast fall!
      this.playerVelY = Math.min(this.playerVelY, -24);
      this.slideTimer = 0.55;
      this.slidesInRun += 1;
      soundEngine.playSlide();
    } else if (this.slideTimer <= 0.1) {
      this.slideTimer = 0.68;
      this.slidesInRun += 1;
      soundEngine.playSlide();
      soundEngine.playSkid();
      this.spawnSkidDust(this.playerX, 0.15, this.playerZ + 0.9, 8);
    }
  }

  private handleResize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private handleBlur(): void {
    this.isDraggingShowcase = false;
    this.touchActive = false;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.mode !== 'playing') return;
    if (e.repeat) return;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        e.preventDefault();
        this.triggerSteer(-1);
        break;
      case 'ArrowRight':
      case 'KeyD':
        e.preventDefault();
        this.triggerSteer(1);
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        e.preventDefault();
        this.triggerJump();
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.triggerSlide();
        break;
      case 'KeyR':
        e.preventDefault();
        void this.captureMidRunHighlight();
        break;
    }
  }

  public async captureMidRunHighlight(): Promise<HighlightClip | null> {
    if (this.mode !== 'playing') return null;
    const spec = getVehicleSpec(this.currentVehicleId);
    const clip = await this.highlightRecorder.captureLast10Seconds(
      {
        level: this.currentLevelConfig.level,
        levelName: this.currentLevelConfig.name,
        biomeName: this.currentBiome.name,
        vehicleName: spec.name,
        won: false,
        peakSpeedKmh: this.peakSpeedKmh,
        jumpsCount: this.jumpsInRun,
        nearMisses: this.nearMissesInRun,
        savedToReel: true,
      },
      true
    );
    if (clip) {
      this.nearMissBanner = '10s HIGHLIGHT SAVED!';
      this.nearMissBannerTimer = 1.8;
      soundEngine.playUiClick();
      this.callbacks.onHighlightReady?.(clip, true);
      this.emitHud();
    }
    return clip;
  }

  private handlePointerDown(e: PointerEvent): void {
    if (this.mode === 'store' || this.mode === 'menu') {
      this.isDraggingShowcase = true;
      this.lastPointerX = e.clientX;
    } else if (this.mode === 'playing') {
      this.touchActive = true;
      this.touchStartX = e.clientX;
      this.touchStartY = e.clientY;
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.isDraggingShowcase && (this.mode === 'store' || this.mode === 'menu')) {
      const dx = e.clientX - this.lastPointerX;
      this.lastPointerX = e.clientX;
      this.showcaseTargetAngle -= dx * 0.01;
    } else if (this.touchActive && this.mode === 'playing') {
      const dx = e.clientX - this.touchStartX;
      const dy = e.clientY - this.touchStartY;
      if (Math.hypot(dx, dy) > 28) {
        this.touchActive = false;
        if (Math.abs(dx) > Math.abs(dy)) {
          this.triggerSteer(dx > 0 ? 1 : -1);
        } else {
          if (dy < 0) this.triggerJump();
          else this.triggerSlide();
        }
      }
    }
  }

  private handlePointerUp(): void {
    this.isDraggingShowcase = false;
    this.touchActive = false;
  }

  private spawnParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    gravity: number,
    colorHex: number,
    startScale: number,
    endScale: number,
    baseOpacity: number,
    maxLife: number
  ): void {
    for (const p of this.burstPool) {
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = vx;
        p.vy = vy;
        p.vz = vz;
        p.gravity = gravity;
        p.startScale = startScale;
        p.endScale = endScale;
        p.baseOpacity = baseOpacity;
        p.life = 0;
        p.maxLife = maxLife;
        const mat = p.mesh.material as THREE.MeshBasicMaterial;
        mat.color.setHex(colorHex);
        mat.opacity = baseOpacity;
        p.mesh.position.set(p.x, p.y, p.z);
        p.mesh.scale.setScalar(startScale);
        p.mesh.visible = true;
        return;
      }
    }
  }

  private spawnBurst(x: number, y: number, z: number, colorHex: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnParticle(
        x + (Math.random() - 0.5) * 0.6,
        y + Math.random() * 0.4,
        z + (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 7,
        2.5 + Math.random() * 5.5,
        (Math.random() - 0.5) * 7,
        14,
        colorHex,
        1.0,
        0.05,
        0.95,
        0.35 + Math.random() * 0.25
      );
    }
  }

  private spawnExhaustPuff(x: number, y: number, z: number, isNitro: boolean, isHover: boolean): void {
    const color = isNitro
      ? Math.random() < 0.5
        ? 0x2dd4bf
        : 0xf97316
      : isHover
        ? 0x38bdf8
        : 0x94a3b8;
    this.spawnParticle(
      x + (Math.random() - 0.5) * 0.08,
      y + (Math.random() - 0.5) * 0.06,
      z + 0.05,
      (Math.random() - 0.5) * 0.6,
      0.85 + Math.random() * 0.9,
      isNitro ? 7.5 : 3.2 + Math.random() * 1.8,
      -1.2, // smoke gently rises
      color,
      isNitro ? 0.85 : 0.45,
      isNitro ? 2.1 : 1.55,
      isNitro ? 0.72 : 0.45,
      isNitro ? 0.34 : 0.46
    );
  }

  private spawnSkidDust(x: number, y: number, z: number, count: number): void {
    const dustColor = this.currentBiome.hasSnow
      ? 0xe2e8f0
      : this.currentBiome.hasSand
        ? 0xd6b07a
        : 0xa8a29e;
    for (let i = 0; i < count; i++) {
      this.spawnParticle(
        x + (Math.random() - 0.5) * 0.35,
        y + Math.random() * 0.12,
        z + (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 3.4,
        1.2 + Math.random() * 2.2,
        2.5 + Math.random() * 3.0,
        4.5,
        dustColor,
        0.55,
        1.45,
        0.58,
        0.35 + Math.random() * 0.22
      );
    }
  }

  private spawnWaterSplash(x: number, y: number, z: number, halfTrack: number): void {
    for (let i = 0; i < 16; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const sx = x + side * (halfTrack + 0.12 + Math.random() * 0.15);
      const color = i % 3 === 0 ? 0xe0f2fe : 0x38bdf8;
      this.spawnParticle(
        sx,
        y + 0.12,
        z + (Math.random() - 0.5) * 0.6,
        side * (2.6 + Math.random() * 3.2),
        4.2 + Math.random() * 4.5,
        (Math.random() - 0.3) * 4.5,
        16,
        color,
        0.65,
        0.2,
        0.88,
        0.38 + Math.random() * 0.22
      );
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.burstPool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const t = p.life / p.maxLife;
      const s = THREE.MathUtils.lerp(p.startScale, p.endScale, t);
      p.mesh.position.set(p.x, Math.max(0.05, p.y), p.z);
      p.mesh.scale.setScalar(s);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.baseOpacity * (1 - t);
      p.mesh.rotation.x += 4 * dt;
      p.mesh.rotation.y += 3.5 * dt;
    }

    // Ambient Himalayan wind/snow motes anchored around player Z
    const pos = this.ambientPoints.geometry.attributes.position as THREE.BufferAttribute;
    const count = pos.count;
    for (let i = 0; i < count; i++) {
      let mx = pos.getX(i) + Math.sin(this.elapsed + i) * 0.6 * dt;
      let my = pos.getY(i) - (this.currentBiome.hasSnow ? 1.8 : 0.4) * dt;
      let mz = pos.getZ(i);
      if (my < 0.2) my = 12 + Math.random() * 4;
      if (mz > this.playerZ + 18) mz = this.playerZ - 58 - Math.random() * 20;
      if (mz < this.playerZ - 78) mz = this.playerZ + 12;
      pos.setXYZ(i, mx, my, mz);
    }
    pos.needsUpdate = true;
  }

  private startLoop(): void {
    const tick = () => {
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number): void {
    this.elapsed += dt;

    if (this.mode === 'menu' || this.mode === 'store') {
      this.updateShowcase(dt);
      this.updateParticles(dt);
      return;
    }

    if (this.mode !== 'playing') {
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.5);
      return;
    }

    const spec = getVehicleSpec(this.currentVehicleId);
    const cfg = this.currentLevelConfig;

    this.runTimeSec += dt;
    this.highlightRecorder.update(dt);

    // Timers
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.magnetTimer > 0) this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    if (this.doubleTimer > 0) this.doubleTimer = Math.max(0, this.doubleTimer - dt);
    if (this.nitroTimer > 0) this.nitroTimer = Math.max(0, this.nitroTimer - dt);
    if (this.slideTimer > 0) this.slideTimer = Math.max(0, this.slideTimer - dt);
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (this.nearMissBannerTimer > 0) {
      this.nearMissBannerTimer = Math.max(0, this.nearMissBannerTimer - dt);
      if (this.nearMissBannerTimer <= 0) this.nearMissBanner = null;
    }
    if (this.streakDecayTimer > 0) {
      this.streakDecayTimer -= dt;
      if (this.streakDecayTimer <= 0) this.coinStreak = 0;
    }

    const curSpeedKmh = Math.round(this.forwardSpeed * 3.4);
    if (curSpeedKmh > this.peakSpeedKmh) this.peakSpeedKmh = curSpeedKmh;
    if (this.playerY > this.bestJumpHeightM) this.bestJumpHeightM = this.playerY;

    // Progressive level speed ramp + nitro boost
    const progress = Math.min(1, this.distanceMeters / cfg.targetDistance);
    const speedMult = 1 + spec.speedBonus + this.upgrades.speed * 0.035;
    const targetSpeed =
      THREE.MathUtils.lerp(cfg.baseSpeed, cfg.maxSpeed, progress) *
      speedMult *
      (this.nitroTimer > 0 ? 1.38 : 1.0);
    this.forwardSpeed = THREE.MathUtils.damp(this.forwardSpeed, targetSpeed, 4.5, dt);

    // Advance forward (-Z)
    this.playerZ -= this.forwardSpeed * dt;
    this.distanceMeters = Math.abs(this.playerZ) / 1.35;

    // Check Finish Line!
    if (this.playerZ <= this.finishZ) {
      this.finishLevel(true);
      return;
    }

    // Smooth damped lane steering
    const targetX = LANE_X[this.playerLane];
    const handlingLambda = 11 + spec.handlingStat * 0.8 + this.upgrades.handling * 1.4;
    const prevX = this.playerX;
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, handlingLambda, dt);
    const lateralVel = (this.playerX - prevX) / dt;

    // Check elevated bridge deck height underneath player
    let floorY = 0;
    for (const chunk of this.chunks) {
      for (const obs of chunk.obstacles) {
        if (obs.kind === 'ramp_bridge' && Math.abs(this.playerX - LANE_X[obs.lane]) < 1.35) {
          // obs.z is center of bridge assembly: ramp goes from obs.z+8 (y=0) to obs.z+1 (y=2.35), deck goes to obs.z-11
          const relZ = this.playerZ - obs.z;
          if (relZ <= 8.2 && relZ >= 0.8) {
            const t = (8.2 - relZ) / 7.4;
            const rampY = THREE.MathUtils.clamp(t * 2.38, 0, 2.38);
            if (this.playerY >= rampY - 0.85) {
              floorY = Math.max(floorY, rampY);
            }
          } else if (relZ < 0.8 && relZ >= -11.2 && this.playerY >= 1.6) {
            floorY = Math.max(floorY, 2.38);
          }
        }
      }
    }

    // Coyote time & buffered jump execution
    if (this.isGrounded) {
      this.coyoteTimer = 0.11;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0 && (this.isGrounded || this.coyoteTimer > 0)) {
      const jumpPower = 12.6 + spec.jumpStat * 0.32;
      this.playerVelY = jumpPower;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.slideTimer = 0;
      this.jumpsInRun += 1;
      soundEngine.playJump();
      this.spawnBurst(this.playerX, this.playerY + 0.15, this.playerZ + 0.6, 0xfef3c7, 6);
    }

    if (this.skidAudioCooldown > 0) {
      this.skidAudioCooldown = Math.max(0, this.skidAudioCooldown - dt);
    }

    // Gravity & floor grounding
    const wasGrounded = this.isGrounded;
    this.playerVelY -= 34 * dt;
    this.playerY += this.playerVelY * dt;
    if (this.playerY <= floorY) {
      this.playerY = floorY;
      this.playerVelY = 0;
      this.isGrounded = true;
      if (!wasGrounded) {
        soundEngine.playLand();
        this.spawnSkidDust(this.playerX, this.playerY + 0.1, this.playerZ + 0.6, 6);
      }
    } else {
      this.isGrounded = false;
    }

    // Recycle passed chunks & spawn ahead
    const oldest = this.chunks[0];
    if (oldest && oldest.zStart - CHUNK_LENGTH > this.playerZ + 22) {
      this.scene.remove(oldest.group);
      this.chunks.shift();
      const lastZ = this.chunks[this.chunks.length - 1].zStart;
      const nextZ = lastZ - CHUNK_LENGTH;
      const allowEntities = nextZ > this.finishZ + 28;
      const nextChunk = this.worldBuilder.createRoadChunk(
        nextZ,
        this.currentBiome,
        allowEntities,
        cfg.obstacleDensity,
        cfg.movingTrafficChance,
        cfg.rampChance,
        cfg.coinMultiplier
      );
      this.scene.add(nextChunk.group);
      this.chunks.push(nextChunk);
    }

    // Update vehicle transform, wheels, banking tilt, squash/slide
    if (this.playerVehicle) {
      const v = this.playerVehicle;
      const hoverBob = v.isHover ? Math.sin(this.elapsed * 5.5) * 0.12 + 0.18 : 0;
      v.group.position.set(this.playerX, this.playerY + hoverBob, this.playerZ);

      // Banking roll into turns + pitch on jump
      const targetRoll = THREE.MathUtils.clamp(-lateralVel * 0.025, -0.32, 0.32);
      const targetPitch = this.isGrounded
        ? 0
        : THREE.MathUtils.clamp(this.playerVelY * 0.02, -0.22, 0.28);
      v.group.rotation.z = THREE.MathUtils.damp(v.group.rotation.z, targetRoll, 14, dt);
      v.group.rotation.x = THREE.MathUtils.damp(v.group.rotation.x, targetPitch, 10, dt);

      // Slide tuck squash
      const isSliding = this.slideTimer > 0 && this.isGrounded;
      const targetScaleY = isSliding ? 0.56 : 1.0;
      const targetScaleX = isSliding ? 1.12 : 1.0;
      v.bodyGroup.scale.y = THREE.MathUtils.damp(v.bodyGroup.scale.y, targetScaleY, 18, dt);
      v.bodyGroup.scale.x = THREE.MathUtils.damp(v.bodyGroup.scale.x, targetScaleX, 18, dt);

      // Spin wheels
      const wheelRot = this.forwardSpeed * dt * 1.45;
      for (const w of v.wheels) {
        w.rotation.x -= wheelRot;
      }
      for (const t of v.thrusters) {
        t.rotation.z += dt * 4;
      }

      // Invulnerability flicker after shield save
      v.bodyGroup.visible =
        this.invulnTimer <= 0 || Math.floor(this.invulnTimer * 18) % 2 === 0;
      this.shieldBubble.visible = this.shields > 0 || this.nitroTimer > 0;
      if (this.shieldBubble.visible) {
        this.shieldBubble.rotation.y += dt * 1.8;
        (this.shieldBubble.material as THREE.MeshBasicMaterial).color.setHex(
          this.nitroTimer > 0 ? 0x2dd4bf : 0x38bdf8
        );
      }

      // Shadow grounding stays on floorY
      v.shadowPlane.position.y = Math.max(0.02, floorY - this.playerY - hoverBob + 0.02);

      // Continuous Exhaust Smoke Particles from vehicle tailpipe(s)
      this.exhaustTimer += dt;
      const exhaustInterval = this.nitroTimer > 0 ? 0.028 : 0.055;
      if (this.exhaustTimer >= exhaustInterval) {
        this.exhaustTimer = 0;
        for (const off of v.exhaustOffsets) {
          this.spawnExhaustPuff(
            this.playerX + off.x,
            this.playerY + hoverBob + off.y,
            this.playerZ + off.z,
            this.nitroTimer > 0,
            v.isHover
          );
        }
      }

      // Continuous Tire Skid Dust during sharp lateral steering or sliding
      if (this.isGrounded && !v.isHover && (Math.abs(lateralVel) > 3.2 || isSliding)) {
        this.skidTimer += dt;
        if (this.skidTimer >= 0.048) {
          this.skidTimer = 0;
          const track = v.tireHalfTrack;
          this.spawnSkidDust(this.playerX - track, this.playerY + 0.08, this.playerZ + 0.9, 1);
          this.spawnSkidDust(this.playerX + track, this.playerY + 0.08, this.playerZ + 0.9, 1);
        }
      }
    }

    // Update obstacles, animated traffic, puddles, coins & powerups collisions
    const playerHalfW = (this.playerVehicle?.hitWidth || 1.6) * 0.42;
    const playerHalfL = (this.playerVehicle?.hitLength || 3.0) * 0.4;
    const playerTopY =
      this.playerY + (this.slideTimer > 0 && this.isGrounded ? 0.85 : this.playerVehicle?.hitHeight || 1.5);

    const magnetRadius =
      (this.magnetTimer > 0 ? 9.5 : 2.1) + spec.magnetBonus + this.upgrades.magnet * 0.7;

    for (const chunk of this.chunks) {
      // Animated oncoming & same-way mountain traffic
      for (const obs of chunk.obstacles) {
        if (obs.kind === 'moving_truck') {
          obs.z += obs.speed * dt;
          obs.mesh.position.z = obs.z - chunk.zStart;
          obs.mesh.position.y = Math.sin(this.elapsed * 9 + obs.id) * 0.025;
          if (obs.wheels) {
            const wSpin = obs.speed * dt * 1.35;
            for (const w of obs.wheels) {
              w.rotation.x += wSpin;
            }
          }
          // Play approaching traffic horn when oncoming vehicle nears player
          const zDiff = this.playerZ - obs.z; // positive when vehicle is ahead of player
          if (obs.speed > 0 && !obs.hornPlayed && zDiff > 10 && zDiff < 36) {
            obs.hornPlayed = true;
            soundEngine.playTrafficHorn(obs.trafficKind === 'truck');
          }
        }
        if (obs.kind === 'ramp_bridge') continue;

        // AABB check
        const dx = Math.abs(this.playerX - LANE_X[obs.lane]);
        const dz = Math.abs(this.playerZ - obs.z);
        if (dx < playerHalfW + obs.width * 0.42 && dz < playerHalfL + obs.length * 0.44) {
          // Vertical clearance check (Jump over low_barrier or Slide under high_gate)
          const overlapsY = playerTopY > obs.minY && this.playerY < obs.maxY;
          if (overlapsY) {
            if (this.nitroTimer > 0) {
              // Nitro smashes straight through!
              obs.mesh.visible = false;
              obs.z = 9999;
              this.shakeIntensity = 0.25;
              soundEngine.playCrash(true);
              this.spawnBurst(this.playerX, this.playerY + 1, this.playerZ - 1, 0x2dd4bf, 14);
            } else if (this.invulnTimer <= 0) {
              if (this.shields > 0) {
                this.shields -= 1;
                this.invulnTimer = 1.6;
                this.hitstopTimer = 0.055;
                this.shakeIntensity = 0.45;
                soundEngine.playCrash(true);
                this.spawnBurst(this.playerX, this.playerY + 1, this.playerZ, 0x38bdf8, 16);
              } else {
                this.hitstopTimer = 0.06;
                this.shakeIntensity = 0.7;
                soundEngine.playCrash(false);
                this.spawnBurst(this.playerX, this.playerY + 1, this.playerZ, 0xf97316, 20);
                this.finishLevel(false, obs.kind);
                return;
              }
            }
          }
        } else if (
          obs.z > this.playerZ + 0.9 &&
          obs.z < this.playerZ + 4.4 &&
          !this.nearMissedObstacles.has(obs.id)
        ) {
          this.nearMissedObstacles.add(obs.id);
          const lateralNear =
            dx < playerHalfW + obs.width * 0.42 + 1.35 &&
            playerTopY > obs.minY &&
            this.playerY < obs.maxY;
          const jumpClear =
            obs.kind === 'low_barrier' &&
            dx < playerHalfW + obs.width * 0.48 &&
            this.playerY >= obs.maxY - 0.05;
          const slideClear =
            obs.kind === 'high_gate' &&
            dx < playerHalfW + obs.width * 0.48 &&
            playerTopY <= obs.minY + 0.05 &&
            this.slideTimer > 0;

          if (lateralNear || jumpClear || slideClear) {
            this.nearMissesInRun += 1;
            this.nearMissBanner = jumpClear
              ? 'CLUTCH JUMP CLEAR!'
              : slideClear
                ? 'LOW SLIDE CLEAR!'
                : 'NEAR MISS!';
            this.nearMissBannerTimer = 1.45;
            soundEngine.playNearMiss();
          }
        }
      }

      // Road Puddle Water Splash Triggers
      if (this.playerY < 0.35 && this.playerVehicle && !this.playerVehicle.isHover) {
        for (const pud of chunk.puddles) {
          if (pud.splashed) continue;
          const dx = Math.abs(this.playerX - pud.x);
          const dz = Math.abs(this.playerZ - pud.z);
          if (dx < pud.radius && dz < pud.radius * 1.2) {
            pud.splashed = true;
            soundEngine.playSplash();
            this.spawnWaterSplash(
              this.playerX,
              this.playerY,
              this.playerZ,
              this.playerVehicle.tireHalfTrack
            );
          }
        }
      }

      // Coins
      for (const coin of chunk.coins) {
        if (coin.collected) continue;
        coin.mesh.rotation.y += 3.2 * dt;
        coin.mesh.position.y = coin.y + Math.sin(this.elapsed * 4 + coin.id) * 0.14;

        // Magnet pull
        const dx = this.playerX - coin.x;
        const dy = this.playerY + 0.85 - coin.y;
        const dz = this.playerZ - coin.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < magnetRadius) {
          const pull = this.magnetTimer > 0 ? 28 : 16;
          coin.x += (dx / Math.max(0.1, dist)) * pull * dt;
          coin.y += (dy / Math.max(0.1, dist)) * pull * dt;
          coin.z += (dz / Math.max(0.1, dist)) * pull * dt;
          coin.mesh.position.set(coin.x, coin.y, coin.z - chunk.zStart);
        }

        if (dist < 1.55) {
          coin.collected = true;
          coin.mesh.visible = false;
          const mult = this.doubleTimer > 0 ? 2 : 1;
          this.runCoins += coin.value * mult;
          this.coinBreakdown[coin.tier] += 1;
          this.coinStreak += 1;
          this.streakDecayTimer = 1.4;
          soundEngine.playCoin(this.coinStreak, coin.tier);
          this.spawnBurst(
            coin.x,
            coin.y,
            coin.z,
            coin.tier === 'biome' ? this.currentBiome.coinHex : 0xfacc15,
            5
          );
        }
      }

      // Powerups
      for (const pw of chunk.powerups) {
        if (pw.collected) continue;
        pw.mesh.rotation.y += 2.4 * dt;
        pw.mesh.position.y = pw.y + Math.sin(this.elapsed * 3.5 + pw.id) * 0.18;

        const dx = this.playerX - pw.x;
        const dy = this.playerY + 0.9 - pw.y;
        const dz = this.playerZ - pw.z;
        if (dx * dx + dy * dy + dz * dz < 2.6) {
          pw.collected = true;
          pw.mesh.visible = false;
          this.powerupsInRun += 1;
          soundEngine.playPowerup(pw.type);
          const durBonus = 1 + this.upgrades.nitro * 0.18;
          if (pw.type === 'magnet') this.magnetTimer = 8.5 * durBonus;
          else if (pw.type === 'double') this.doubleTimer = 10.0 * durBonus;
          else if (pw.type === 'nitro') this.nitroTimer = 4.2 * durBonus;
          else if (pw.type === 'shield') this.shields = Math.min(this.maxShields + 2, this.shields + 1);
          this.spawnBurst(pw.x, pw.y, pw.z, 0x38bdf8, 12);
        }
      }
    }

    // Update sun shadow camera & chase camera with smooth exponential damping
    this.sunLight.position.set(this.playerX + 20, 34, this.playerZ + 18);
    this.sunLight.target.position.set(this.playerX, 0, this.playerZ - 12);
    this.sunLight.target.updateMatrixWorld();

    const camTiltOffset = this.settings.cameraTilt ? lateralVel * -0.008 : 0;
    this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.2);
    const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
    const shakeY = (Math.random() - 0.5) * this.shakeIntensity;

    const desiredCamX = this.playerX * 0.68 + shakeX;
    const desiredCamY = this.playerY * 0.72 + 4.35 + (this.nitroTimer > 0 ? 0.3 : 0) + shakeY;
    const desiredCamZ = this.playerZ + (this.nitroTimer > 0 ? 8.2 : 7.4);

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredCamX, 10, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredCamY, 9, dt);
    this.camera.position.z = desiredCamZ;

    _vec3A.set(this.playerX * 0.45, this.playerY + 1.35, this.playerZ - 14);
    this.camera.lookAt(_vec3A);
    this.camera.rotation.z += camTiltOffset;

    const targetFov = this.nitroTimer > 0 ? 74 : 62;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();
    }

    soundEngine.updateEngine((this.forwardSpeed - 18) / 35, !this.isGrounded);
    this.updateParticles(dt);

    this.hudThrottle += dt;
    if (this.hudThrottle >= 0.06) {
      this.hudThrottle = 0;
      this.emitHud();
    }
  }

  private updateShowcase(dt: number): void {
    if (!this.isDraggingShowcase) {
      this.showcaseTargetAngle += dt * (this.mode === 'store' ? 0.28 : 0.14);
    }
    this.showcaseAngle = THREE.MathUtils.damp(this.showcaseAngle, this.showcaseTargetAngle, 8, dt);

    const radius = this.mode === 'store' ? 4.9 : 6.4;
    const camHeight = this.mode === 'store' ? 2.05 : 2.55;
    const offsetX = this.mode === 'menu' ? -1.4 : 0; // Give space for menu panel on left!

    const camX = Math.sin(this.showcaseAngle) * radius + offsetX;
    const camZ = Math.cos(this.showcaseAngle) * radius;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, camX, 6, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camHeight, 6, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, camZ, 6, dt);

    _vec3B.set(offsetX * 0.65, 0.95, 0);
    this.camera.lookAt(_vec3B);

    if (this.playerVehicle) {
      const hover = this.playerVehicle.isHover ? Math.sin(this.elapsed * 3) * 0.12 + 0.2 : 0;
      this.playerVehicle.group.position.set(0, hover, 0);
      this.playerVehicle.group.rotation.set(0, 0, 0);
      for (const t of this.playerVehicle.thrusters) {
        t.rotation.z += dt * 2.5;
      }

      this.exhaustTimer += dt;
      if (this.exhaustTimer >= 0.2) {
        this.exhaustTimer = 0;
        for (const off of this.playerVehicle.exhaustOffsets) {
          this.spawnExhaustPuff(off.x, hover + off.y, off.z, false, this.playerVehicle.isHover);
        }
      }
    }
  }

  private emitHud(): void {
    const cfg = this.currentLevelConfig;
    this.callbacks.onHudUpdate({
      level: cfg.level,
      levelName: cfg.name,
      biomeName: this.currentBiome.name,
      coinName: this.currentBiome.coinName,
      coinColor: this.currentBiome.coinColor,
      distance: Math.min(cfg.targetDistance, Math.floor(this.distanceMeters)),
      targetDistance: cfg.targetDistance,
      speedKmh: Math.round(this.forwardSpeed * 3.4),
      runCoins: this.runCoins,
      coinBreakdown: { ...this.coinBreakdown },
      streak: this.coinStreak,
      shields: this.shields,
      maxShields: this.maxShields,
      activePowerups: {
        magnet: this.magnetTimer,
        double: this.doubleTimer,
        nitro: this.nitroTimer,
      },
      progress: Math.min(1, this.distanceMeters / cfg.targetDistance),
      nearMisses: this.nearMissesInRun,
      nearMissBanner: this.nearMissBanner,
      highlightRecording: this.highlightRecorder.isActive(),
    });
  }

  private finishLevel(won: boolean, crashObstacle?: string): void {
    this.mode = 'ended';
    soundEngine.stopEngine();

    const cfg = this.currentLevelConfig;
    const spec = getVehicleSpec(this.currentVehicleId);
    let starsEarned = 0;
    if (won) {
      soundEngine.playLevelComplete();
      starsEarned = 1;
      if (this.runCoins >= cfg.starDistances[1]) starsEarned = 2;
      if (this.runCoins >= cfg.starDistances[2]) starsEarned = 3;
    }

    const reasonLabels: Record<string, string> = {
      low_barrier: 'Hit a Himalayan road barrier (Jump with W / Space!)',
      high_gate: 'Clipped a Prayer-Flag Monastery Gate (Slide with S / ↓!)',
      boulder_wall: 'Struck a mountain rockslide (Steer with A/D or ←/→!)',
      moving_truck: 'Collided with Leh-Manali highway traffic!',
    };

    const clampedDist = Math.min(cfg.targetDistance, Math.floor(this.distanceMeters));
    const runTimeRounded = Number(this.runTimeSec.toFixed(1));
    const score = computeRunScore({
      won,
      distance: clampedDist,
      rawCoinsCollected: this.runCoins,
      nearMisses: this.nearMissesInRun,
      jumpsPerformed: this.jumpsInRun,
      slidesPerformed: this.slidesInRun,
      starsEarned,
      runTimeSec: this.runTimeSec,
      peakSpeedKmh: this.peakSpeedKmh,
    });

    const result: RunResult = {
      level: cfg.level,
      won,
      distance: clampedDist,
      targetDistance: cfg.targetDistance,
      runTimeSec: runTimeRounded,
      score,
      vehicleId: this.currentVehicleId,
      vehicleName: spec.name,
      coinsEarned: this.runCoins,
      rawCoinsCollected: this.runCoins,
      coinBreakdown: { ...this.coinBreakdown },
      jumpsPerformed: this.jumpsInRun,
      slidesPerformed: this.slidesInRun,
      powerupsCollected: this.powerupsInRun,
      nearMisses: this.nearMissesInRun,
      peakSpeedKmh: this.peakSpeedKmh,
      bestJumpHeightM: Number(this.bestJumpHeightM.toFixed(1)),
      starsEarned,
      firstClearBonus: 0,
      isNewBestStars: false,
      crashReason: crashObstacle ? reasonLabels[crashObstacle] || 'Vehicle crashed!' : undefined,
    };

    // Finalize the last ~10s highlight snippet asynchronously
    void this.highlightRecorder
      .captureLast10Seconds(
        {
          level: cfg.level,
          levelName: cfg.name,
          biomeName: this.currentBiome.name,
          vehicleName: spec.name,
          won,
          peakSpeedKmh: this.peakSpeedKmh,
          jumpsCount: this.jumpsInRun,
          nearMisses: this.nearMissesInRun,
          savedToReel: false,
        },
        false
      )
      .then((clip) => {
        if (clip) {
          this.callbacks.onHighlightReady?.(clip, false);
        }
      });

    if (won) this.callbacks.onLevelComplete(result);
    else this.callbacks.onGameOver(result);
  }

  public dispose(): void {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.highlightRecorder.dispose();
    soundEngine.stopEngine();

    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('blur', this.onBlurBound);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDownBound);
    window.removeEventListener('pointermove', this.onPointerMoveBound);
    window.removeEventListener('pointerup', this.onPointerUpBound);

    this.worldBuilder.dispose();
    Object.values(this.tex).forEach((t) => t.dispose());
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
