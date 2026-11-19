export type GameScreen =
  | 'menu'
  | 'levels'
  | 'store'
  | 'options'
  | 'quests'
  | 'achievements'
  | 'highlights'
  | 'playing'
  | 'paused'
  | 'levelComplete'
  | 'gameOver'
  | 'victory';

export type CharacterGender = 'male' | 'female';

export type DailyQuestType =
  | 'coins_single_run'
  | 'complete_levels'
  | 'collect_biome_relics'
  | 'total_distance'
  | 'use_powerups'
  | 'jumps_and_slides'
  | 'earn_three_stars';

export interface DailyQuest {
  id: string;
  type: DailyQuestType;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardCoins: number;
  claimed: boolean;
}

export interface DailyQuestState {
  dateKey: string;
  quests: DailyQuest[];
}

export type BiomeId =
  | 'pangong'
  | 'nubra'
  | 'khardung'
  | 'zanskar'
  | 'magnetic'
  | 'tsomoriri'
  | 'umling';

export type TimeOfDay = 'dawn' | 'noon' | 'sunset' | 'night';

export type VehicleId =
  | 'enfielder_350'
  | 're_bullet_classic'
  | 'ladakh_suv'
  | 'swift_rally_5mt'
  | 'mountain_buggy'
  | 'thar_roadster_4x4'
  | 'himalayan_truck'
  | 're_gt_650'
  | 'manali_drift_6mt'
  | 'yak_snowmobile'
  | 'pangong_glider'
  | 'dragon_coupe'
  | 'ninja_h2r'
  | 'zanskar_gtr_6mt'
  | 'khardung_6x6'
  | 'garuda_trike'
  | 'khardung_v12_stick'
  | 'surya_chariot';

export type BadgeIconId =
  | 'compass'
  | 'mountain'
  | 'wheel'
  | 'crown'
  | 'coins'
  | 'star'
  | 'bolt'
  | 'shield'
  | 'flame'
  | 'gem'
  | 'shifter'
  | 'trophy';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  target: number;
  unit: string;
  rewardCoins: number;
  badgeTitle: string;
  badgeColor: string;
  badgeBorder: string;
  badgeIcon: BadgeIconId;
  getProgress: (save: SaveData) => number;
}

export interface CareerStats {
  totalDistanceMeters: number;
  totalCoinsCollected: number;
  totalLevelsCompleted: number;
  totalJumpsAndSlides: number;
  totalPowerupsCollected: number;
}

export type CoinTier = 'copper' | 'silver' | 'gold' | 'biome';

export type PowerupType = 'magnet' | 'shield' | 'double' | 'nitro';

export interface BiomeConfig {
  id: BiomeId;
  name: string;
  subtitle: string;
  levelRange: [number, number];
  coinName: string;
  coinColor: string;
  coinHex: number;
  coinValue: number;
  skyTop: number;
  skyHorizon: number;
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  hemiSky: number;
  hemiGround: number;
  rockPrimary: number;
  rockSecondary: number;
  groundTint: number;
  waterColor: number | null;
  hasSnow: boolean;
  hasSand: boolean;
  roadStyle: 'asphalt' | 'snow_track' | 'canyon_stone' | 'golden_pass';
}

export interface VehicleSpec {
  id: VehicleId;
  name: string;
  category: string;
  tagline: string;
  cost: number;
  unlockLevel: number;
  speedStat: number; // 1-10
  handlingStat: number; // 1-10
  jumpStat: number; // 1-10
  armorStat: number; // 1-10 (grants shield charges on start if >= 6)
  baseShields: number;
  magnetBonus: number;
  speedBonus: number;
  defaultColor: string;
  palette: string[];
  accentColor: string;
  isHover?: boolean;
}

export interface LevelConfig {
  level: number;
  name: string;
  biome: BiomeId;
  timeOfDay: TimeOfDay;
  targetDistance: number; // meters
  baseSpeed: number; // units/sec
  maxSpeed: number; // units/sec
  obstacleDensity: number; // 0.35 - 0.92
  movingTrafficChance: number; // 0.05 - 0.45
  rampChance: number;
  coinMultiplier: number;
  starDistances: [number, number, number]; // coin thresholds for 1, 2, 3 stars
}

export interface UpgradeLevels {
  speed: number; // 0-5
  handling: number; // 0-5
  magnet: number; // 0-5
  nitro: number; // 0-5
}

export interface GameSettings {
  muted: boolean;
  volume: number; // 0-1
  graphics: 'high' | 'balanced';
  cameraTilt: boolean;
  showHints: boolean;
}

export interface LevelHighScoreEntry {
  id: string;
  score: number;
  stars: number;
  coins: number;
  nearMisses: number;
  timeSec: number;
  peakSpeedKmh: number;
  vehicleId: VehicleId;
  vehicleName: string;
  recordedAt: string;
}

export interface SaveData {
  highestUnlockedLevel: number;
  currentLevel: number;
  totalCoins: number;
  levelStars: Record<number, number>;
  levelHighScores: Record<number, LevelHighScoreEntry[]>;
  ownedVehicles: VehicleId[];
  equippedVehicle: VehicleId;
  vehicleColors: Partial<Record<VehicleId, string>>;
  upgrades: UpgradeLevels;
  settings: GameSettings;
  dailyQuests: DailyQuestState;
  careerStats: CareerStats;
  claimedAchievements: string[];
  equippedBadgeId: string | null;
  characterGender: CharacterGender;
}

export interface HudSnapshot {
  level: number;
  levelName: string;
  biomeName: string;
  coinName: string;
  coinColor: string;
  distance: number;
  targetDistance: number;
  speedKmh: number;
  runCoins: number;
  coinBreakdown: Record<CoinTier, number>;
  streak: number;
  shields: number;
  maxShields: number;
  activePowerups: {
    magnet: number; // seconds left
    double: number;
    nitro: number;
  };
  progress: number; // 0..1
  nearMisses: number;
  nearMissBanner: string | null;
  highlightRecording: boolean;
}

export interface HighlightClip {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number;
  level: number;
  levelName: string;
  biomeName: string;
  vehicleName: string;
  won: boolean;
  peakSpeedKmh: number;
  jumpsCount: number;
  nearMisses: number;
  capturedAt: string;
  savedToReel: boolean;
}

export interface RunResult {
  level: number;
  won: boolean;
  distance: number;
  targetDistance: number;
  runTimeSec: number;
  score: number;
  vehicleId: VehicleId;
  vehicleName: string;
  coinsEarned: number;
  rawCoinsCollected: number;
  coinBreakdown: Record<CoinTier, number>;
  jumpsPerformed: number;
  slidesPerformed: number;
  powerupsCollected: number;
  nearMisses: number;
  peakSpeedKmh: number;
  bestJumpHeightM: number;
  starsEarned: number;
  firstClearBonus: number;
  isNewBestStars: boolean;
  highScoreId?: string;
  highScoreRank?: number | null;
  isNewLevelRecord?: boolean;
  newlyCompletedQuests?: DailyQuest[];
  crashReason?: string;
}
