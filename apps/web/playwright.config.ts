import { defineConfig } from "@playwright/test";

export default defineConfig({
  webServer: {
    command: "vite",
    port: 5173,
    timeout: 120_000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:5173",
  },
});

