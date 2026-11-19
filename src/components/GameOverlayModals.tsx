import React from 'react';
import {
  ArrowRight,
  Award,
  Crown,
  Download,
  Film,
  Gift,
  Home,
  Medal,
  Play,
  RotateCcw,
  Settings,
  ShoppingBag,
  Star,
  Trophy,
} from 'lucide-react';
import { BIOMES, getLevelConfig, TOTAL_LEVEL_COUNT } from '../data/gameData';
import { soundEngine } from '../engine/audio';
import { downloadHighlightClip } from '../engine/highlightRecorder';
import { DailyQuestState, HighlightClip, LevelHighScoreEntry, RunResult } from '../types/game';

interface PauseModalProps {
  level: number;
  onResume: () => void;
  onRestart: () => void;
  onStore: () => void;
  onOptions: () => void;
  onMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  level,
  onResume,
  onRestart,
  onStore,
  onOptions,
  onMenu,
}) => {
  const cfg = getLevelConfig(level);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
        <div className="text-xs font-bold uppercase tracking-widest text-amber-400">
          Pass Paused · Lv.{cfg.level}
        </div>
        <h2 className="mt-1 font-display text-2xl font-bold text-white">{cfg.name}</h2>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onResume();
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-display text-sm font-bold tracking-wider text-slate-950 hover:bg-amber-400"
          >
            <Play className="h-4 w-4 fill-slate-950" /> RESUME EXPEDITION
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onRestart();
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-2.5 font-display text-xs font-bold tracking-wider text-white hover:bg-slate-700"
          >
            <RotateCcw className="h-4 w-4 text-teal-400" /> RESTART LEVEL
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onStore();
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-2.5 font-display text-xs font-bold tracking-wider text-white hover:bg-slate-700"
          >
            <ShoppingBag className="h-4 w-4 text-amber-400" /> VEHICLE STORE
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOptions();
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 py-2.5 font-display text-xs font-bold tracking-wider text-white hover:bg-slate-700"
          >
            <Settings className="h-4 w-4 text-sky-400" /> OPTIONS
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onMenu();
            }}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 py-2.5 font-display text-xs font-bold tracking-wider text-slate-300 hover:text-white"
          >
            <Home className="h-4 w-4" /> MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
};

interface ResultModalProps {
  result: RunResult;
  levelHighScores: LevelHighScoreEntry[];
  dailyQuests: DailyQuestState;
  latestHighlight: HighlightClip | null;
  onWatchHighlight: (clipId: string) => void;
  onClaimQuest: (questId: string) => void;
  onNextLevel: () => void;
  onRetry: () => void;
  onStore: () => void;
  onMenu: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  result,
  levelHighScores,
  dailyQuests,
  latestHighlight,
  onWatchHighlight,
  onClaimQuest,
  onNextLevel,
  onRetry,
  onStore,
  onMenu,
}) => {
  const cfg = getLevelConfig(result.level);
  const biome = BIOMES[cfg.biome];
  const isFinalVictory = result.won && result.level === TOTAL_LEVEL_COUNT;
  const readyQuests = dailyQuests.quests.filter(
    (q) => q.progress >= q.target && !q.claimed
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/82 p-4">
      <div className="ladakh-scroll max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="text-center">
          {isFinalVictory ? (
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <Trophy className="h-8 w-8" />
            </div>
          ) : null}

          <div
            className={`text-xs font-bold uppercase tracking-widest ${
              result.won ? 'text-teal-400' : 'text-rose-400'
            }`}
          >
            {isFinalVictory
              ? `All ${TOTAL_LEVEL_COUNT} Leh Ladakh Passes Conquered!`
              : result.won
                ? `Level ${result.level} Complete`
                : `Crashed at ${Math.round((result.distance / result.targetDistance) * 100)}%`}
          </div>

          <h2 className="mt-1 font-display text-2xl font-bold text-white">{cfg.name}</h2>

          {result.won ? (
            <div className="mt-3 flex justify-center gap-2">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`h-8 w-8 ${
                    s <= result.starsEarned
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 rounded-lg bg-rose-950/60 px-3 py-2 text-xs text-rose-200">
              {result.crashReason || 'Watch for obstacles ahead!'}
            </p>
          )}
        </div>

        {/* Coins & Distance Breakdown */}
        <div className="mt-5 space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Distance Driven</span>
            <span className="font-mono-num font-bold text-white">
              {result.distance} / {result.targetDistance} m
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 border-y border-slate-800 py-2.5 text-center">
            <div>
              <div className="text-[10px] text-amber-500">Copper</div>
              <div className="font-mono-num font-bold text-white">
                {result.coinBreakdown.copper}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-300">Silver</div>
              <div className="font-mono-num font-bold text-white">
                {result.coinBreakdown.silver}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-yellow-400">Gold</div>
              <div className="font-mono-num font-bold text-white">
                {result.coinBreakdown.gold}
              </div>
            </div>
            <div>
              <div className="truncate text-[10px]" style={{ color: biome.coinColor }}>
                Relic
              </div>
              <div className="font-mono-num font-bold text-white">
                {result.coinBreakdown.biome}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-300">
              {result.won ? 'Coins Banked' : 'Salvaged Coins (50%)'}
            </span>
            <span className="font-mono-num text-sm font-bold text-amber-300">
              +{result.coinsEarned.toLocaleString()}
            </span>
          </div>

          {result.firstClearBonus > 0 && (
            <div className="flex justify-between text-teal-300">
              <span>First Pass Clear Bonus</span>
              <span className="font-mono-num font-bold">
                +{result.firstClearBonus.toLocaleString()}
              </span>
            </div>
          )}

          <div className="flex justify-between border-t border-slate-800 pt-2 text-[11px] text-slate-400">
            <span>Near-Misses: <strong className="font-mono-num text-sky-300">{result.nearMisses}</strong></span>
            <span>Jumps: <strong className="font-mono-num text-amber-300">{result.jumpsPerformed}</strong></span>
            <span>Peak: <strong className="font-mono-num text-white">{result.peakSpeedKmh} km/h</strong></span>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-2">
            <span className="text-slate-300">
              Run Score <span className="text-[10px] text-slate-500">({result.runTimeSec.toFixed(1)}s)</span>
            </span>
            <div className="flex items-center gap-2">
              {result.won && result.isNewLevelRecord && (
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-amber-300">
                  NEW #1!
                </span>
              )}
              {result.won && !result.isNewLevelRecord && result.highScoreRank && (
                <span className="rounded bg-teal-400/20 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-wider text-teal-300">
                  TOP #{result.highScoreRank}
                </span>
              )}
              <span className="font-mono-num text-sm font-bold text-white">
                {result.score.toLocaleString()} pts
              </span>
            </div>
          </div>
        </div>

        {/* Local Top 5 High-Score Table for this Level */}
        {result.won && levelHighScores.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-slate-950/80 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-display text-xs font-bold tracking-wider text-amber-300">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                LEVEL {result.level} TOP 5 HIGH SCORES
              </div>
              <span className="text-[10px] font-medium text-slate-400">
                Local Records
              </span>
            </div>

            <div className="space-y-1.5">
              {levelHighScores.map((entry, idx) => {
                const rank = idx + 1;
                const isCurrentRun = result.highScoreId === entry.id;
                const rankBadge =
                  rank === 1 ? (
                    <Crown className="h-3.5 w-3.5 text-amber-400" />
                  ) : rank === 2 ? (
                    <Medal className="h-3.5 w-3.5 text-slate-300" />
                  ) : rank === 3 ? (
                    <Medal className="h-3.5 w-3.5 text-orange-400" />
                  ) : (
                    <span className="font-mono-num text-[11px] font-bold text-slate-500">
                      #{rank}
                    </span>
                  );

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                      isCurrentRun
                        ? 'border-amber-400/60 bg-amber-500/15'
                        : 'border-slate-800/80 bg-slate-900/60'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {rankBadge}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-semibold text-slate-100">
                            {entry.vehicleName}
                          </span>
                          {isCurrentRun && (
                            <span className="shrink-0 rounded bg-amber-400 px-1 py-0.2 font-display text-[9px] font-bold text-slate-950">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className="flex items-center gap-0.5 text-amber-400">
                            {[1, 2, 3].map((s) => (
                              <Star
                                key={s}
                                className={`h-2.5 w-2.5 ${
                                  s <= entry.stars
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </span>
                          <span>·</span>
                          <span className="font-mono-num">{entry.timeSec.toFixed(1)}s</span>
                          <span>·</span>
                          <span className="font-mono-num">{entry.coins}c</span>
                          {entry.nearMisses > 0 && (
                            <>
                              <span>·</span>
                              <span className="font-mono-num text-sky-300">
                                {entry.nearMisses}nm
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right font-mono-num text-xs font-bold text-amber-200">
                      {entry.score.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>

            {result.highScoreRank === null && (
              <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-1.5 text-[11px] text-slate-400">
                <span>This Run (Outside Top 5)</span>
                <span className="font-mono-num font-semibold text-slate-200">
                  {result.score.toLocaleString()} pts
                </span>
              </div>
            )}
          </div>
        )}

        {!result.won && levelHighScores.length > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Crown className="h-3.5 w-3.5 text-amber-400" />
              Level {result.level} #1 Record to Beat
            </span>
            <span className="font-mono-num font-bold text-amber-300">
              {levelHighScores[0].score.toLocaleString()} pts
            </span>
          </div>
        )}

        {/* Last 10 Seconds Run Highlight Snippet */}
        {latestHighlight && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-sky-400/40 bg-sky-500/10 px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-display text-xs font-bold tracking-wider text-sky-300">
                <Film className="h-3.5 w-3.5" />
                LAST {latestHighlight.durationSec}s HIGHLIGHT READY
              </div>
              <div className="truncate text-[11px] text-slate-300">
                {latestHighlight.nearMisses} near-misses · {latestHighlight.jumpsCount} jumps captured
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onWatchHighlight(latestHighlight.id);
                }}
                className="flex items-center gap-1 rounded-lg bg-sky-400 px-2.5 py-1.5 font-display text-[11px] font-bold text-slate-950 hover:bg-sky-300"
              >
                <Play className="h-3 w-3 fill-slate-950" /> WATCH
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playPowerup('double');
                  downloadHighlightClip(latestHighlight);
                }}
                className="flex items-center justify-center rounded-lg border border-sky-400/50 bg-slate-900 p-1.5 text-sky-300 hover:bg-slate-800"
                title="Download 10s Video Snippet"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Daily Quest Rewards Ready to Claim */}
        {readyQuests.length > 0 && (
          <div className="mt-3 space-y-2 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 font-display text-xs font-bold tracking-wider text-amber-300">
              <Award className="h-4 w-4" />
              DAILY QUEST COMPLETE!
            </div>
            {readyQuests.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-slate-200">{q.description}</span>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playPowerup('double');
                    onClaimQuest(q.id);
                  }}
                  className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 font-display text-[11px] font-bold text-slate-950 hover:bg-amber-400"
                >
                  <Gift className="h-3 w-3" /> +{q.rewardCoins}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2.5">
          {result.won && result.level < TOTAL_LEVEL_COUNT ? (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onNextLevel();
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-display text-sm font-bold tracking-wider text-slate-950 hover:from-amber-400 hover:to-orange-400"
            >
              NEXT LEVEL ({result.level + 1}/{TOTAL_LEVEL_COUNT}) <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onRetry();
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-display text-sm font-bold tracking-wider text-slate-950 hover:from-amber-400 hover:to-orange-400"
            >
              <RotateCcw className="h-4 w-4" />{' '}
              {result.won ? `REPLAY LEVEL ${TOTAL_LEVEL_COUNT}` : 'RETRY PASS'}
            </button>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onRetry();
              }}
              className="rounded-xl border border-slate-700 bg-slate-800 py-2.5 font-display text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              RETRY
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onStore();
              }}
              className="rounded-xl border border-slate-700 bg-slate-800 py-2.5 font-display text-xs font-bold text-amber-300 hover:bg-slate-700"
            >
              STORE
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onMenu();
              }}
              className="rounded-xl border border-slate-700 bg-slate-800 py-2.5 font-display text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              MENU
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
