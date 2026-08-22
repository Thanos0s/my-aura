export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`aura-pin:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
