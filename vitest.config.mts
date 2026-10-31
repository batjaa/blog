import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["netlify/functions/__tests__/**/*.test.ts"],
    setupFiles: ["netlify/functions/__tests__/setup.ts"],
  },
});
