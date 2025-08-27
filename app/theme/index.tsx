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
      dynamicSlideLeft: {
        from: {
          transform: "translateX(var(--start-x))",
        },
        to: { transform: "translateX(var(--end-x))" },
      },
      dynamicSlideRight: {
        from: {
          transform: "translateX(var(--start-x))",
        },
        to: { transform: "translateX(var(--end-x))" },
      },
    },
    tokens: {
      fonts: {
        body: { value: "var(--font-IBMPlexSans)" },
        mono: { value: "var(--font-IBMPlexMono)" },
        heading: { value: "var(--font-IBMPlexSans)" },
      },
      colors: {
        primary: {
          50: { value: "#E0E8FF" },
          100: { value: "#CBD7FB" },
          200: { value: "#A3B8F0" },
          300: { value: "#7E98D7" },
          400: { value: "#1863DF" },
          500: { value: "#0041B1" },
          600: { value: "#003390" },
          700: { value: "#002874" },
          800: { value: "#001C59" },
          900: { value: "#00103A" },
          950: { value: "#000828" },
        },
        neutral: {
          50: {},
          100: { value: "#FFFFFF" },
          200: { value: "#F4F5F7" },
          300: { value: "#E1E2E6" },
          400: { value: "#B2B7BD" },
          500: { value: "#666E7B" },
          600: { value: "#ABA29C" },
          700: { value: "#282D33" },
          800: { value: "#221F1D" },
          900: { value: "#0F0E0D" },
          950: { value: "#212529" },
        },
        secondary: {
          50: { value: "#fcfee7" },
          100: { value: "#F8F8D6" },
          200: { value: "#F0F4B4" },
          300: { value: "#E2ED7D" },
          400: { value: "#cbe437" },
          500: { value: "#adca18" },
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
        fillWidth: { value: "fillWidth 10s linear infinite" },
      },
    },
    semanticTokens: {
      colors: {
        primary: {
          contrast: { value: "{colors.primary.100}" },
          solid: { value: "{colors.primary.500}" },
          fg: { value: "{colors.primary.700}" },
          muted: { value: "{colors.primary.100}" },
          subtle: { value: "{colors.primary.200}" },
          emphasized: { value: "{colors.primary.300}" },
          focusRing: { value: "{colors.primary.500}" },
        },
        secondary: {
          contrast: { value: "{colors.secondary.100}" },
          solid: { value: "{colors.secondary.500}" },
          fg: { value: "{colors.secondary.700}" },
          muted: { value: "{colors.secondary.100}" },
          subtle: { value: "{colors.secondary.200}" },
          emphasized: { value: "{colors.secondary.300}" },
          focusRing: { value: "{colors.secondary.500}" },
        },
      },
    },
  },
});

export default createSystem(defaultConfig, config);
