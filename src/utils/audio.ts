/**
 * Audio helpers for Gemini Live API:
 * - Captures microphone input and resamples to 16kHz 16-bit PCM little-endian base64
 * - Schedules 24kHz 16-bit PCM little-endian base64 chunks gaplessly
 */

export function float32ToPcm16Base64(float32: Float32Array): string {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function downsampleFloat32(
  input: Float32Array,
  inputSampleRate: number,
  targetSampleRate = 16000
): Float32Array {
  if (inputSampleRate === targetSampleRate) return input;
  const ratio = inputSampleRate / targetSampleRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += input[j];
      count++;
    }
    output[i] = count > 0 ? sum / count : 0;
  }
  return output;
}

export function computeRmsLevel(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.min(1, Math.sqrt(sum / Math.max(1, samples.length)) * 4.5);
}

export class PcmAudioPlayer {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private onSpeakingChange?: (speaking: boolean, level: number) => void;

  constructor(onSpeakingChange?: (speaking: boolean, level: number) => void) {
    this.onSpeakingChange = onSpeakingChange;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 24000 });
      this.nextStartTime = this.ctx.currentTime;
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public enqueuePcm24kBase64(base64: string): void {
    const ctx = this.ensureContext();
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    let peak = 0;
    for (let i = 0; i < int16.length; i++) {
      const val = int16[i] / 32768;
      float32[i] = val;
      const abs = Math.abs(val);
      if (abs > peak) peak = abs;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    if (this.nextStartTime < now + 0.02) {
      this.nextStartTime = now + 0.04;
    }

    const startTime = this.nextStartTime;
    this.nextStartTime += audioBuffer.duration;

    this.activeSources.add(source);
    this.onSpeakingChange?.(true, Math.min(1, peak * 1.4));

    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0) {
        this.onSpeakingChange?.(false, 0);
      }
    };

    source.start(startTime);
  }

  public clearQueue(): void {
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {
        // already stopped
      }
    }
    this.activeSources.clear();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.nextStartTime = this.ctx.currentTime;
    }
    this.onSpeakingChange?.(false, 0);
  }

  public dispose(): void {
    this.clearQueue();
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
    this.ctx = null;
  }
}
