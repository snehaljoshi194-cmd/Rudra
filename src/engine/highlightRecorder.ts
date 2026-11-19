import { HighlightClip } from '../types/game';

interface RecorderSlot {
  recorder: MediaRecorder | null;
  chunks: BlobPart[];
  startedAtRunSec: number;
  active: boolean;
}

export interface HighlightMetadata {
  level: number;
  levelName: string;
  biomeName: string;
  vehicleName: string;
  won: boolean;
  peakSpeedKmh: number;
  jumpsCount: number;
  nearMisses: number;
  savedToReel?: boolean;
}

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];

function detectSupportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const mime of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      // Ignore probe error
    }
  }
  return '';
}

export class HighlightRecorder {
  private canvas: HTMLCanvasElement;
  private stream: MediaStream | null = null;
  private mimeType: string | null;
  private slots: [RecorderSlot, RecorderSlot] = [
    { recorder: null, chunks: [], startedAtRunSec: 0, active: false },
    { recorder: null, chunks: [], startedAtRunSec: 0, active: false },
  ];
  private runElapsedSec = 0;
  private isRunning = false;
  private isPaused = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.mimeType = detectSupportedMimeType();
  }

  public isSupported(): boolean {
    return (
      this.mimeType !== null &&
      typeof this.canvas.captureStream === 'function' &&
      typeof MediaRecorder !== 'undefined'
    );
  }

  public isActive(): boolean {
    return this.isRunning && this.isSupported();
  }

  private ensureStream(): MediaStream | null {
    if (!this.isSupported()) return null;
    if (!this.stream) {
      try {
        this.stream = this.canvas.captureStream(24);
      } catch {
        return null;
      }
    }
    return this.stream;
  }

  private startSlot(index: 0 | 1): void {
    const stream = this.ensureStream();
    if (!stream) return;

    const slot = this.slots[index];
    this.discardSlot(index);

    try {
      const options: MediaRecorderOptions = { videoBitsPerSecond: 2_200_000 };
      if (this.mimeType) options.mimeType = this.mimeType;

      const rec = new MediaRecorder(stream, options);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      slot.recorder = rec;
      slot.chunks = chunks;
      slot.startedAtRunSec = this.runElapsedSec;
      slot.active = true;

      rec.start(500);
    } catch {
      slot.recorder = null;
      slot.chunks = [];
      slot.active = false;
    }
  }

  private discardSlot(index: 0 | 1): void {
    const slot = this.slots[index];
    if (slot.recorder) {
      const rec = slot.recorder;
      slot.recorder = null;
      slot.active = false;
      slot.chunks = [];
      rec.ondataavailable = null;
      rec.onstop = null;
      try {
        if (rec.state !== 'inactive') {
          rec.stop();
        }
      } catch {
        // Ignore cleanup failure
      }
    } else {
      slot.active = false;
      slot.chunks = [];
    }
  }

  public startRun(): void {
    this.stopAll();
    this.runElapsedSec = 0;
    this.isPaused = false;
    if (!this.isSupported()) {
      this.isRunning = false;
      return;
    }
    this.isRunning = true;
    this.startSlot(0);
  }

  public update(dt: number): void {
    if (!this.isRunning || this.isPaused) return;
    this.runElapsedSec += dt;

    const s0 = this.slots[0];
    const s1 = this.slots[1];
    const age0 = s0.active ? this.runElapsedSec - s0.startedAtRunSec : -1;
    const age1 = s1.active ? this.runElapsedSec - s1.startedAtRunSec : -1;

    // Staggered dual-ring: start slot 1 once slot 0 hits 5.2s so overlap guarantees >=5s & <=11s valid EBML header
    if (s0.active && !s1.active && age0 >= 5.2) {
      this.startSlot(1);
    } else if (s1.active && !s0.active && age1 >= 5.2) {
      this.startSlot(0);
    }

    // Rotate any slot older than 11.0s once the companion slot has >= 5.2s
    if (s0.active && age0 >= 11.0 && s1.active && age1 >= 5.2) {
      this.startSlot(0);
    } else if (s1.active && age1 >= 11.0 && s0.active && age0 >= 5.2) {
      this.startSlot(1);
    }
  }

  public pause(): void {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    for (const slot of this.slots) {
      try {
        if (slot.recorder && slot.recorder.state === 'recording') {
          slot.recorder.pause();
        }
      } catch {
        // Ignore if pause unsupported
      }
    }
  }

  public resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    for (const slot of this.slots) {
      try {
        if (slot.recorder && slot.recorder.state === 'paused') {
          slot.recorder.resume();
        }
      } catch {
        // Ignore if resume unsupported
      }
    }
  }

  public async captureLast10Seconds(
    meta: HighlightMetadata,
    keepRecording = false
  ): Promise<HighlightClip | null> {
    if (!this.isRunning) return null;

    // Pick the active slot covering the longest valid recent window (~6-11s)
    const ages = this.slots.map((s) => (s.active ? this.runElapsedSec - s.startedAtRunSec : -1));
    let chosenIdx: 0 | 1 | null = null;
    if (ages[0] >= 0 && ages[1] >= 0) {
      chosenIdx = ages[0] >= ages[1] ? 0 : 1;
    } else if (ages[0] >= 0) {
      chosenIdx = 0;
    } else if (ages[1] >= 0) {
      chosenIdx = 1;
    }

    if (chosenIdx === null) {
      if (!keepRecording) this.stopAll();
      return null;
    }

    const otherIdx: 0 | 1 = chosenIdx === 0 ? 1 : 0;
    const chosenSlot = this.slots[chosenIdx];
    const rec = chosenSlot.recorder;
    const durationSec = Math.max(0.8, Math.min(11.5, this.runElapsedSec - chosenSlot.startedAtRunSec));

    if (!rec || rec.state === 'inactive') {
      if (!keepRecording) this.stopAll();
      return null;
    }

    // Detach chosen slot so we can safely restart or stop the other slot immediately
    const chunks = chosenSlot.chunks;
    const resolvedMime = rec.mimeType || this.mimeType || 'video/webm';
    chosenSlot.recorder = null;
    chosenSlot.active = false;
    chosenSlot.chunks = [];

    if (keepRecording) {
      if (!this.slots[otherIdx].active) {
        this.startSlot(otherIdx);
      }
      this.startSlot(chosenIdx);
    } else {
      this.discardSlot(otherIdx);
      this.isRunning = false;
    }

    return new Promise<HighlightClip | null>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        rec.ondataavailable = null;
        rec.onstop = null;
        const blob = new Blob(chunks, { type: resolvedMime });
        if (blob.size < 1024) {
          resolve(null);
          return;
        }
        const url = URL.createObjectURL(blob);
        resolve({
          id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          url,
          mimeType: resolvedMime,
          sizeBytes: blob.size,
          durationSec: Number(durationSec.toFixed(1)),
          level: meta.level,
          levelName: meta.levelName,
          biomeName: meta.biomeName,
          vehicleName: meta.vehicleName,
          won: meta.won,
          peakSpeedKmh: meta.peakSpeedKmh,
          jumpsCount: meta.jumpsCount,
          nearMisses: meta.nearMisses,
          capturedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          savedToReel: Boolean(meta.savedToReel),
        });
      };

      const timeoutId = window.setTimeout(finish, 750);
      rec.onstop = () => {
        window.clearTimeout(timeoutId);
        finish();
      };

      try {
        if (rec.state === 'paused') rec.resume();
        rec.requestData();
        rec.stop();
      } catch {
        window.clearTimeout(timeoutId);
        finish();
      }
    });
  }

  public stopAll(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.discardSlot(0);
    this.discardSlot(1);
  }

  public dispose(): void {
    this.stopAll();
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }
}

export function downloadHighlightClip(clip: HighlightClip): void {
  const ext = clip.mimeType.includes('mp4') ? 'mp4' : 'webm';
  const a = document.createElement('a');
  a.href = clip.url;
  a.download = `ladakh-rush-lv${clip.level}-highlight.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
