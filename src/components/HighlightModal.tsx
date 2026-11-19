import React, { useEffect, useRef, useState } from 'react';
import {
  Bookmark,
  Download,
  Film,
  Gauge,
  Sparkles,
  Trash2,
  Trophy,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { soundEngine } from '../engine/audio';
import { downloadHighlightClip } from '../engine/highlightRecorder';
import { HighlightClip } from '../types/game';

interface HighlightModalProps {
  clips: HighlightClip[];
  initialClipId?: string | null;
  onToggleSaveClip: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onClose: () => void;
}

export const HighlightModal: React.FC<HighlightModalProps> = ({
  clips,
  initialClipId = null,
  onToggleSaveClip,
  onDeleteClip,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    () => initialClipId || clips[0]?.id || null
  );
  const [slowMo, setSlowMo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const selectedClip = clips.find((c) => c.id === selectedId) || clips[0] || null;

  useEffect(() => {
    if (initialClipId && clips.some((c) => c.id === initialClipId)) {
      setSelectedId(initialClipId);
    }
  }, [initialClipId, clips]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = slowMo ? 0.5 : 1.0;
    }
  }, [slowMo, selectedClip?.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-wide text-white">
                HIGHLIGHT REEL · LAST 10 SECONDS
              </h2>
              <p className="text-xs text-slate-400">
                Inspect your best Himalayan jumps &amp; near-misses in slow-motion or download video
              </p>
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

        {/* Body */}
        <div className="ladakh-scroll flex-1 overflow-y-auto p-5">
          {!selectedClip ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-6 py-14 text-center">
              <Video className="mb-3 h-10 w-10 text-slate-500" />
              <div className="font-display text-base font-bold text-white">
                No Highlight Snippets Captured Yet
              </div>
              <p className="mt-1.5 max-w-md text-xs text-slate-400">
                Every run automatically buffers the last 10 seconds of gameplay. Finish or crash a
                level, or press <span className="font-bold text-amber-300">R</span> / tap{' '}
                <span className="font-bold text-amber-300">CLIP 10s</span> mid-run right after a big
                jump or near-miss!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Video Player */}
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-black">
                <video
                  ref={videoRef}
                  key={selectedClip.id}
                  src={selectedClip.url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  onLoadedData={() => {
                    if (videoRef.current) {
                      videoRef.current.playbackRate = slowMo ? 0.5 : 1.0;
                    }
                  }}
                  className="aspect-video w-full bg-slate-950 object-contain"
                />
              </div>

              {/* Playback Controls & Export Row */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-800 bg-slate-950/75 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setSlowMo((v) => !v);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-display text-xs font-bold tracking-wider transition ${
                      slowMo
                        ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <Gauge className="h-3.5 w-3.5" />
                    {slowMo ? '0.5x SLOW-MO ON' : '0.5x SLOW-MO'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onToggleSaveClip(selectedClip.id);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-display text-xs font-bold tracking-wider transition ${
                      selectedClip.savedToReel
                        ? 'border-teal-400 bg-teal-500/20 text-teal-300'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-teal-400/60'
                    }`}
                  >
                    <Bookmark
                      className={`h-3.5 w-3.5 ${selectedClip.savedToReel ? 'fill-teal-300' : ''}`}
                    />
                    {selectedClip.savedToReel ? 'SAVED TO REEL' : 'SAVE TO REEL'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onDeleteClip(selectedClip.id);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-display text-xs font-bold text-slate-400 transition hover:border-rose-500/60 hover:text-rose-300"
                    title="Delete Highlight"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    DELETE
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playPowerup('double');
                      downloadHighlightClip(selectedClip);
                    }}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-1.5 font-display text-xs font-bold tracking-wider text-slate-950 transition hover:bg-amber-400"
                  >
                    <Download className="h-3.5 w-3.5" />
                    DOWNLOAD VIDEO
                  </button>
                </div>
              </div>

              {/* Telemetry Badges */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/65 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Stage &amp; Rig
                  </div>
                  <div className="mt-0.5 truncate font-display text-xs font-bold text-white">
                    Lv.{selectedClip.level} · {selectedClip.vehicleName}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/65 p-3">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                    <Zap className="h-3 w-3" /> Near-Misses
                  </div>
                  <div className="mt-0.5 font-mono-num text-sm font-bold text-white">
                    {selectedClip.nearMisses}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/65 p-3">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sky-400">
                    <Sparkles className="h-3 w-3" /> Jumps / Air
                  </div>
                  <div className="mt-0.5 font-mono-num text-sm font-bold text-white">
                    {selectedClip.jumpsCount} jumps
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/65 p-3">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-teal-400">
                    <Trophy className="h-3 w-3" /> Snippet Stats
                  </div>
                  <div className="mt-0.5 font-mono-num text-xs font-bold text-white">
                    {selectedClip.durationSec}s · {selectedClip.peakSpeedKmh} km/h
                  </div>
                </div>
              </div>

              {/* Clip Switcher Strip */}
              {clips.length > 1 && (
                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Captured Snippets ({clips.length})
                  </div>
                  <div className="ladakh-scroll flex gap-2.5 overflow-x-auto pb-1">
                    {clips.map((c) => {
                      const active = c.id === selectedClip.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            setSelectedId(c.id);
                          }}
                          className={`flex min-w-[175px] shrink-0 flex-col gap-1 rounded-xl border p-2.5 text-left transition ${
                            active
                              ? 'border-amber-400 bg-slate-800/95'
                              : 'border-slate-800 bg-slate-950/75 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-xs font-bold text-white">
                              LV {c.level} · {c.durationSec}s
                            </span>
                            {c.savedToReel ? (
                              <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-bold text-teal-300">
                                SAVED
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">{c.capturedAt}</span>
                            )}
                          </div>
                          <div className="truncate text-[11px] text-slate-300">{c.vehicleName}</div>
                          <div className="text-[10px] text-amber-300">
                            {c.nearMisses} near-miss · {c.jumpsCount} jumps
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
