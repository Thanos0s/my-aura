import { defineConfig } from "vitest/config";
import path from "node:path";

// Standalone config for one-off scripts under scripts/ that aren't picked up
// by the default *.test.ts / *.spec.ts include pattern (see vitest.config.ts).
export default defineConfig({
  test: {
    environment: "node",
    include: ["scripts/**/*.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
