import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@robr0/design-system": path.resolve(
        import.meta.dirname,
        "src/test/design-system.tsx",
      ),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
