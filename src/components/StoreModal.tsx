import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  Palette,
  Shield,
  Sparkles,
  User,
  Wrench,
  Zap,
} from 'lucide-react';
import { getUpgradeCost, getVehicleSpec, VEHICLES } from '../data/gameData';
import { soundEngine } from '../engine/audio';
import { CharacterGender, SaveData, UpgradeLevels, VehicleId } from '../types/game';

interface StoreModalProps {
  save: SaveData;
  previewVehicleId: VehicleId;
  onSelectPreview: (id: VehicleId) => void;
  onSelectColor: (id: VehicleId, color: string) => void;
  onBuyVehicle: (id: VehicleId) => void;
  onEquipVehicle: (id: VehicleId) => void;
  onBuyUpgrade: (key: keyof UpgradeLevels) => void;
  onSetGender: (gender: CharacterGender) => void;
  onClose: () => void;
}

export const StoreModal: React.FC<StoreModalProps> = ({
  save,
  previewVehicleId,
  onSelectPreview,
  onSelectColor,
  onBuyVehicle,
  onEquipVehicle,
  onBuyUpgrade,
  onSetGender,
  onClose,
}) => {
  const [tab, setTab] = useState<'vehicles' | 'upgrades'>('vehicles');
  const [collapsed, setCollapsed] = useState(false);

  const spec = getVehicleSpec(previewVehicleId);
  const isOwned = save.ownedVehicles.includes(spec.id);
  const isEquipped = save.equippedVehicle === spec.id;
  const levelMet = save.highestUnlockedLevel >= spec.unlockLevel;
  const canAfford = save.totalCoins >= spec.cost;
  const activePaint = save.vehicleColors[spec.id] || spec.defaultColor;

  const upgradeItems: {
    key: keyof UpgradeLevels;
    label: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'speed',
      label: 'Himalayan Turbo',
      desc: '+3.5% Top Speed per rank',
      icon: <Zap className="h-4 w-4 text-amber-400" />,
    },
    {
      key: 'handling',
      label: 'Pass Suspension',
      desc: 'Crisper lane steering response',
      icon: <Wrench className="h-4 w-4 text-teal-400" />,
    },
    {
      key: 'magnet',
      label: 'Coin Magnet Coil',
      desc: '+0.7m passive coin pull radius',
      icon: <Sparkles className="h-4 w-4 text-rose-400" />,
    },
    {
      key: 'nitro',
      label: 'Powerup Duration',
      desc: '+18% Nitro, Magnet & 2x time',
      icon: <Shield className="h-4 w-4 text-sky-400" />,
    },
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar: Back + Compact Vehicle Spec Badge + Coin Wallet */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/88 px-3.5 py-2 font-display text-xs font-bold tracking-wider text-slate-100 shadow-lg transition hover:border-amber-400/60 hover:text-amber-300"
          >
            <ArrowLeft className="h-4 w-4" />
            BACK
          </button>

          <div className="rounded-xl border border-slate-700/80 bg-slate-950/88 px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold text-white sm:text-lg">
                {spec.name}
              </span>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {spec.category}
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">{spec.tagline}</p>
          </div>
        </div>

        {/* Rider Toggle, Drag Hint & Coins */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/90 px-2.5 py-1.5 shadow-lg">
            <User className="h-3.5 w-3.5 text-amber-400" />
            <div className="flex overflow-hidden rounded-lg border border-slate-700">
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onSetGender(g);
                  }}
                  className={`px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wider transition ${
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

          <span className="hidden rounded-lg bg-slate-950/75 px-3 py-1.5 text-xs text-slate-300 md:inline-block">
            Drag 3D Vehicle to Rotate 360°
          </span>
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-slate-950/90 px-4 py-2 shadow-lg">
            <span className="inline-block h-3.5 w-3.5 rounded-full border border-amber-100 bg-amber-400" />
            <span className="font-mono-num text-base font-bold text-amber-300">
              {save.totalCoins.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Unified Collapsible Bottom Garage Dock — Center 3D Viewport stays 100% open */}
      <div className="pointer-events-auto mx-auto flex w-full max-w-[940px] flex-col items-center">
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            setCollapsed((v) => !v);
          }}
          className="mb-1.5 flex items-center gap-1.5 rounded-t-lg border border-b-0 border-slate-700 bg-slate-950/90 px-4 py-1 font-display text-[11px] font-bold tracking-wider text-slate-300 hover:text-amber-300"
        >
          {collapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" /> SHOW GARAGE DOCK
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" /> HIDE DOCK (INSPECT 3D)
            </>
          )}
        </button>

        {!collapsed && (
          <div className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/90 p-3.5 shadow-2xl sm:p-4">
            {/* Tabs + Paint Swatches + Action Row */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 pb-3">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setTab('vehicles');
                  }}
                  className={`rounded-lg px-3.5 py-1.5 font-display text-xs font-bold tracking-wider transition ${
                    tab === 'vehicles'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  VEHICLES ({save.ownedVehicles.length}/{VEHICLES.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setTab('upgrades');
                  }}
                  className={`rounded-lg px-3.5 py-1.5 font-display text-xs font-bold tracking-wider transition ${
                    tab === 'upgrades'
                      ? 'bg-teal-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  GARAGE UPGRADES
                </button>
              </div>

              {tab === 'vehicles' && (
                <div className="flex flex-wrap items-center gap-3">
                  {/* Stat Pills */}
                  <div className="hidden items-center gap-3 text-[11px] text-slate-300 lg:flex">
                    <span>
                      SPD <strong className="font-mono-num text-amber-300">{spec.speedStat}/10</strong>
                    </span>
                    <span>
                      HDL <strong className="font-mono-num text-teal-300">{spec.handlingStat}/10</strong>
                    </span>
                    <span>
                      JMP <strong className="font-mono-num text-sky-300">{spec.jumpStat}/10</strong>
                    </span>
                    <span>
                      SHD <strong className="font-mono-num text-rose-300">{spec.baseShields}</strong>
                    </span>
                  </div>

                  {/* Paint Swatches */}
                  <div className="flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-slate-400" />
                    {spec.palette.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onSelectColor(spec.id, hex);
                        }}
                        className={`h-5 w-5 rounded-full border-2 transition ${
                          activePaint === hex
                            ? 'scale-110 border-white'
                            : 'border-slate-600 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: hex }}
                        title="Preview Paint Finish"
                      />
                    ))}
                  </div>

                  {/* Buy / Equip CTA */}
                  {isEquipped ? (
                    <span className="flex items-center gap-1.5 rounded-lg bg-teal-500/20 px-4 py-1.5 font-display text-xs font-bold text-teal-300">
                      <Check className="h-4 w-4" /> EQUIPPED
                    </span>
                  ) : isOwned ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onEquipVehicle(spec.id);
                      }}
                      className="rounded-lg bg-teal-500 px-5 py-1.5 font-display text-xs font-bold tracking-wider text-slate-950 transition hover:bg-teal-400"
                    >
                      EQUIP VEHICLE
                    </button>
                  ) : !levelMet ? (
                    <span className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-1.5 font-display text-xs font-bold text-slate-400">
                      <Lock className="h-3.5 w-3.5" /> REACH LV.{spec.unlockLevel}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => {
                        soundEngine.playPowerup('shield');
                        onBuyVehicle(spec.id);
                      }}
                      className={`rounded-lg px-4 py-1.5 font-display text-xs font-bold tracking-wider transition ${
                        canAfford
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                          : 'cursor-not-allowed bg-slate-800 text-slate-500'
                      }`}
                    >
                      BUY · {spec.cost.toLocaleString()} COINS
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Content Area */}
            {tab === 'vehicles' ? (
              <div className="ladakh-scroll flex gap-2.5 overflow-x-auto pb-1">
                {VEHICLES.map((v) => {
                  const owned = save.ownedVehicles.includes(v.id);
                  const eq = save.equippedVehicle === v.id;
                  const active = v.id === previewVehicleId;
                  const unlocked = save.highestUnlockedLevel >= v.unlockLevel;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onSelectPreview(v.id);
                      }}
                      className={`flex min-w-[152px] shrink-0 flex-col justify-between rounded-xl border p-2.5 text-left transition ${
                        active
                          ? 'border-amber-400 bg-slate-800/95'
                          : 'border-slate-800 bg-slate-900/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: save.vehicleColors[v.id] || v.defaultColor }}
                        />
                        {eq ? (
                          <span className="text-[10px] font-bold text-teal-400">ACTIVE</span>
                        ) : owned ? (
                          <span className="text-[10px] font-semibold text-slate-300">OWNED</span>
                        ) : !unlocked ? (
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-500">
                            <Lock className="h-2.5 w-2.5" /> LV.{v.unlockLevel}
                          </span>
                        ) : (
                          <span className="font-mono-num text-[10px] font-bold text-amber-300">
                            {v.cost.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 font-display text-xs font-bold text-white">
                        {v.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{v.category}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {upgradeItems.map((item) => {
                  const rank = save.upgrades[item.key];
                  const isMax = rank >= 5;
                  const cost = getUpgradeCost(rank);
                  const afford = save.totalCoins >= cost;
                  return (
                    <div
                      key={item.key}
                      className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/85 p-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-display text-xs font-bold text-white">
                            {item.icon} {item.label}
                          </span>
                          <span className="font-mono-num text-[11px] font-bold text-amber-300">
                            {rank}/5
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{item.desc}</p>
                        {/* 5 pip bar */}
                        <div className="mt-2 flex gap-1">
                          {[0, 1, 2, 3, 4].map((idx) => (
                            <div
                              key={idx}
                              className={`h-1.5 flex-1 rounded-sm ${
                                idx < rank ? 'bg-amber-400' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isMax || !afford}
                        onClick={() => {
                          soundEngine.playPowerup('double');
                          onBuyUpgrade(item.key);
                        }}
                        className={`mt-2.5 w-full rounded-lg py-1.5 font-display text-[11px] font-bold tracking-wider transition ${
                          isMax
                            ? 'bg-teal-500/20 text-teal-300'
                            : afford
                              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                              : 'cursor-not-allowed bg-slate-800 text-slate-500'
                        }`}
                      >
                        {isMax ? 'MAXED OUT' : `UPGRADE · ${cost.toLocaleString()}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
