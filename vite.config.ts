import { defineConfig } from "vitest/config";
import { serveData } from "./vite/serve-data.ts";

export default defineConfig({
  plugins: [serveData()],
  test: {
    include: ["src/**/*.test.ts", "vite/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
