import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // Next's tsconfig sets `jsx: "preserve"`; the React plugin transforms JSX for
  // component/hook tests (esbuild alone honors tsconfig and leaves it untouched).
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    // Enables React Testing Library's automatic DOM cleanup between tests
    // (it registers via the global afterEach). No-op for non-RTL tests.
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["app/**/*.{ts,tsx}"],
      exclude: [
        "app/**/*.test.{ts,tsx}",
        "app/**/layout.tsx",
        "app/**/page.tsx",
        "app/**/not-found.tsx",
      ],
    },
  },
});
