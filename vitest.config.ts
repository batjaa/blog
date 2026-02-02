import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["functions/__tests__/**/*.test.ts"],
    setupFiles: ["functions/__tests__/setup.ts"],
  },
});
