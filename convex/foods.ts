import { query } from "./_generated/server";
import { v } from "convex/values";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const findImagesByKeys = query({
  args: { keys: v.array(v.string()) },
  returns: v.record(v.string(), v.union(v.string(), v.null())),
  handler: async (ctx, args) => {
    const foods = await ctx.db.query("foods").take(500);
    const bySlug = new Map<string, string>();
    for (const food of foods) {
      bySlug.set(slugify(food.name), food.imageUrl);
    }
    const out: Record<string, string | null> = {};
    for (const key of args.keys) {
      out[key] = bySlug.get(slugify(key)) ?? null;
    }
    return out;
  },
});

export const listFoods = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("foods").take(500);
  },
});
