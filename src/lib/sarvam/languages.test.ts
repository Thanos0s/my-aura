import { describe, expect, it } from "vitest";
import { detectSarvamLanguageCode } from "@/lib/sarvam/languages";

describe("detectSarvamLanguageCode", () => {
  it("falls back to en-IN when nothing is provided", () => {
    expect(detectSarvamLanguageCode(undefined)).toBe("en-IN");
    expect(detectSarvamLanguageCode([])).toBe("en-IN");
  });

  it("maps short tags and region variants onto SARVAM_LANGUAGES", () => {
    expect(detectSarvamLanguageCode("hi")).toBe("hi-IN");
    expect(detectSarvamLanguageCode("en")).toBe("en-IN");
    expect(detectSarvamLanguageCode("en-US")).toBe("en-IN");
    expect(detectSarvamLanguageCode("hi-IN")).toBe("hi-IN");
    expect(detectSarvamLanguageCode("ta-IN")).toBe("ta-IN");
  });

  it("maps Odia ISO tag or to Sarvam od-IN", () => {
    expect(detectSarvamLanguageCode("or")).toBe("od-IN");
    expect(detectSarvamLanguageCode("or-IN")).toBe("od-IN");
  });

  it("walks navigator.languages and skips unsupported tags", () => {
    expect(detectSarvamLanguageCode(["zh-CN", "fr-FR", "hi-Latn", "en-GB"])).toBe("hi-IN");
  });

  it("is case-insensitive", () => {
    expect(detectSarvamLanguageCode("HI-in")).toBe("hi-IN");
  });

  it("falls back when no tag maps", () => {
    expect(detectSarvamLanguageCode("fr-FR")).toBe("en-IN");
  });
});
