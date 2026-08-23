// seed.js
import fs from "fs";
import { ConvexClient } from "convex/browser";
import { api } from "./convex/_generated/api.js";

const deploymentUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "http://127.0.0.1:3210";
const client = new ConvexClient(deploymentUrl);

const foods = JSON.parse(fs.readFileSync("./foods.json", "utf-8"));

async function seed() {
  console.log("Seeding food database to Convex...");
  try {
    await client.mutation(api.diet.addFoodItems, { items: foods });
    console.log("SUCCESS: All food items added successfully!");
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    process.exit(0);
  }
}

seed();