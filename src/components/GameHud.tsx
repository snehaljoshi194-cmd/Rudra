import React from 'react';
import { Flame, Magnet, Pause, Shield, Sparkles, Video, Volume2, VolumeX, Zap } from 'lucide-react';
import { getAchievementById } from '../data/achievements';
import { TOTAL_LEVEL_COUNT } from '../data/gameData';
import { soundEngine } from '../engine/audio';
import { HudSnapshot } from '../types/game';
import { BadgeEmblem } from './BadgeEmblem';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  showHints: boolean;
  equippedBadgeId?: string | null;
  onPause: () => void;
  onToggleMute: () => void;
  onCaptureHighlight: () => void;
  onSteer: (dir: -1 | 1) => void;
  onJump: () => void;
  onSlide: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  showHints,
  equippedBadgeId = null,
  onPause,
  onToggleMute,
  onCaptureHighlight,
  onSteer,
  onJump,
  onSlide,
}) => {
  const equippedBadge = getAchievementById(equippedBadgeId);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-5">
      {/* Top Perimeter Clusters */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left: Level & Distance Progress */}
        <div className="w-60 rounded-xl border border-slate-700/80 bg-slate-950/82 px-3.5 py-2.5 shadow-lg sm:w-72">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-xs font-bold tracking-wider text-amber-400">
              LV {hud.level}/{TOTAL_LEVEL_COUNT} · {hud.biomeName}
            </span>
            <span className="font-mono-num text-[11px] font-bold text-slate-300">
              {hud.speedKmh} KM/H
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {equippedBadge && <BadgeEmblem badge={equippedBadge} size="sm" />}
            <span className="truncate text-xs font-semibold text-white">{hud.levelName}</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-amber-400 transition-[width] duration-100"
              style={{ width: `${Math.round(hud.progress * 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono-num text-[11px] text-slate-300">
            <span>{hud.distance} m</span>
            <span>{hud.targetDistance} m</span>
          </div>
        </div>

        {/* Top-Center Near-Miss / Highlight Banner */}
        {hud.nearMissBanner && (
          <div className="hidden items-center gap-1.5 rounded-xl border border-amber-400/70 bg-slate-950/90 px-4 py-1.5 font-display text-xs font-bold tracking-wider text-amber-300 shadow-lg sm:flex">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            {hud.nearMissBanner}
          </div>
        )}

        {/* Top-Right: Run Coins + Clip 10s + Pause & Mute */}
        <div className="flex items-center gap-2">
          {hud.nearMisses > 0 && (
            <div className="hidden items-center gap-1 rounded-xl border border-sky-400/40 bg-slate-950/85 px-2.5 py-2 font-mono-num text-xs font-bold text-sky-300 shadow-lg md:flex">
              <Zap className="h-3.5 w-3.5" />
              {hud.nearMisses}
            </div>
          )}

          <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/40 bg-slate-950/85 px-3.5 py-2 shadow-lg">
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border border-white/70"
              style={{ backgroundColor: hud.coinColor }}
            />
            <span className="font-mono-num text-lg font-bold text-amber-300">
              {hud.runCoins.toLocaleString()}
            </span>
            {hud.streak >= 3 && (
              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-amber-200">
                x{Math.min(9, Math.floor(hud.streak / 3) + 1)}
              </span>
            )}
          </div>

          {hud.highlightRecording && (
            <button
              type="button"
              onClick={onCaptureHighlight}
              className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/85 px-3 font-display text-[11px] font-bold tracking-wider text-amber-300 shadow-lg hover:border-amber-400/60"
              title="Save Last 10 Seconds Highlight (R)"
            >
              <Video className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CLIP 10s</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onToggleMute();
            }}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/85 text-slate-200 shadow-lg hover:border-amber-400/60 hover:text-amber-300"
            title="Mute / Unmute"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onPause();
            }}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/85 text-slate-200 shadow-lg hover:border-amber-400/60 hover:text-amber-300"
            title="Pause (Esc)"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom Perimeter: Active Shields / Powerups & Compact Touch Controls */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {hud.shields > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-slate-950/85 px-3 py-1.5 text-xs font-bold text-sky-300">
              <Shield className="h-3.5 w-3.5" />
              <span className="font-mono-num">SHIELD x{hud.shields}</span>
            </div>
          )}
          {hud.activePowerups.nitro > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-teal-400/50 bg-slate-950/85 px-3 py-1.5 text-xs font-bold text-teal-300">
              <Flame className="h-3.5 w-3.5" />
              <span className="font-mono-num">NITRO {hud.activePowerups.nitro.toFixed(1)}s</span>
            </div>
          )}
          {hud.activePowerups.magnet > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-rose-400/50 bg-slate-950/85 px-3 py-1.5 text-xs font-bold text-rose-300">
              <Magnet className="h-3.5 w-3.5" />
              <span className="font-mono-num">MAGNET {hud.activePowerups.magnet.toFixed(1)}s</span>
            </div>
          )}
          {hud.activePowerups.double > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-slate-950/85 px-3 py-1.5 text-xs font-bold text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-mono-num">2X COINS {hud.activePowerups.double.toFixed(1)}s</span>
            </div>
          )}
        </div>

        {/* Compact Control Hint / On-Screen Mobile Pad */}
        <div className="flex flex-col items-end gap-2">
          {showHints && (
            <div className="hidden rounded-lg bg-slate-950/70 px-3 py-1 text-[11px] font-medium text-slate-300 sm:block">
              ←/→ Steer · Space/↑ Jump · ↓ Slide · R Save 10s Highlight · Esc Pause
            </div>
          )}
          {/* Touch-friendly quick buttons on mobile viewports */}
          <div className="pointer-events-auto flex items-center gap-1.5 sm:hidden">
            <button
              type="button"
              onClick={() => onSteer(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/85 font-display text-sm font-bold text-white active:bg-amber-500 active:text-slate-950"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={onJump}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/85 font-display text-sm font-bold text-amber-300 active:bg-amber-500 active:text-slate-950"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={onSlide}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/85 font-display text-sm font-bold text-teal-300 active:bg-teal-500 active:text-slate-950"
            >
              ▼
            </button>
            <button
              type="button"
              onClick={() => onSteer(1)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/85 font-display text-sm font-bold text-white active:bg-amber-500 active:text-slate-950"
            >
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
