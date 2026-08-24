"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VAD_CONFIG, computeRms, sanitizeForSpeech } from "@/lib/voice/vad";

/**
 * Single source of truth for the voice conversation lifecycle. Replaces the
 * old pair of independent `isRecording`/`isSpeaking` booleans (which could
 * disagree with each other) with one explicit state machine, gated by a
 * generation token so a late-resolving TTS/STT response from a superseded
 * turn can never corrupt the current one.
 */
export type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface UseVoiceConversationArgs {
  languageCode: string;
  onTranscript: (text: string) => Promise<void> | void;
  onNotice?: (message: string) => void;
}

interface RecorderWithDiscardFlag extends MediaRecorder {
  __discard?: boolean;
}

export function useVoiceConversation({ languageCode, onTranscript, onNotice }: UseVoiceConversationArgs) {
  const [voiceState, setVoiceStateRaw] = useState<VoiceState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const languageCodeRef = useRef(languageCode);
  languageCodeRef.current = languageCode;
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;

  const voiceStateRef = useRef<VoiceState>("idle");
  const setState = useCallback((next: VoiceState) => {
    voiceStateRef.current = next;
    setVoiceStateRaw(next);
  }, []);
  // Indirection so TS doesn't over-narrow `voiceStateRef.current`'s type across
  // statements that call setState() in between (a mutable ref read, not a
  // literal — its value can and does change between any two reads).
  const readVoiceState = useCallback((): VoiceState => voiceStateRef.current, []);

  // Bumped on every speak()/startListening() call. Any async callback checks
  // this is still current before touching state — stale responses are
  // discarded instead of double-firing audio or clobbering a newer turn.
  const generationRef = useRef(0);
  // speak() calls chain onto this so playback is always strictly sequential.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const recorderRef = useRef<RecorderWithDiscardFlag | null>(null);
  const rafRef = useRef<number | null>(null);
  const recSecondsTimerRef = useRef<number | null>(null);

  const speechStartedAtRef = useRef<number | null>(null);
  const silenceSinceRef = useRef<number | null>(null);
  const listenStartedAtRef = useRef<number | null>(null);
  const bargeInAboveSinceRef = useRef<number | null>(null);

  const ensureMic = useCallback(async (): Promise<boolean> => {
    if (streamRef.current && audioCtxRef.current && analyserRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.fftSize);
      setMicError(null);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Microphone unavailable";
      setMicError(msg);
      onNoticeRef.current?.(
        languageCodeRef.current.startsWith("hi")
          ? "माइक्रोफोन उपलब्ध नहीं है। आप नीचे दिए गए विकल्पों पर टैप कर सकते हैं।"
          : "Microphone not available. You can tap the quick chips or type freely."
      );
      return false;
    }
  }, []);

  const teardownMic = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (recSecondsTimerRef.current) window.clearInterval(recSecondsTimerRef.current);
    recSecondsTimerRef.current = null;
    if (recorderRef.current && recorderRef.current.state === "recording") {
      try {
        recorderRef.current.stop();
      } catch {
        // already stopped
      }
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => () => teardownMic(), [teardownMic]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  const finishRecording = useCallback((discard: boolean) => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.__discard = discard;
      recorder.stop();
    }
  }, []);

  const startListening = useCallback(async () => {
    if (readVoiceState() === "processing") return; // mic mutex
    stopSpeaking();
    const myGen = ++generationRef.current;

    const ok = await ensureMic();
    if (!ok || generationRef.current !== myGen || !streamRef.current) return;

    setState("listening");
    setRecordingSeconds(0);
    speechStartedAtRef.current = null;
    silenceSinceRef.current = null;
    listenStartedAtRef.current = performance.now();

    const chunks: BlobPart[] = [];
    const recorder: RecorderWithDiscardFlag = new MediaRecorder(streamRef.current);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recSecondsTimerRef.current = window.setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);

    const stopped = new Promise<boolean>((resolve) => {
      recorder.onstop = () => resolve(Boolean(recorder.__discard));
    });

    recorder.start();
    const discard = await stopped;

    if (recSecondsTimerRef.current) {
      window.clearInterval(recSecondsTimerRef.current);
      recSecondsTimerRef.current = null;
    }
    if (recorderRef.current === recorder) recorderRef.current = null;

    if (generationRef.current !== myGen) return; // superseded by a newer turn

    if (discard || chunks.length === 0) {
      setState("idle");
      return;
    }

    const blob = new Blob(chunks, { type: "audio/webm" });
    if (blob.size < 400) {
      setState("idle");
      return;
    }

    setState("processing");
    try {
      const form = new FormData();
      form.set("audio", blob, "speech.webm");
      form.set("languageCode", languageCodeRef.current || "en-IN");
      const res = await fetch("/api/sarvam/stt", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; error?: string };
      if (generationRef.current !== myGen) return;

      const recognized = (data.text ?? "").trim();
      if (!recognized) {
        onNoticeRef.current?.(
          data.error ??
            (languageCodeRef.current.startsWith("hi")
              ? "आवाज़ नहीं सुनी गई। कृपया फिर से बोलें या नीचे दिए गए विकल्पों पर टैप करें।"
              : "No speech recognized. Please speak again or tap a quick chip below.")
        );
        setState("idle");
        return;
      }
      await onTranscriptRef.current(recognized);
    } finally {
      if (generationRef.current === myGen && readVoiceState() === "processing") {
        setState("idle");
      }
    }
  }, [ensureMic, readVoiceState, setState, stopSpeaking]);

  const stopListening = useCallback(() => {
    finishRecording(false);
  }, [finishRecording]);

  const bargeIn = useCallback(() => {
    if (readVoiceState() !== "speaking") return;
    stopSpeaking();
    setState("idle"); // leave "speaking" immediately so the VAD loop / UI update without waiting on the async mic re-acquire
    void startListening();
  }, [readVoiceState, setState, startListening, stopSpeaking]);

  const actuallySpeak = useCallback(
    async (text: string, myGen: number, onDone?: () => void) => {
      if (generationRef.current !== myGen) return;
      const clean = sanitizeForSpeech(text);
      if (!clean) {
        onDone?.();
        return;
      }
      setState("speaking");
      bargeInAboveSinceRef.current = null;

      let audioBase64: string | null = null;
      try {
        const res = await fetch("/api/sarvam/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: clean, languageCode: languageCodeRef.current || "en-IN" }),
        });
        const data = (await res.json()) as { audioBase64?: string | null };
        audioBase64 = data.audioBase64 ?? null;
      } catch {
        audioBase64 = null;
      }

      if (generationRef.current !== myGen) return;

      if (audioBase64) {
        await new Promise<void>((resolve) => {
          const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
          audioRef.current = audio;
          const finish = () => {
            if (audioRef.current === audio) audioRef.current = null;
            resolve();
          };
          audio.onended = finish;
          audio.onerror = finish;
          audio.play().catch(finish);
        });
      } else {
        // No TTS audio available (unconfigured/failed): hold for a reading-time
        // delay instead of instantly signaling "done speaking" — that instant
        // signal is what used to auto-open the mic the moment a question loaded.
        // Cut short immediately if the user barges in.
        const words = clean.split(/\s+/).filter(Boolean).length;
        const delayMs = Math.min(4000, Math.max(900, words * 150));
        const start = performance.now();
        while (performance.now() - start < delayMs) {
          if (generationRef.current !== myGen || readVoiceState() !== "speaking") return;
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      if (generationRef.current !== myGen) return;
      if (readVoiceState() === "speaking") setState("idle");
      onDone?.();
    },
    [readVoiceState, setState]
  );

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      const myGen = ++generationRef.current;
      queueRef.current = queueRef.current.then(() => actuallySpeak(text, myGen, onDone)).catch(() => {});
      return queueRef.current;
    },
    [actuallySpeak]
  );

  // VAD loop: detects barge-in while SPEAKING, and drives silence-timeout /
  // max-wait auto-stop while LISTENING. Runs continuously so it can react
  // regardless of which state we're in without re-subscribing per state.
  useEffect(() => {
    function tick() {
      rafRef.current = requestAnimationFrame(tick);
      const analyser = analyserRef.current;
      const data = dataArrayRef.current;
      if (!analyser || !data) return;
      analyser.getByteTimeDomainData(data);
      const rms = computeRms(data);
      const now = performance.now();
      const above = rms > VAD_CONFIG.voiceThreshold;

      if (readVoiceState() === "speaking") {
        if (above) {
          if (bargeInAboveSinceRef.current == null) bargeInAboveSinceRef.current = now;
          else if (now - bargeInAboveSinceRef.current >= VAD_CONFIG.bargeInSustainMs) {
            bargeInAboveSinceRef.current = null;
            bargeIn();
          }
        } else {
          bargeInAboveSinceRef.current = null;
        }
        return;
      }

      if (readVoiceState() === "listening") {
        if (above) {
          if (speechStartedAtRef.current == null) speechStartedAtRef.current = now;
          silenceSinceRef.current = null;
        } else if (speechStartedAtRef.current != null && silenceSinceRef.current == null) {
          silenceSinceRef.current = now;
        }

        const listenElapsed = listenStartedAtRef.current ? now - listenStartedAtRef.current : 0;

        if (speechStartedAtRef.current == null) {
          // Never heard any voice — this is ambient noise/silence, not an answer. Abort without ever calling STT.
          if (listenElapsed >= VAD_CONFIG.maxWaitForSpeechMs) {
            finishRecording(true);
          }
        } else {
          const spokeFor = now - speechStartedAtRef.current;
          const silentFor = silenceSinceRef.current ? now - silenceSinceRef.current : 0;
          if (
            spokeFor >= VAD_CONFIG.minSpeechDurationMs &&
            silenceSinceRef.current &&
            silentFor >= VAD_CONFIG.silenceTimeoutMs
          ) {
            finishRecording(false);
          }
        }

        if (listenElapsed >= VAD_CONFIG.maxRecordingMs) {
          finishRecording(speechStartedAtRef.current == null);
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [bargeIn, finishRecording, readVoiceState]);

  return {
    voiceState,
    isRecording: voiceState === "listening",
    isSpeaking: voiceState === "speaking",
    isProcessing: voiceState === "processing",
    recordingSeconds,
    micError,
    speak,
    startListening,
    stopListening,
    bargeIn,
    stopSpeaking,
  };
}
