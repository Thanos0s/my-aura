import { createHash } from "node:crypto";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function hashCanonical(record: unknown, previousHash: string): string {
  const payload = `${previousHash}\n${stableStringify(record)}`;
  return createHash("sha256").update(payload).digest("hex");
}

export function verifyChain(
  record: unknown,
  previousHash: string,
  expectedHash: string
): boolean {
  return hashCanonical(record, previousHash) === expectedHash;
}

export const GENESIS_HASH = "0".repeat(64);
