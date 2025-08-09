import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";
import globalCss from "@/app/theme/globalCss";

export const config = defineConfig({
  globalCss,
  theme: {
    keyframes: {
      fillWidth: {
        from: { width: "0%" },
        to: { width: "100%" },
      },
    },
    tokens: {
      fonts: {
        body: { value: "IBM Plex Sans, sans-serif" },
        mono: { value: "IBM Plex Mono, monospace"},
        heading: { value: "IBM Plex Sans, sans-serif" },
      },
      colors: {
        blue: {
          50: { value: "#ebf9ff" },
          100: { value: "#d1f1ff" },
          200: { value: "#aee7ff" },
          300: { value: "#76dbff" },
          400: { value: "#35c4ff" },
          500: { value: "#07a0ff" },
          600: { value: "#007bff" },
          700: { value: "#0062ff" },
          800: { value: "#0051d7" },
          900: { value: "#0049a8" }, //primary
          950: { value: "#062d65" },
        },
        primary: {
          200: { value: "#EDF7D7" },
          300: { value: "#D4E4AF" },
          500: { value: "#9FC642" },
          600: { value: "#568F00" },
          700: { value: "#417A00" },
          800: { value: "#2F6400" },
          900: { value: "#1F4D00" },
          950: { value: "#0F2A00" },
        },
        neutral: {
          50: {},
          100: { value: "#FFFFFF" },
          200: { value: "#FCF9F6" },
          300: { value: "#F4EEE9" },
          400: { value: "#DED5CE" },
          500: { value: "#C5BCB5" },
          600: { value: "#ABA29C" },
          700: { value: "#3C3632" },
          800: { value: "#221F1D" },
          900: { value: "#0F0E0D" },
          950: { value: "#212529" },
        },
        lime: {
          50: { value: "#fcfee7" },
          100: { value: "#f7fbcc" },
          200: { value: "#eef89e" },
          300: { value: "#def066" },
          400: { value: "#cbe437" },
          500: { value: "#adca18" }, //primary
          600: { value: "#87a10f" },
          700: { value: "#667b10" },
          800: { value: "#516113" },
          900: { value: "#445215" },
          950: { value: "#242e05" },
        },
        cyan: { 500: { value: "#01B9F3" } },
        indigo: { 500: { value: "#6F6FDF" } },
        purple: { 500: { value: "#BA4AFF" } },
        pink: { 500: { value: "#F26798" } },
        red: { 500: { value: "#FF452C" } },
        orange: { 500: { value: "#FF9916" } },
        yellow: { 500: { value: "#FFD80B" } },
        mint: { 500: { value: "#00DCA7" } },
        green: { 500: { value: "#00A651" } },
        berenjena: { 500: { value: "#895277" } },
      },
      animations: {
        fillWidth: { value: "fillWidth 10s linear infinite"}
      },
    },
  },
});

export default createSystem(defaultConfig, config);
