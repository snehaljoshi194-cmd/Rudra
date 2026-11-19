import React from 'react';
import { Award, CheckCircle2, Clock, Coins, Gift, X } from 'lucide-react';
import { getTimeUntilMidnightLabel } from '../data/quests';
import { soundEngine } from '../engine/audio';
import { DailyQuestState } from '../types/game';

interface DailyQuestsModalProps {
  questState: DailyQuestState;
  totalCoins: number;
  onClaimQuest: (questId: string) => void;
  onClaimAll: () => void;
  onClose: () => void;
}

export const DailyQuestsModal: React.FC<DailyQuestsModalProps> = ({
  questState,
  totalCoins,
  onClaimQuest,
  onClaimAll,
  onClose,
}) => {
  const claimableCount = questState.quests.filter(
    (q) => q.progress >= q.target && !q.claimed
  ).length;
  const totalClaimableCoins = questState.quests
    .filter((q) => q.progress >= q.target && !q.claimed)
    .reduce((sum, q) => sum + q.rewardCoins, 0);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/82 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold tracking-wide text-white">
                DAILY EXPEDITION QUESTS
              </h2>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-teal-400" />
                  Resets in {getTimeUntilMidnightLabel()}
                </span>
                <span>·</span>
                <span className="font-mono-num text-amber-300">
                  {totalCoins.toLocaleString()} Coins Banked
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quest List */}
        <div className="mt-4 space-y-3">
          {questState.quests.map((q) => {
            const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
            const completed = q.progress >= q.target;
            const ready = completed && !q.claimed;

            return (
              <div
                key={q.id}
                className={`rounded-xl border p-4 transition ${
                  ready
                    ? 'border-amber-400/70 bg-slate-800/95'
                    : q.claimed
                      ? 'border-teal-500/30 bg-slate-950/60 opacity-80'
                      : 'border-slate-800 bg-slate-950/75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-bold text-white">
                        {q.title}
                      </span>
                      {q.claimed && (
                        <span className="flex items-center gap-1 rounded bg-teal-500/20 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                          <CheckCircle2 className="h-3 w-3" /> CLAIMED
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-300">{q.description}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">
                    <Coins className="h-3.5 w-3.5" />
                    <span className="font-mono-num">+{q.rewardCoins}</span>
                  </div>
                </div>

                {/* Progress Bar + Action */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-[width] duration-200 ${
                          completed ? 'bg-teal-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between font-mono-num text-[11px] text-slate-400">
                      <span>
                        {q.progress.toLocaleString()} / {q.target.toLocaleString()}
                      </span>
                      <span>{pct}%</span>
                    </div>
                  </div>

                  {ready && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playPowerup('double');
                        onClaimQuest(q.id);
                      }}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 font-display text-xs font-bold tracking-wider text-slate-950 shadow hover:from-amber-400 hover:to-orange-400"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      CLAIM
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex gap-2.5">
          {claimableCount > 1 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playLevelComplete();
                onClaimAll();
              }}
              className="flex-1 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-2.5 font-display text-sm font-bold tracking-wider text-slate-950 hover:from-teal-400 hover:to-emerald-400"
            >
              CLAIM ALL (+{totalClaimableCoins.toLocaleString()} COINS)
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 font-display text-sm font-bold tracking-wider text-slate-100 hover:bg-slate-700"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
