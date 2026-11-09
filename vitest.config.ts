import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Alias "@/..." agar unit test lib bisa diimpor konsisten dengan aplikasi.
const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": root,
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
