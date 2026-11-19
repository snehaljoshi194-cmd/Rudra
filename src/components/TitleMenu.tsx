import React, { useState } from 'react';
import {
  Award,
  Compass,
  Film,
  Map as MapIcon,
  Play,
  RotateCcw,
  Settings,
  ShoppingBag,
  Trophy,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  getAchievementById,
  getClaimableAchievementCount,
} from '../data/achievements';
import { BIOMES, getLevelConfig, getVehicleSpec, TOTAL_LEVEL_COUNT, VEHICLES } from '../data/gameData';
import { soundEngine } from '../engine/audio';
import { CharacterGender, SaveData } from '../types/game';
import { BadgeEmblem } from './BadgeEmblem';

interface TitleMenuProps {
  save: SaveData;
  highlightCount: number;
  onContinue: () => void;
  onNewGame: () => void;
  onOpenLevels: () => void;
  onOpenStore: () => void;
  onOpenQuests: () => void;
  onOpenAchievements: () => void;
  onOpenHighlights: () => void;
  onOpenOptions: () => void;
  onToggleMute: () => void;
  onSetGender: (gender: CharacterGender) => void;
}

export const TitleMenu: React.FC<TitleMenuProps> = ({
  save,
  highlightCount,
  onContinue,
  onNewGame,
  onOpenLevels,
  onOpenStore,
  onOpenQuests,
  onOpenAchievements,
  onOpenHighlights,
  onOpenOptions,
  onToggleMute,
  onSetGender,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const activeLevel = getLevelConfig(save.currentLevel);
  const activeBiome = BIOMES[activeLevel.biome];
  const equipped = getVehicleSpec(save.equippedVehicle);
  const hasProgress =
    save.highestUnlockedLevel > 1 || save.ownedVehicles.length > 1 || save.totalCoins !== 200;
  const readyQuests = save.dailyQuests.quests.filter(
    (q) => q.progress >= q.target && !q.claimed
  ).length;
  const completedQuests = save.dailyQuests.quests.filter((q) => q.progress >= q.target).length;
  const readyAchievements = getClaimableAchievementCount(save);
  const unlockedAchievements = ACHIEVEMENTS.filter(
    (a) => a.getProgress(save) >= a.target
  ).length;
  const equippedBadge = getAchievementById(save.equippedBadgeId);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-5 sm:p-8">
      {/* Top Bar: Bespoke SVG Lockup + Bank & Audio */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto flex flex-col gap-1.5">
          <svg
            viewBox="0 0 380 84"
            className="h-14 w-auto drop-shadow-[0_4px_14px_rgba(0,0,0,0.65)] sm:h-18"
            aria-label="Ladakh Rush 3D"
          >
            {/* Himalayan Snow Peaks Emblem */}
            <path
              d="M8 62 L32 20 L48 44 L64 14 L92 62 Z"
              fill="#f8fafc"
              fillOpacity="0.95"
            />
            <path d="M32 20 L40 34 L25 34 Z" fill="#38bdf8" />
            <path d="M64 14 L75 33 L55 33 Z" fill="#f59e0b" />
            <rect x="6" y="64" width="88" height="4" rx="2" fill="#f59e0b" />
            {/* Prayer Flag Accents */}
            <rect x="108" y="10" width="24" height="5" rx="1" fill="#2563eb" />
            <rect x="135" y="10" width="24" height="5" rx="1" fill="#f8fafc" />
            <rect x="162" y="10" width="24" height="5" rx="1" fill="#dc2626" />
            <rect x="189" y="10" width="24" height="5" rx="1" fill="#16a34a" />
            <rect x="216" y="10" width="24" height="5" rx="1" fill="#eab308" />

            <text
              x="108"
              y="49"
              fill="#f8fafc"
              fontFamily="Chakra Petch, sans-serif"
              fontWeight="700"
              fontSize="36"
              letterSpacing="2"
            >
              LADAKH RUSH
            </text>
            <text
              x="110"
              y="68"
              fill="#fbbf24"
              fontFamily="Inter, sans-serif"
              fontWeight="600"
              fontSize="12"
              letterSpacing="3.5"
            >
              {TOTAL_LEVEL_COUNT} HIMALAYAN LEVELS · STICK &amp; TURBO FLEET
            </text>
          </svg>
        </div>

        {/* Coin Wallet & Mute */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {equippedBadge && (
            <div className="hidden items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-950/85 px-2.5 py-1.5 shadow-lg sm:flex">
              <BadgeEmblem badge={equippedBadge} size="sm" />
              <span className="font-display text-xs font-bold tracking-wider text-amber-200">
                {equippedBadge.badgeTitle}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg border border-amber-400/35 bg-slate-950/85 px-3.5 py-2 shadow-lg">
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border border-amber-200"
              style={{ backgroundColor: activeBiome.coinColor }}
            />
            <span className="font-mono-num text-sm font-bold text-amber-300">
              {save.totalCoins.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Coins
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onToggleMute();
              soundEngine.playUiClick();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/85 text-slate-200 transition hover:border-amber-400/60 hover:text-amber-300"
            title={save.settings.muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {save.settings.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Left Command Dock — Keeps Right/Center 3D Ladakh Vehicle Showcase Clear */}
      <div className="pointer-events-auto my-auto flex w-full max-w-[336px] flex-col gap-2.5 rounded-2xl border border-slate-700/70 bg-slate-950/82 p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            {equippedBadge && <BadgeEmblem badge={equippedBadge} size="sm" />}
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                Active Rig
              </div>
              <div className="truncate font-display text-base font-bold text-white">
                {equipped.name}
              </div>
            </div>
          </div>
          <span className="shrink-0 rounded-md bg-slate-800 px-2.5 py-1 font-mono-num text-xs font-semibold text-teal-300">
            LV {save.currentLevel}/{TOTAL_LEVEL_COUNT}
          </span>
        </div>

        {/* Rider / Driver Character Selector (Male / Female) */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            <User className="h-3.5 w-3.5 text-amber-400" />
            Rider
          </span>
          <div className="flex overflow-hidden rounded-lg border border-slate-700">
            {(['male', 'female'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onSetGender(g);
                }}
                className={`px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wider transition ${
                  save.characterGender === g
                    ? g === 'female'
                      ? 'bg-rose-500 text-white'
                      : 'bg-sky-500 text-slate-950'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Continue / Play Button */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onContinue();
          }}
          className="group flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-left text-slate-950 shadow-lg transition hover:from-amber-400 hover:to-orange-400 active:scale-[0.99]"
        >
          <div>
            <div className="font-display text-lg font-bold tracking-wide">
              {hasProgress ? 'CONTINUE' : 'PLAY'}
            </div>
            <div className="text-xs font-semibold text-slate-900/80">
              Lv.{activeLevel.level}: {activeLevel.name}
            </div>
          </div>
          <Play className="h-6 w-6 fill-slate-950 transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* 150 Levels Map */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onOpenLevels();
          }}
          className="flex w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-900/90 px-4 py-2 text-slate-100 transition hover:border-teal-400/60 hover:bg-slate-800"
        >
          <span className="flex items-center gap-2.5 font-display text-sm font-semibold tracking-wide">
            <MapIcon className="h-4 w-4 text-teal-400" />
            {TOTAL_LEVEL_COUNT} LEVELS ATLAS
          </span>
          <span className="font-mono-num text-xs text-slate-400">
            {save.highestUnlockedLevel}/{TOTAL_LEVEL_COUNT}
          </span>
        </button>

        {/* Vehicle Store */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onOpenStore();
          }}
          className="flex w-full items-center justify-between rounded-xl border border-slate-700/80 bg-slate-900/90 px-4 py-2 text-slate-100 transition hover:border-amber-400/60 hover:bg-slate-800"
        >
          <span className="flex items-center gap-2.5 font-display text-sm font-semibold tracking-wide">
            <ShoppingBag className="h-4 w-4 text-amber-400" />
            VEHICLE STORE
          </span>
          <span className="font-mono-num text-xs text-amber-300">
            {save.ownedVehicles.length}/{VEHICLES.length}
          </span>
        </button>

        {/* Daily Quests */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onOpenQuests();
          }}
          className={`flex w-full items-center justify-between rounded-xl border px-4 py-2 text-slate-100 transition ${
            readyQuests > 0
              ? 'border-amber-400/80 bg-amber-500/15 hover:bg-amber-500/25'
              : 'border-slate-700/80 bg-slate-900/90 hover:border-teal-400/60 hover:bg-slate-800'
          }`}
        >
          <span className="flex items-center gap-2.5 font-display text-sm font-semibold tracking-wide">
            <Award className="h-4 w-4 text-amber-400" />
            DAILY QUESTS
          </span>
          {readyQuests > 0 ? (
            <span className="rounded bg-amber-500 px-2 py-0.5 font-mono-num text-[10px] font-bold text-slate-950">
              {readyQuests} READY
            </span>
          ) : (
            <span className="font-mono-num text-xs text-slate-400">
              {completedQuests}/3
            </span>
          )}
        </button>

        {/* Achievements & Highlight Reel Row */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenAchievements();
            }}
            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-slate-100 transition ${
              readyAchievements > 0
                ? 'border-teal-400/80 bg-teal-500/15 hover:bg-teal-500/25'
                : 'border-slate-700/80 bg-slate-900/90 hover:border-amber-400/60 hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5 font-display text-xs font-semibold tracking-wide">
              <Trophy className="h-3.5 w-3.5 text-teal-400" />
              BADGES
            </span>
            {readyAchievements > 0 ? (
              <span className="rounded bg-teal-400 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-slate-950">
                {readyAchievements}
              </span>
            ) : (
              <span className="font-mono-num text-[11px] text-slate-400">
                {unlockedAchievements}/{ACHIEVEMENTS.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenHighlights();
            }}
            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-slate-100 transition ${
              highlightCount > 0
                ? 'border-sky-400/70 bg-sky-500/15 hover:bg-sky-500/25'
                : 'border-slate-700/80 bg-slate-900/90 hover:border-sky-400/60 hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5 font-display text-xs font-semibold tracking-wide">
              <Film className="h-3.5 w-3.5 text-sky-400" />
              CLIPS
            </span>
            <span className="font-mono-num text-[11px] text-sky-300">
              {highlightCount}
            </span>
          </button>
        </div>

        {/* New Game + Options Row */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              if (hasProgress) setConfirmReset(true);
              else onNewGame();
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 font-display text-xs font-semibold tracking-wider text-slate-200 transition hover:border-rose-400/60 hover:text-rose-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            NEW GAME
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenOptions();
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/90 px-3 py-2 font-display text-xs font-semibold tracking-wider text-slate-200 transition hover:border-sky-400/60 hover:text-sky-200"
          >
            <Settings className="h-3.5 w-3.5" />
            OPTIONS
          </button>
        </div>

        {/* Biome Status */}
        <div className="flex items-center gap-2 rounded-lg bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
          <Compass className="h-4 w-4 shrink-0 text-teal-400" />
          <span className="truncate">
            <strong className="text-white">{activeBiome.name}</strong> · {activeBiome.coinName}
          </span>
        </div>

        {confirmReset && (
          <div className="rounded-xl border border-rose-500/50 bg-rose-950/90 p-3 text-xs">
            <p className="font-semibold text-rose-100">
              Start a fresh campaign from Level 1? Your saved vehicles and coins will reset.
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setConfirmReset(false);
                  onNewGame();
                }}
                className="flex-1 rounded-lg bg-rose-600 py-1.5 font-bold text-white hover:bg-rose-500"
              >
                Reset & Play
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setConfirmReset(false);
                }}
                className="flex-1 rounded-lg bg-slate-800 py-1.5 font-semibold text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Single Flat Control Hint Line */}
      <div className="flex items-center justify-between text-xs text-slate-200/90">
        <div className="rounded-lg bg-slate-950/75 px-3.5 py-1.5 font-medium tracking-wide">
          A / D or ← / → Steer · W / Space Jump · S / ↓ Slide · Drag Vehicle to Inspect · Enter Start
        </div>
      </div>
    </div>
  );
};
