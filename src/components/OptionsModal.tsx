import React from 'react';
import { Monitor, Sliders, User, Volume2, X } from 'lucide-react';
import { soundEngine } from '../engine/audio';
import { CharacterGender, GameSettings } from '../types/game';

interface OptionsModalProps {
  settings: GameSettings;
  characterGender: CharacterGender;
  onSetGender: (gender: CharacterGender) => void;
  onUpdate: (next: GameSettings) => void;
  onClose: () => void;
}

export const OptionsModal: React.FC<OptionsModalProps> = ({
  settings,
  characterGender,
  onSetGender,
  onUpdate,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="h-5 w-5 text-amber-400" />
            <h2 className="font-display text-xl font-bold tracking-wide text-white">
              EXPEDITION OPTIONS
            </h2>
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

        <div className="space-y-5">
          {/* Audio Mute */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Sound & Engine Synth</div>
              <div className="text-xs text-slate-400">Procedural Web Audio SFX & chimes</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = { ...settings, muted: !settings.muted };
                onUpdate(next);
                if (!next.muted) soundEngine.playUiClick();
              }}
              className={`rounded-lg px-4 py-1.5 font-display text-xs font-bold tracking-wider transition ${
                settings.muted
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-teal-500 text-slate-950'
              }`}
            >
              {settings.muted ? 'MUTED' : 'ENABLED'}
            </button>
          </div>

          {/* Volume Slider */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-200">
                <Volume2 className="h-4 w-4 text-amber-400" />
                Master Volume
              </span>
              <span className="font-mono-num text-amber-300">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => onUpdate({ ...settings, volume: Number(e.target.value) })}
              className="w-full accent-amber-400"
            />
          </div>

          {/* Graphics Quality */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <Monitor className="h-4 w-4 text-sky-400" />
                3D Graphics Quality
              </div>
              <div className="text-xs text-slate-400">Dynamic shadows & retina pixel ratio</div>
            </div>
            <div className="flex overflow-hidden rounded-lg border border-slate-700">
              {(['high', 'balanced'] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onUpdate({ ...settings, graphics: tier });
                  }}
                  className={`px-3 py-1.5 font-display text-xs font-bold uppercase ${
                    settings.graphics === tier
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Camera Turn Tilt */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Dynamic Chase Tilt</div>
              <div className="text-xs text-slate-400">Subtle horizon roll during lane shifts</div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onUpdate({ ...settings, cameraTilt: !settings.cameraTilt });
              }}
              className={`rounded-lg px-4 py-1.5 font-display text-xs font-bold ${
                settings.cameraTilt
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.cameraTilt ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Touch/Hint Controls */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">In-Game Control Hints</div>
              <div className="text-xs text-slate-400">Show swipe & keyboard quick cues</div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onUpdate({ ...settings, showHints: !settings.showHints });
              }}
              className={`rounded-lg px-4 py-1.5 font-display text-xs font-bold ${
                settings.showHints
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.showHints ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Driver / Rider Character */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <User className="h-4 w-4 text-amber-400" />
                Driver &amp; Rider Character
              </div>
              <div className="text-xs text-slate-400">Choose 3D Himalayan rider model</div>
            </div>
            <div className="flex overflow-hidden rounded-lg border border-slate-700">
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onSetGender(g);
                  }}
                  className={`px-3.5 py-1.5 font-display text-xs font-bold uppercase ${
                    characterGender === g
                      ? g === 'female'
                        ? 'bg-rose-500 text-white'
                        : 'bg-sky-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onClose();
          }}
          className="mt-6 w-full rounded-xl bg-amber-500 py-2.5 font-display text-sm font-bold tracking-wider text-slate-950 transition hover:bg-amber-400"
        >
          DONE
        </button>
      </div>
    </div>
  );
};
