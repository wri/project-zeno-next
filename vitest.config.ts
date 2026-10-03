import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

const PREBUNDLED_DEPS = [
  "@chakra-ui/react",
  "react",
  "react-dom",
  "react/jsx-runtime",
];

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
    // Every test file imports its module graph afresh, and Chakra loads as
    // hundreds of ESM files each time. Pre-bundling it (with React, so there
    // is a single React instance) cut summed import time by ~11% on the DOM
    // tests; ssr covers node-environment files, client the happy-dom ones.
    deps: {
      optimizer: {
        ssr: { enabled: true, include: PREBUNDLED_DEPS },
        client: { enabled: true, include: PREBUNDLED_DEPS },
      },
    },
    environment: "node",
    // Enables React Testing Library's automatic DOM cleanup between tests
    // (it registers via the global afterEach). No-op for non-RTL tests.
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
      exclude: [
        "app/**/*.test.{ts,tsx}",
        "app/**/layout.tsx",
        "app/**/page.tsx",
        "app/**/not-found.tsx",
        "src/**/*.test.{ts,tsx}",
      ],
    },
  },
});
