import React from 'react';
import { Check, Coins, Gift, Medal, Trophy, X } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/achievements';
import { TOTAL_LEVEL_COUNT, VEHICLES } from '../data/gameData';
import { soundEngine } from '../engine/audio';
import { SaveData } from '../types/game';
import { BadgeEmblem } from './BadgeEmblem';

interface AchievementsModalProps {
  save: SaveData;
  onClaimAchievement: (id: string) => void;
  onEquipBadge: (id: string | null) => void;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  save,
  onClaimAchievement,
  onEquipBadge,
  onClose,
}) => {
  const unlockedCount = ACHIEVEMENTS.filter((a) => a.getProgress(save) >= a.target).length;
  const totalKm = (save.careerStats.totalDistanceMeters / 1000).toFixed(1);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/84 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-wide text-white">
                ACHIEVEMENTS & COSMETIC BADGES
              </h2>
              <p className="text-xs text-slate-400">
                {unlockedCount}/{ACHIEVEMENTS.length} Milestones Unlocked · Equip badges to display on your expedition banner
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Career Telemetry Summary Strip */}
        <div className="grid grid-cols-2 gap-2.5 border-b border-slate-800 bg-slate-950/60 px-6 py-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Total Distance
            </div>
            <div className="font-mono-num text-base font-bold text-teal-300">
              {totalKm} km
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Garage Fleet
            </div>
            <div className="font-mono-num text-base font-bold text-amber-300">
              {save.ownedVehicles.length} / {VEHICLES.length}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Highest Pass
            </div>
            <div className="font-mono-num text-base font-bold text-sky-300">
              Lv. {save.highestUnlockedLevel} / {TOTAL_LEVEL_COUNT}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Career Coins
            </div>
            <div className="font-mono-num text-base font-bold text-white">
              {save.careerStats.totalCoinsCollected.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="ladakh-scroll grid flex-1 grid-cols-1 gap-3 overflow-y-auto p-6 md:grid-cols-2">
          {ACHIEVEMENTS.map((ach) => {
            const raw = ach.getProgress(save);
            const current = Math.min(ach.target, raw);
            const pct = Math.min(100, Math.round((current / ach.target) * 100));
            const unlocked = raw >= ach.target;
            const claimed = save.claimedAchievements.includes(ach.id);
            const isEquipped = save.equippedBadgeId === ach.id;

            return (
              <div
                key={ach.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                  unlocked && !claimed
                    ? 'border-amber-400/75 bg-slate-800/95'
                    : unlocked
                      ? 'border-teal-500/40 bg-slate-800/70'
                      : 'border-slate-800 bg-slate-950/70'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <BadgeEmblem badge={ach} size="lg" locked={!unlocked} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <h3 className="font-display text-sm font-bold text-white">
                        {ach.title}
                      </h3>
                      <span className="flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 font-mono-num text-[11px] font-bold text-amber-300">
                        <Coins className="h-3 w-3" /> +{ach.rewardCoins.toLocaleString()}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-slate-300">{ach.description}</p>

                    <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-slate-900/90 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      <Medal className="h-3 w-3 text-amber-400" />
                      Cosmetic Badge: <strong className="text-white">{ach.badgeTitle}</strong>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Claim / Equip Controls */}
                <div className="mt-3.5 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                      <div
                        className={`h-full rounded-full ${
                          unlocked ? 'bg-teal-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between font-mono-num text-[11px] text-slate-400">
                      <span>
                        {current.toLocaleString()} / {ach.target.toLocaleString()} {ach.unit}
                      </span>
                      <span>{pct}%</span>
                    </div>
                  </div>

                  {unlocked && !claimed && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playLevelComplete();
                        onClaimAchievement(ach.id);
                      }}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 font-display text-xs font-bold tracking-wider text-slate-950 hover:from-amber-400 hover:to-orange-400"
                    >
                      <Gift className="h-3.5 w-3.5" /> CLAIM
                    </button>
                  )}

                  {unlocked && claimed && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onEquipBadge(isEquipped ? null : ach.id);
                      }}
                      className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 font-display text-[11px] font-bold tracking-wider transition ${
                        isEquipped
                          ? 'bg-teal-500/20 text-teal-300'
                          : 'border border-slate-600 bg-slate-800 text-slate-200 hover:border-amber-400 hover:text-amber-300'
                      }`}
                    >
                      {isEquipped ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> EQUIPPED
                        </>
                      ) : (
                        'EQUIP BADGE'
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
