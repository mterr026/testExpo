import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/engine/**/*.ts", "src/shared/**/*.ts", "src/database/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/database/connection.ts",
        "src/database/repositories/testUtils.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    include: ["src/**/*.test.ts"],
  },
});
