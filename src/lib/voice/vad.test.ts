import { describe, expect, it } from "vitest";
import { VAD_CONFIG, computeRms, sanitizeForSpeech } from "@/lib/voice/vad";

function silentBuffer(length = 32): Uint8Array {
  return new Uint8Array(length).fill(128); // 128 = zero-crossing midpoint for 8-bit PCM
}

function loudBuffer(length = 32): Uint8Array {
  const data = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    data[i] = i % 2 === 0 ? 255 : 0; // max-amplitude square wave
  }
  return data;
}

describe("computeRms", () => {
  it("returns 0 for a perfectly silent buffer", () => {
    expect(computeRms(silentBuffer())).toBe(0);
  });

  it("returns close to 1 for a max-amplitude buffer", () => {
    expect(computeRms(loudBuffer())).toBeGreaterThan(0.9);
  });

  it("returns 0 for an empty buffer instead of NaN", () => {
    expect(computeRms(new Uint8Array(0))).toBe(0);
  });

  it("silence stays below the configured voice threshold", () => {
    expect(computeRms(silentBuffer())).toBeLessThan(VAD_CONFIG.voiceThreshold);
  });

  it("loud speech-like signal clears the configured voice threshold", () => {
    expect(computeRms(loudBuffer())).toBeGreaterThan(VAD_CONFIG.voiceThreshold);
  });
});

describe("sanitizeForSpeech", () => {
  it("unwraps bracketed status tags instead of reading brackets aloud", () => {
    expect(sanitizeForSpeech("[ABHA Linked | Encounter Verified]")).toBe("ABHA Linked , Encounter Verified");
  });

  it("strips markdown emphasis and heading characters", () => {
    expect(sanitizeForSpeech("**Important:** _please_ read this #now")).toBe("Important: please read this now");
  });

  it("strips leading bullet markers", () => {
    expect(sanitizeForSpeech("- take medicine\n- drink water")).toBe("take medicine\ndrink water");
  });

  it("leaves plain natural sentences untouched", () => {
    const text = "The patient's main concern is fever, felt in the head.";
    expect(sanitizeForSpeech(text)).toBe(text);
  });
});
