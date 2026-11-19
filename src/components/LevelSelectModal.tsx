import React, { useState } from 'react';
import { Lock, Mountain, Play, Star, X } from 'lucide-react';
import { ALL_LEVELS, BIOME_ORDER, BIOMES, TOTAL_LEVEL_COUNT } from '../data/gameData';
import { soundEngine } from '../engine/audio';
import { BiomeId, SaveData } from '../types/game';

interface LevelSelectModalProps {
  save: SaveData;
  onSelectLevel: (level: number) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  save,
  onSelectLevel,
  onClose,
}) => {
  const foundIdx = BIOME_ORDER.findIndex(
    (id) =>
      save.currentLevel >= BIOMES[id].levelRange[0] &&
      save.currentLevel <= BIOMES[id].levelRange[1]
  );
  const [selectedBiome, setSelectedBiome] = useState<BiomeId>(
    BIOME_ORDER[foundIdx >= 0 ? foundIdx : 0]
  );

  const biome = BIOMES[selectedBiome];
  const biomeLevels = ALL_LEVELS.filter((lvl) => lvl.biome === selectedBiome);
  const totalStars = Object.values(save.levelStars).reduce((acc, s) => acc + s, 0);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/82 p-4">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <Mountain className="h-6 w-6 text-amber-400" />
            <div>
              <h2 className="font-display text-xl font-bold tracking-wide text-white">
                LEH LADAKH {TOTAL_LEVEL_COUNT}-LEVEL EXPEDITION
              </h2>
              <p className="text-xs text-slate-400">
                Unlocked {save.highestUnlockedLevel}/{TOTAL_LEVEL_COUNT} Passes · {totalStars}/
                {TOTAL_LEVEL_COUNT * 3} Stars Earned
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

        {/* 7 Biome Region Tabs */}
        <div className="grid grid-cols-2 gap-2 border-b border-slate-800 bg-slate-950/60 px-6 py-3 sm:grid-cols-4 lg:grid-cols-7">
          {BIOME_ORDER.map((bId) => {
            const b = BIOMES[bId];
            const active = bId === selectedBiome;
            return (
              <button
                key={bId}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setSelectedBiome(bId);
                }}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? 'border-amber-400 bg-slate-800 text-white'
                    : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-num text-[10px] font-bold text-amber-300">
                    LV {b.levelRange[0]}–{b.levelRange[1]}
                  </span>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: b.coinColor }}
                  />
                </div>
                <div className="mt-0.5 truncate font-display text-xs font-bold">{b.name}</div>
              </button>
            );
          })}
        </div>

        {/* Selected Biome Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/40 px-6 py-2.5 text-xs">
          <span className="text-slate-300">{biome.subtitle}</span>
          <span className="flex items-center gap-1.5 font-semibold text-white">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: biome.coinColor }}
            />
            Signature Coin: <span style={{ color: biome.coinColor }}>{biome.coinName}</span> (+
            {biome.coinValue} Base)
          </span>
        </div>

        {/* 20-Level Grid for Selected Biome */}
        <div className="ladakh-scroll grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-6 sm:grid-cols-4 md:grid-cols-5">
          {biomeLevels.map((lvl) => {
            const unlocked = lvl.level <= save.highestUnlockedLevel;
            const stars = save.levelStars[lvl.level] || 0;
            const bestScore = save.levelHighScores[lvl.level]?.[0]?.score;
            const isCurrent = lvl.level === save.currentLevel;

            return (
              <button
                key={lvl.level}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  soundEngine.playUiClick();
                  onSelectLevel(lvl.level);
                }}
                className={`group flex flex-col justify-between rounded-xl border p-3 text-left transition ${
                  !unlocked
                    ? 'cursor-not-allowed border-slate-800/70 bg-slate-950/50 opacity-55'
                    : isCurrent
                      ? 'border-amber-400 bg-slate-800 shadow-lg hover:bg-slate-700'
                      : 'border-slate-700/80 bg-slate-800/70 hover:border-teal-400/70 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-num text-base font-bold text-white">
                    {lvl.level}
                  </span>
                  {unlocked ? (
                    <Play className="h-3.5 w-3.5 text-amber-400 opacity-75 group-hover:opacity-100" />
                  ) : (
                    <Lock className="h-3.5 w-3.5 text-slate-500" />
                  )}
                </div>

                <div className="my-1.5 line-clamp-2 text-[11px] font-medium leading-tight text-slate-200">
                  {lvl.name}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`h-3 w-3 ${
                          s <= stars
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono-num text-[10px] text-slate-400">
                    {bestScore ? `${bestScore.toLocaleString()} pts` : `${lvl.targetDistance}m`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
