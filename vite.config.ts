import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  // Keeps the existing variable names in Vercel/Amplify/.env.local working.
  envPrefix: "NEXT_PUBLIC_",
  server: { port: 3000 },
  preview: { port: 3000 },
});
