import { describe, expect, it } from "vitest";
import { hashCanonical, verifyChain } from "@/lib/integrity/hashChain";

describe("hash chain", () => {
  it("detects tampering when approved JSON changes without a new hash", () => {
    const previous = "0".repeat(64);
    const record = { visitId: "abc", chiefComplaint: "pain" };
    const hash = hashCanonical(record, previous);
    const mutated = { visitId: "abc", chiefComplaint: "fever" };
    expect(verifyChain(mutated, previous, hash)).toBe(false);
    expect(verifyChain(record, previous, hash)).toBe(true);
  });
});
