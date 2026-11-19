import {
  BiomeConfig,
  BiomeId,
  LevelConfig,
  LevelHighScoreEntry,
  RunResult,
  SaveData,
  TimeOfDay,
  UpgradeLevels,
  VehicleId,
  VehicleSpec,
} from '../types/game';
import { generateDailyQuests, getTodayDateKey } from './quests';

export const SAVE_STORAGE_KEY = 'ladakh_rush_3d_save_v1';
export const TOTAL_LEVEL_COUNT = 150;
export const MAX_LEVEL_HIGH_SCORES = 5;

export const BIOMES: Record<BiomeId, BiomeConfig> = {
  pangong: {
    id: 'pangong',
    name: 'Pangong Tso Shores',
    subtitle: 'Turquoise Himalayan Salt Lake & Chorten Causeway',
    levelRange: [1, 20],
    coinName: 'Pangong Turquoise Coin',
    coinColor: '#2dd4bf',
    coinHex: 0x2dd4bf,
    coinValue: 10,
    skyTop: 0x164e87,
    skyHorizon: 0x9bd7f2,
    fogColor: 0x9ad4ee,
    fogDensity: 0.0048,
    sunColor: 0xfff3d6,
    sunIntensity: 2.3,
    hemiSky: 0x87cefa,
    hemiGround: 0x8a6d4b,
    rockPrimary: 0x9c7a54,
    rockSecondary: 0x6b5642,
    groundTint: 0xc2a378,
    waterColor: 0x0ea5a3,
    hasSnow: false,
    hasSand: true,
    roadStyle: 'asphalt',
  },
  nubra: {
    id: 'nubra',
    name: 'Nubra Silver Dunes',
    subtitle: 'Hunder Sand Dunes, Buckthorn Groves & Shyok River',
    levelRange: [21, 40],
    coinName: 'Nubra Saffron Mohur',
    coinColor: '#f59e0b',
    coinHex: 0xf59e0b,
    coinValue: 15,
    skyTop: 0x1e3a6e,
    skyHorizon: 0xf4c792,
    fogColor: 0xeac597,
    fogDensity: 0.0052,
    sunColor: 0xffe2b0,
    sunIntensity: 2.5,
    hemiSky: 0x9cc7e8,
    hemiGround: 0xb88b58,
    rockPrimary: 0xb8895a,
    rockSecondary: 0x7d5d3f,
    groundTint: 0xd9b382,
    waterColor: 0x3b8299,
    hasSnow: false,
    hasSand: true,
    roadStyle: 'golden_pass',
  },
  khardung: {
    id: 'khardung',
    name: 'Khardung La Glacier',
    subtitle: '18,380 ft Snow-Capped Mountain Highway & Deodar Pines',
    levelRange: [41, 60],
    coinName: 'Glacial Sapphire Coin',
    coinColor: '#38bdf8',
    coinHex: 0x38bdf8,
    coinValue: 20,
    skyTop: 0x0f2d59,
    skyHorizon: 0xcbe8f8,
    fogColor: 0xc5e1f2,
    fogDensity: 0.0058,
    sunColor: 0xf8fbff,
    sunIntensity: 2.4,
    hemiSky: 0xbfe4ff,
    hemiGround: 0x6c7a89,
    rockPrimary: 0x687382,
    rockSecondary: 0x454e59,
    groundTint: 0xdbeafe,
    waterColor: null,
    hasSnow: true,
    hasSand: false,
    roadStyle: 'snow_track',
  },
  zanskar: {
    id: 'zanskar',
    name: 'Zanskar Gompa Gorge',
    subtitle: 'Crimson Cliffside Monasteries & Emerald River Bridges',
    levelRange: [61, 80],
    coinName: 'Monastery Ruby Mudra',
    coinColor: '#fb7185',
    coinHex: 0xfb7185,
    coinValue: 25,
    skyTop: 0x2a2452,
    skyHorizon: 0xf0a882,
    fogColor: 0xd99e7e,
    fogDensity: 0.0054,
    sunColor: 0xffcfa3,
    sunIntensity: 2.35,
    hemiSky: 0xaab4db,
    hemiGround: 0x6e473b,
    rockPrimary: 0x7d4c3e,
    rockSecondary: 0x4a322d,
    groundTint: 0x8f5b4a,
    waterColor: 0x10b981,
    hasSnow: false,
    hasSand: false,
    roadStyle: 'canyon_stone',
  },
  magnetic: {
    id: 'magnetic',
    name: 'Magnetic Summit Citadel',
    subtitle: 'Alpenglow Starlit Peaks & Shanti Stupa Skyway',
    levelRange: [81, 100],
    coinName: 'Chakra Diamond Relic',
    coinColor: '#a78bfa',
    coinHex: 0xa78bfa,
    coinValue: 35,
    skyTop: 0x090d24,
    skyHorizon: 0x7c4d8a,
    fogColor: 0x5c3c72,
    fogDensity: 0.005,
    sunColor: 0xffb8d9,
    sunIntensity: 2.2,
    hemiSky: 0x8b7ec8,
    hemiGround: 0x3b2f4a,
    rockPrimary: 0x49445e,
    rockSecondary: 0x2b283b,
    groundTint: 0x524c6b,
    waterColor: 0x312e81,
    hasSnow: true,
    hasSand: false,
    roadStyle: 'canyon_stone',
  },
  tsomoriri: {
    id: 'tsomoriri',
    name: 'Tso Moriri Plateau',
    subtitle: '14,836 ft Cobalt Salt Lake, Korzok Monastery & Alpine Meadows',
    levelRange: [101, 125],
    coinName: 'Tso Moriri Amethyst',
    coinColor: '#e879f9',
    coinHex: 0xe879f9,
    coinValue: 45,
    skyTop: 0x172554,
    skyHorizon: 0xa5b4fc,
    fogColor: 0x93a8f4,
    fogDensity: 0.0049,
    sunColor: 0xffe4f3,
    sunIntensity: 2.35,
    hemiSky: 0xc7d2fe,
    hemiGround: 0x4c4a6b,
    rockPrimary: 0x646282,
    rockSecondary: 0x3f3e59,
    groundTint: 0x8489a8,
    waterColor: 0x2563eb,
    hasSnow: true,
    hasSand: false,
    roadStyle: 'asphalt',
  },
  umling: {
    id: 'umling',
    name: 'Umling La Aurora',
    subtitle: 'World Highest 19,024 ft Pass, Glacial Ridges & Emerald Aurora',
    levelRange: [126, 150],
    coinName: 'Umling Platinum Chakra',
    coinColor: '#34d399',
    coinHex: 0x34d399,
    coinValue: 60,
    skyTop: 0x042f2e,
    skyHorizon: 0x2dd4bf,
    fogColor: 0x115e59,
    fogDensity: 0.0046,
    sunColor: 0xd1fae5,
    sunIntensity: 2.3,
    hemiSky: 0x5eead4,
    hemiGround: 0x1e293b,
    rockPrimary: 0x475569,
    rockSecondary: 0x1e293b,
    groundTint: 0x94a3b8,
    waterColor: null,
    hasSnow: true,
    hasSand: false,
    roadStyle: 'snow_track',
  },
};

export const BIOME_ORDER: BiomeId[] = [
  'pangong',
  'nubra',
  'khardung',
  'zanskar',
  'magnetic',
  'tsomoriri',
  'umling',
];

export const VEHICLES: VehicleSpec[] = [
  {
    id: 'enfielder_350',
    name: 'Royal Enfield Bullet 350',
    category: 'Classic Thumper',
    tagline: 'Iconic Leh-Manali thumper with hand-painted pinstripes and heavy crank torque.',
    cost: 0,
    unlockLevel: 1,
    speedStat: 5,
    handlingStat: 8,
    jumpStat: 7,
    armorStat: 3,
    baseShields: 0,
    magnetBonus: 0,
    speedBonus: 0,
    defaultColor: '#7f1d1d',
    palette: ['#7f1d1d', '#0f172a', '#14532d', '#b45309', '#f8fafc'],
    accentColor: '#fbbf24',
  },
  {
    id: 're_bullet_classic',
    name: 'Royal Enfield Bullet Classic',
    category: 'Retro Cruiser Bike',
    tagline: 'Split tan spring saddle, spoked wheels, and chrome fenders built for mountain trails.',
    cost: 450,
    unlockLevel: 1,
    speedStat: 6,
    handlingStat: 9,
    jumpStat: 8,
    armorStat: 5,
    baseShields: 1,
    magnetBonus: 0.6,
    speedBonus: 0.05,
    defaultColor: '#15803d',
    palette: ['#15803d', '#1e293b', '#92400e', '#cbd5e1', '#b91c1c'],
    accentColor: '#d97706',
  },
  {
    id: 'ladakh_suv',
    name: 'Ladakh Expedition 4x4',
    category: 'Mountain SUV · 5MT',
    tagline: 'Roof-racked expedition SUV with stick-shift cabin, snorkel, and steel bull-bar.',
    cost: 350,
    unlockLevel: 1,
    speedStat: 6,
    handlingStat: 7,
    jumpStat: 6,
    armorStat: 6,
    baseShields: 1,
    magnetBonus: 0.5,
    speedBonus: 0.04,
    defaultColor: '#f1f5f9',
    palette: ['#f1f5f9', '#1e3a8a', '#374151', '#b45309', '#065f46'],
    accentColor: '#f59e0b',
  },
  {
    id: 'swift_rally_5mt',
    name: 'Swift Ladakh Rally (5MT)',
    category: 'Real Stick Rally Car',
    tagline: 'Compact manual 5-speed Indian tarmac rally hatch with flared arches & stick cockpit.',
    cost: 600,
    unlockLevel: 3,
    speedStat: 7,
    handlingStat: 9,
    jumpStat: 7,
    armorStat: 5,
    baseShields: 1,
    magnetBonus: 0.7,
    speedBonus: 0.06,
    defaultColor: '#dc2626',
    palette: ['#dc2626', '#facc15', '#2563eb', '#f8fafc', '#18181b'],
    accentColor: '#f8fafc',
  },
  {
    id: 'mountain_buggy',
    name: 'Nubra Dune Buggy',
    category: 'Sand & Trail',
    tagline: 'Tubular roll-cage desert jumper with oversized off-road suspension.',
    cost: 800,
    unlockLevel: 5,
    speedStat: 7,
    handlingStat: 9,
    jumpStat: 9,
    armorStat: 4,
    baseShields: 0,
    magnetBonus: 0.8,
    speedBonus: 0.07,
    defaultColor: '#ea580c',
    palette: ['#ea580c', '#eab308', '#0284c7', '#16a34a', '#dc2626'],
    accentColor: '#1e293b',
  },
  {
    id: 'thar_roadster_4x4',
    name: 'Thar Mountain Roadster (4x4)',
    category: 'Real Stick Off-Roader',
    tagline: 'Open-top Indian 4x4 manual crawler with slatted grille, rollbar & stick shifter.',
    cost: 1200,
    unlockLevel: 8,
    speedStat: 7,
    handlingStat: 8,
    jumpStat: 8,
    armorStat: 8,
    baseShields: 2,
    magnetBonus: 1.0,
    speedBonus: 0.08,
    defaultColor: '#1e293b',
    palette: ['#1e293b', '#991b1b', '#3f6212', '#d97706', '#e2e8f0'],
    accentColor: '#f59e0b',
  },
  {
    id: 'himalayan_truck',
    name: 'Saffron Express Truck',
    category: 'Decorated Carrier',
    tagline: 'Ornate Indian highway carrier with armored bumper and double shield.',
    cost: 1500,
    unlockLevel: 12,
    speedStat: 6,
    handlingStat: 5,
    jumpStat: 5,
    armorStat: 9,
    baseShields: 2,
    magnetBonus: 1.2,
    speedBonus: 0.08,
    defaultColor: '#d97706',
    palette: ['#d97706', '#be123c', '#0f766e', '#1d4ed8', '#6d28d9'],
    accentColor: '#fde047',
  },
  {
    id: 're_gt_650',
    name: 'Royal Enfield GT 650',
    category: '650 Twin Café Racer',
    tagline: 'Parallel-twin 650cc café racer with clip-on bars, twin chrome pipes & solo cowl.',
    cost: 1650,
    unlockLevel: 14,
    speedStat: 8,
    handlingStat: 10,
    jumpStat: 8,
    armorStat: 5,
    baseShields: 1,
    magnetBonus: 1.2,
    speedBonus: 0.11,
    defaultColor: '#b91c1c',
    palette: ['#b91c1c', '#e2e8f0', '#14532d', '#1e293b', '#ea580c'],
    accentColor: '#f8fafc',
  },
  {
    id: 'manali_drift_6mt',
    name: 'Manali Drift Sedan (6MT)',
    category: 'Real Stick Street Car',
    tagline: 'Classic 6-speed manual switchback saloon with intercooler & gold alloy rims.',
    cost: 1950,
    unlockLevel: 16,
    speedStat: 8,
    handlingStat: 9,
    jumpStat: 7,
    armorStat: 6,
    baseShields: 1,
    magnetBonus: 1.3,
    speedBonus: 0.1,
    defaultColor: '#1d4ed8',
    palette: ['#1d4ed8', '#f8fafc', '#be123c', '#0f766e', '#18181b'],
    accentColor: '#facc15',
  },
  {
    id: 'yak_snowmobile',
    name: 'Khardung Snow-Claw',
    category: 'Alpine Crawler',
    tagline: 'Twin-ski turbo snowmobile engineered for glacier ice and steep ramps.',
    cost: 2400,
    unlockLevel: 22,
    speedStat: 8,
    handlingStat: 8,
    jumpStat: 8,
    armorStat: 6,
    baseShields: 1,
    magnetBonus: 1.4,
    speedBonus: 0.11,
    defaultColor: '#0284c7',
    palette: ['#0284c7', '#e11d48', '#facc15', '#f8fafc', '#0f172a'],
    accentColor: '#38bdf8',
  },
  {
    id: 'pangong_glider',
    name: 'Pangong Solar Glider',
    category: 'Eco Hovercraft',
    tagline: 'Turquoise repulsor hover-skiff with photovoltaic wing panels.',
    cost: 3800,
    unlockLevel: 35,
    speedStat: 8,
    handlingStat: 9,
    jumpStat: 9,
    armorStat: 6,
    baseShields: 1,
    magnetBonus: 2.0,
    speedBonus: 0.14,
    defaultColor: '#0d9488',
    palette: ['#0d9488', '#2563eb', '#e2e8f0', '#7c3aed', '#f59e0b'],
    accentColor: '#5eead4',
    isHover: true,
  },
  {
    id: 'dragon_coupe',
    name: 'Zanskar Dragon GT',
    category: 'Rally Coupe',
    tagline: 'Wide-body Himalayan tarmac racer with carbon splitter and rear wing.',
    cost: 5500,
    unlockLevel: 48,
    speedStat: 9,
    handlingStat: 9,
    jumpStat: 7,
    armorStat: 5,
    baseShields: 1,
    magnetBonus: 1.8,
    speedBonus: 0.18,
    defaultColor: '#9f1239',
    palette: ['#9f1239', '#0f172a', '#d97706', '#0369a1', '#f8fafc'],
    accentColor: '#fbbf24',
  },
  {
    id: 'ninja_h2r',
    name: 'Kawasaki Ninja H2R',
    category: 'Supercharged Hyperbike',
    tagline: 'Carbon aero winglets, green trellis frame & supercharged 300+ HP track predator.',
    cost: 9500,
    unlockLevel: 50,
    speedStat: 10,
    handlingStat: 10,
    jumpStat: 9,
    armorStat: 7,
    baseShields: 2,
    magnetBonus: 2.5,
    speedBonus: 0.24,
    defaultColor: '#0f172a',
    palette: ['#0f172a', '#65a30d', '#065f46', '#475569', '#991b1b'],
    accentColor: '#84cc16',
  },
  {
    id: 'zanskar_gtr_6mt',
    name: 'Zanskar Turbo GT-R (6MT)',
    category: 'Real Stick Sports Car',
    tagline: 'Widebody manual twin-turbo coupe with swan-neck GT wing & stick-shift cockpit.',
    cost: 6800,
    unlockLevel: 54,
    speedStat: 9,
    handlingStat: 10,
    jumpStat: 8,
    armorStat: 6,
    baseShields: 2,
    magnetBonus: 2.1,
    speedBonus: 0.2,
    defaultColor: '#0284c7',
    palette: ['#0284c7', '#e11d48', '#f8fafc', '#18181b', '#eab308'],
    accentColor: '#e2e8f0',
  },
  {
    id: 'khardung_6x6',
    name: 'Siachen Titan 6x6',
    category: 'Heavy Rescue',
    tagline: 'Six-wheel armored Himalayan fortress with floodlight array.',
    cost: 8000,
    unlockLevel: 60,
    speedStat: 8,
    handlingStat: 6,
    jumpStat: 6,
    armorStat: 10,
    baseShields: 3,
    magnetBonus: 2.4,
    speedBonus: 0.19,
    defaultColor: '#334155',
    palette: ['#334155', '#4d7c0f', '#b45309', '#991b1b', '#e2e8f0'],
    accentColor: '#facc15',
  },
  {
    id: 'garuda_trike',
    name: 'Garuda Jet-Trike',
    category: 'Turbine Interceptor',
    tagline: 'Twin-intake reverse-trike with plasma thrusters and razor agility.',
    cost: 12000,
    unlockLevel: 74,
    speedStat: 10,
    handlingStat: 10,
    jumpStat: 9,
    armorStat: 7,
    baseShields: 2,
    magnetBonus: 2.8,
    speedBonus: 0.23,
    defaultColor: '#4f46e5',
    palette: ['#4f46e5', '#0f172a', '#dc2626', '#0891b2', '#f59e0b'],
    accentColor: '#38bdf8',
  },
  {
    id: 'khardung_v12_stick',
    name: 'Khardung V12 Hyper-Stick',
    category: 'Real Stick Supercar',
    tagline: 'Gated-manual mid-engine supercar with active aero louver & forged gold wheels.',
    cost: 15000,
    unlockLevel: 95,
    speedStat: 10,
    handlingStat: 10,
    jumpStat: 9,
    armorStat: 8,
    baseShields: 2,
    magnetBonus: 3.1,
    speedBonus: 0.25,
    defaultColor: '#e11d48',
    palette: ['#e11d48', '#0f172a', '#f59e0b', '#0d9488', '#f8fafc'],
    accentColor: '#fbbf24',
  },
  {
    id: 'surya_chariot',
    name: 'Surya Golden Chariot',
    category: 'Apex Mythic Pod',
    tagline: 'Radiant solar-gold anti-grav craft crowned with Himalayan lotus fins.',
    cost: 18000,
    unlockLevel: 85,
    speedStat: 10,
    handlingStat: 10,
    jumpStat: 10,
    armorStat: 10,
    baseShields: 3,
    magnetBonus: 3.6,
    speedBonus: 0.28,
    defaultColor: '#f59e0b',
    palette: ['#f59e0b', '#fef3c7', '#7c3aed', '#0d9488', '#be123c'],
    accentColor: '#fef08a',
    isHover: true,
  },
];

const PLACE_NAMES: Record<BiomeId, string[]> = {
  pangong: [
    'Leh Gate Approach',
    'Shey Palace Causeway',
    'Thiksey Ridge',
    'Karu Riverbend',
    'Chang La Foothills',
    'Durbuk Meadow',
    'Tangste Crossing',
    'Lukung Shore',
    'Pangong Mirror Bay',
    'Spangmik Causeway',
    'Man Village Curve',
    'Merak Cliffside',
    'Chushul Overlook',
    'Turquoise Flats',
    'Prayer Flag Strait',
    'Stupa Promenade',
    'Salt Lake Horizon',
    'Indus Confluence',
    'Hemis Valley Track',
    'Pangong Crown Pass',
  ],
  nubra: [
    'Shyok Bridge',
    'Khalsar Bend',
    'Diskit Approach',
    'Maitreya Overlook',
    'Hunder Silver Dunes',
    'Bactrian Trail',
    'Buckthorn Oasis',
    'Sumur Canyon',
    'Panamik Hot Springs',
    'Siachen Base Road',
    'Turtuk Gorge',
    'Tyakshi Terrace',
    'Sandstone Switchback',
    'Saffron Wind Valley',
    'Nubra Riverbed',
    'Golden Dune Crest',
    'Caravan Waypoint',
    'Agham Hairpin',
    'Wari La Spur',
    'Nubra Grand Finale',
  ],
  khardung: [
    'South Pullu Check',
    'Snowline Ascent',
    'Deodar Timberline',
    'Glacier Wall Run',
    'Icebridge Viaduct',
    'Khardung Hairpin',
    'North Pullu Descent',
    'Frozen Waterfall',
    'Avalanche Gallery',
    'Whiteout Ridge',
    '17,000 ft Milestone',
    'Saser Kangri View',
    'Frostbite Straight',
    'Yak Herd Crossing',
    '18,380 ft Summit Gate',
    'Sapphire Crevasse',
    'Blizzard Corridor',
    'High Altitude Express',
    'Glacial Trestle',
    'Khardung Crown',
  ],
  zanskar: [
    'Nimmu Sangam',
    'Chilling Gorge',
    'Zanskar Emerald Bend',
    'Lingshed Cliffway',
    'Phugtal Monastery Path',
    'Padum Valley Floor',
    'Karsha Gompa Climb',
    'Crimson Lantern Gate',
    'Stongdey Ridge',
    'Zangla Fort Road',
    'Suspension Skybridge',
    'Sani Stupa Loop',
    'Penzila Pass',
    'Drang Drung Glacier',
    'Rangdum Marsh',
    'Suru River Canyon',
    'Monastery Bell Arch',
    'Terracotta Narrows',
    'Ruby Chorten Run',
    'Zanskar Citadel',
  ],
  magnetic: [
    'Magnetic Hill Anomaly',
    'Gurudwara Pathar Sahib',
    'Basgo Ruins Run',
    'Alchi Fresco Bridge',
    'Lamayuru Moonland',
    'Fotu La 13,478 ft',
    'Namika La Skyway',
    'Mulbekh Maitreya',
    'Spituk Ridgeway',
    'Hall of Fame Mile',
    'Shanti Stupa Steps',
    'Leh Palace Ascent',
    'Starlight Tso Moriri',
    'Hanle Observatory Road',
    'Umling La 19,024 ft',
    'Aurora Canyon',
    'Dharma Wheel Viaduct',
    'Twilight Convoy',
    'Himalayan Tempest',
    'Apex of Ladakh',
  ],
  tsomoriri: [
    'Mahe Bridge Entry',
    'Puga Hot Springs',
    'Polokongka La',
    'Tso Kar Salt Flats',
    'Korzok Gate',
    'Tso Moriri Azure Shore',
    'Nomad Pasture Run',
    'Kiang Plains Dash',
    'Chumur Border Ridge',
    'Peldo Le Curve',
    'Gyagar Spur',
    'Mentok Kangri View',
    'Karzok Stupa Mile',
    'Cobalt Lake Causeway',
    'Rupshu Valley Straight',
    'Amethyst Cliffside',
    'Starlight Basin',
    'Changthang Hairpin',
    'High Plateau Express',
    'Lungser Kangri Gate',
    'Yaye Tso Pass',
    'Loma Bend',
    'Nyoma Airfield Road',
    'Hanle Dark Sky Mile',
    'Tso Moriri Crown',
  ],
  umling: [
    'Photi La 18,124 ft',
    'Chisumle Approach',
    'Demchok Ridgeway',
    'Koyul River Bend',
    'Nurbu La Climb',
    'Umling Base Camp',
    'Aurora Gate I',
    'Glacial Switchback',
    '19,024 ft Summit Sign',
    'Platinum Prayer Arch',
    'Siachen Ice Wall',
    'Zorawar Skybridge',
    'Karakoram Corridor',
    'Emerald Aurora Straight',
    'Frost Peak Gauntlet',
    'Sub-Zero Convoy',
    'Thin Air Turbo Run',
    'Tibetan Border Crest',
    'Solar Horizon Mile',
    'Gompa of the Clouds',
    'Snow Leopard Ridge',
    'Dharma Chakra Viaduct',
    'Eternal Summit Ascent',
    'Grand Himalayan Finale',
    'Legend of Ladakh 150',
  ],
};

const TIMES_OF_DAY: TimeOfDay[] = ['noon', 'dawn', 'noon', 'sunset', 'night'];

export const ALL_LEVELS: LevelConfig[] = Array.from({ length: TOTAL_LEVEL_COUNT }, (_, idx) => {
  const level = idx + 1;
  let biomeIndex = 0;
  let localIdx = 0;
  if (idx < 100) {
    biomeIndex = Math.floor(idx / 20);
    localIdx = idx % 20;
  } else if (idx < 125) {
    biomeIndex = 5;
    localIdx = idx - 100;
  } else {
    biomeIndex = 6;
    localIdx = idx - 125;
  }

  const biome = BIOME_ORDER[biomeIndex];
  const name = PLACE_NAMES[biome][localIdx];

  // Smooth progressive curve from Level 1 to Level 150
  const progress = idx / (TOTAL_LEVEL_COUNT - 1);
  const targetDistance = Math.round(420 + idx * 13 + Math.pow(progress, 1.3) * 550);
  const baseSpeed = Number((22 + progress * 26).toFixed(1));
  const maxSpeed = Number((baseSpeed + 8 + progress * 12).toFixed(1));
  const obstacleDensity = Number(Math.min(0.92, 0.42 + progress * 0.48).toFixed(2));
  const movingTrafficChance = Number(Math.min(0.48, 0.12 + progress * 0.36).toFixed(2));
  const rampChance = Number((0.16 + (localIdx % 3 === 0 ? 0.08 : 0)).toFixed(2));
  const coinMultiplier = 1 + biomeIndex * 0.55 + Math.floor(localIdx / 5) * 0.15;

  const expectedCoins = Math.round((targetDistance / 12) * (1 + biomeIndex * 0.4));
  const starDistances: [number, number, number] = [
    Math.round(expectedCoins * 0.45),
    Math.round(expectedCoins * 0.85),
    Math.round(expectedCoins * 1.35),
  ];

  let timeOfDay: TimeOfDay = TIMES_OF_DAY[(idx + biomeIndex) % 4];
  if ((biome === 'magnetic' || biome === 'umling') && localIdx >= 10) {
    timeOfDay = localIdx % 2 === 0 ? 'night' : 'sunset';
  }

  return {
    level,
    name,
    biome,
    timeOfDay,
    targetDistance,
    baseSpeed,
    maxSpeed,
    obstacleDensity,
    movingTrafficChance,
    rampChance,
    coinMultiplier: Number(coinMultiplier.toFixed(2)),
    starDistances,
  };
});

export function getLevelConfig(levelNum: number): LevelConfig {
  const clamped = Math.max(1, Math.min(TOTAL_LEVEL_COUNT, Math.floor(levelNum)));
  return ALL_LEVELS[clamped - 1];
}

export function getVehicleSpec(id: VehicleId): VehicleSpec {
  return VEHICLES.find((v) => v.id === id) || VEHICLES[0];
}

export function getUpgradeCost(currentRank: number): number {
  return (currentRank + 1) * 250 + currentRank * currentRank * 120;
}

export const DEFAULT_UPGRADES: UpgradeLevels = {
  speed: 0,
  handling: 0,
  magnet: 0,
  nitro: 0,
};

export function computeRunScore(params: {
  won: boolean;
  distance: number;
  rawCoinsCollected: number;
  nearMisses: number;
  jumpsPerformed: number;
  slidesPerformed: number;
  starsEarned: number;
  runTimeSec: number;
  peakSpeedKmh: number;
}): number {
  const distancePts = Math.round(params.distance * 2);
  const coinPts = params.rawCoinsCollected * 12;
  const nearMissPts = params.nearMisses * 180;
  const stuntPts = (params.jumpsPerformed + params.slidesPerformed) * 35;
  const starPts = params.won ? params.starsEarned * 500 : 0;
  const pacePts = params.won
    ? Math.round((params.distance / Math.max(1, params.runTimeSec)) * 28 + params.peakSpeedKmh * 3)
    : Math.round(params.peakSpeedKmh * 1.5);
  return Math.max(0, distancePts + coinPts + nearMissPts + stuntPts + starPts + pacePts);
}

export function recordLevelHighScore(
  currentMap: Record<number, LevelHighScoreEntry[]>,
  res: RunResult,
  entryId: string
): {
  nextMap: Record<number, LevelHighScoreEntry[]>;
  rank: number | null;
} {
  const existing = Array.isArray(currentMap[res.level]) ? [...currentMap[res.level]] : [];
  const entry: LevelHighScoreEntry = {
    id: entryId,
    score: res.score,
    stars: res.starsEarned,
    coins: res.rawCoinsCollected,
    nearMisses: res.nearMisses,
    timeSec: Number(res.runTimeSec.toFixed(1)),
    peakSpeedKmh: res.peakSpeedKmh,
    vehicleId: res.vehicleId,
    vehicleName: res.vehicleName,
    recordedAt: new Date().toISOString(),
  };

  const merged = [...existing, entry].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.stars !== a.stars) return b.stars - a.stars;
    if (a.timeSec !== b.timeSec) return a.timeSec - b.timeSec;
    return a.recordedAt.localeCompare(b.recordedAt);
  });

  const top5 = merged.slice(0, MAX_LEVEL_HIGH_SCORES);
  const idx = top5.findIndex((item) => item.id === entryId);

  return {
    nextMap: {
      ...currentMap,
      [res.level]: top5,
    },
    rank: idx >= 0 ? idx + 1 : null,
  };
}

export function createDefaultSaveData(): SaveData {
  return {
    highestUnlockedLevel: 1,
    currentLevel: 1,
    totalCoins: 200,
    levelStars: {},
    levelHighScores: {},
    ownedVehicles: ['enfielder_350'],
    equippedVehicle: 'enfielder_350',
    vehicleColors: {},
    upgrades: { ...DEFAULT_UPGRADES },
    settings: {
      muted: false,
      volume: 0.75,
      graphics: 'high',
      cameraTilt: true,
      showHints: true,
    },
    dailyQuests: generateDailyQuests(),
    careerStats: {
      totalDistanceMeters: 0,
      totalCoinsCollected: 0,
      totalLevelsCompleted: 0,
      totalJumpsAndSlides: 0,
      totalPowerupsCollected: 0,
    },
    claimedAchievements: [],
    equippedBadgeId: null,
    characterGender: 'male',
  };
}

function sanitizeLevelHighScores(
  raw: unknown
): Record<number, LevelHighScoreEntry[]> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Record<number, LevelHighScoreEntry[]> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const lvl = Number(key);
    if (!Number.isInteger(lvl) || lvl < 1 || lvl > TOTAL_LEVEL_COUNT) continue;
    if (!Array.isArray(val)) continue;
    const valid = val
      .filter(
        (item): item is LevelHighScoreEntry =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof (item as LevelHighScoreEntry).score === 'number' &&
          typeof (item as LevelHighScoreEntry).vehicleName === 'string'
      )
      .slice(0, MAX_LEVEL_HIGH_SCORES);
    if (valid.length > 0) {
      result[lvl] = valid;
    }
  }
  return result;
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return createDefaultSaveData();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const def = createDefaultSaveData();
    const today = getTodayDateKey();
    const hasTodayQuests =
      parsed.dailyQuests &&
      parsed.dailyQuests.dateKey === today &&
      Array.isArray(parsed.dailyQuests.quests) &&
      parsed.dailyQuests.quests.length > 0;
    return {
      ...def,
      ...parsed,
      upgrades: { ...def.upgrades, ...(parsed.upgrades || {}) },
      settings: { ...def.settings, ...(parsed.settings || {}) },
      careerStats: { ...def.careerStats, ...(parsed.careerStats || {}) },
      ownedVehicles:
        Array.isArray(parsed.ownedVehicles) && parsed.ownedVehicles.length > 0
          ? parsed.ownedVehicles
          : def.ownedVehicles,
      levelStars: parsed.levelStars || {},
      levelHighScores: sanitizeLevelHighScores(parsed.levelHighScores),
      vehicleColors: parsed.vehicleColors || {},
      claimedAchievements: Array.isArray(parsed.claimedAchievements)
        ? parsed.claimedAchievements
        : [],
      equippedBadgeId: parsed.equippedBadgeId ?? null,
      characterGender: parsed.characterGender === 'female' ? 'female' : 'male',
      dailyQuests: hasTodayQuests ? parsed.dailyQuests! : generateDailyQuests(today),
    };
  } catch {
    return createDefaultSaveData();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}
