/**
 * Amplitude-based voice activity detection. Deliberately language-agnostic
 * (measures audio energy, not speech content) so it works the same across
 * all 10 Indic languages the kiosk supports — unlike browser SpeechRecognition,
 * whose language coverage outside en-* is inconsistent.
 */

export const VAD_CONFIG = {
  /** Normalized RMS (0..1) above which audio counts as "voice", not ambient noise. */
  voiceThreshold: 0.02,
  /** While the bot is SPEAKING, mic level must stay above threshold this long to count as a deliberate barge-in (filters coughs/taps). */
  bargeInSustainMs: 200,
  /** Captured clips shorter than this are discarded as accidental taps/noise blips — never sent to STT. */
  minSpeechDurationMs: 300,
  /** Auto-stop recording after this much continuous silence following detected speech (natural end-of-utterance). */
  silenceTimeoutMs: 1200,
  /** If no speech ever crosses the threshold after listening starts, auto-abort with no STT call — kills phantom ambient-noise triggers. */
  maxWaitForSpeechMs: 4000,
  /** Hard safety cap on a single recording, regardless of VAD state. */
  maxRecordingMs: 15000,
} as const;

/** Normalized RMS (0..1) volume from an AnalyserNode's byte time-domain buffer. */
export function computeRms(data: Uint8Array): number {
  if (data.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    const centered = ((data[i] ?? 128) - 128) / 128;
    sumSquares += centered * centered;
  }
  return Math.sqrt(sumSquares / data.length);
}

/** Strips markdown-ish artifacts before text is sent to TTS, so spoken output never reads bullet marks, brackets, or headers aloud. */
export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/\[([^\]]*)\]/g, "$1")
    .replace(/[*#`_~]/g, "")
    .replace(/\|/g, ",")
    .replace(/^[\s]*[-•]\s+/gm, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
