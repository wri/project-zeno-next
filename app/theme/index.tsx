import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineRecipe,
} from "@chakra-ui/react";
import globalCss from "@/app/theme/globalCss";

export const headingRecipe = defineRecipe({
  base: {
    color: "neutral.900",
    _dark: {
      color: "neutral.200",
    },
  },
});

const defaultColors = defaultConfig?.theme?.tokens?.colors ?? {};

export const config = defineConfig({
  globalCss,
  theme: {
    recipes: {
      heading: headingRecipe,
    },
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
          100: { value: "#D7DFF2" },
          200: { value: "#AFBFE6" },
          300: { value: "#7898D7" },
          400: { value: "#3361C0" },
          500: { value: "#0041B1" },
          600: { value: "#0A3785" },
          700: { value: "#002C6C" },
          800: { value: "#022456" },
          900: { value: "#0E1E3C" },
          950: { value: "#000828" },
        },
        neutral: {
          50: { value: "#FFFFFF" },
          100: { value: "#FFFFFF" },
          200: { value: "#F4F5F7" },
          300: { value: "#E1E2E6" },
          400: { value: "#B2B7BD" },
          500: { value: "#666E7B" },
          600: { value: "#394048" },
          700: { value: "#282D33" },
          800: { value: "#212629" },
          900: { value: "#13171A" },
          950: { value: "#02070B" },
        },
        secondary: {
          50: { value: "#fcfee7" },
          100: { value: "#F8F8D6" },
          200: { value: "#F0F4B4" },
          300: { value: "#E2ED7D" },
          400: { value: "#CAD470" },
          500: { value: "#9CA25A" },
          600: { value: "#7B8044" },
          700: { value: "#5B5F3A" },
          800: { value: "#42442C" },
          900: { value: "#323625" },
          950: { value: "#242e05" },
        },
        cyan: { ...defaultColors.cyan, 500: { value: "#01B9F3" } },
        indigo: { 500: { value: "#6F6FDF" } },
        purple: { ...defaultColors.purple, 500: { value: "#BA4AFF" } },
        pink: { ...defaultColors.pink, 500: { value: "#F26798" } },
        red: { ...defaultColors.red, 500: { value: "#FF452C" } },
        orange: { ...defaultColors.orange, 500: { value: "#FF9916" } },
        yellow: { ...defaultColors.yellow, 500: { value: "#FFD80B" } },
        green: { ...defaultColors.green, 500: { value: "#00A651" } },
        lime: {
          100: { value: "#F7FBD9" },
          400: { value: "#E3F37F" },
        },
        mint: {
          50: { value: "#e2fff8" },
          100: { value: "#b6fde9" },
          200: { value: "#89fadc" },
          300: { value: "#5cf2cf" },
          400: { value: "#35eac2" },
          500: { value: "#00DCA7" },
          600: { value: "#00b086" },
          700: { value: "#008465" },
          800: { value: "#005a45" },
          900: { value: "#003126" },
          950: { value: "#001a14" },
        },
        berenjena: {
          50: { value: "#fbe9f7" },
          100: { value: "#efcde5" },
          200: { value: "#e2b2d2" },
          300: { value: "#d596bf" },
          400: { value: "#c57aac" },
          500: { value: "#895277" },
          600: { value: "#9b6488" },
          700: { value: "#734563" },
          800: { value: "#4e2f44" },
          900: { value: "#2a1a25" },
          950: { value: "#170e14" },
        },
      },
      animations: {
        fillWidth: { value: "fillWidth 10s linear infinite" },
      },
      gradients: {
        LCLGradientLight: {
          value: "linear-gradient(107deg, #CCE2FF 5.2%, #E0F1FA 14.44%, #F8FCE4 69.9%)",
          },
        LCLGradientDark: {
          value: "linear-gradient(107deg, #1A2B7A 5.2%, #2B8DB8 48%, #5f8b2f 97%)",
        },
      },
    },
    semanticTokens: {
      gradients: {
        brandGradient: {
          value: {
            _light: "{gradients.LCLGradientLight}",
            _dark: "{gradients.LCLGradientDark}",
          },
        },
      },
      colors: {
        bg: {
          DEFAULT: {
            value: { _light: "{colors.white}", _dark: "{colors.neutral.800}" },
          },
          subtle: {
            value: {
              _light: "{colors.neutral.200}",
              _dark: "{colors.neutral.950}",
            },
          },
          muted: {
            value: {
              _light: "{colors.neutral.300}",
              _dark: "{colors.neutral.900}",
            },
          },
          emphasized: {
            value: {
              _light: "{colors.neutral.400}",
              _dark: "{colors.neutral.800}",
            },
          },
          inverted: {
            value: { _light: "{colors.neutral.900}", _dark: "{colors.neutral.50}" },
          },
          panel: {
            value: { _light: "{colors.neutral.50}", _dark: "{colors.neutral.950}" },
          },
          error: {
            value: { _light: "{colors.red.50}", _dark: "{colors.red.950}" },
          },
          warning: {
            value: {
              _light: "{colors.orange.50}",
              _dark: "{colors.orange.950}",
            },
          },
          success: {
            value: { _light: "{colors.green.50}", _dark: "{colors.green.950}" },
          },
          info: {
            value: { _light: "{colors.blue.50}", _dark: "{colors.blue.950}" },
          },
        },
        fg: {
          DEFAULT: {
            value: {
              _light: "{colors.neutral.800}",
              _dark: "{colors.neutral.50}",
            },
          },
          muted: {
            value: {
              _light: "{colors.neutral.600}",
              _dark: "{colors.neutral.400}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.neutral.400}",
              _dark: "{colors.neutral.500}",
            },
          },
          inverted: {
            value: {
              _light: "{colors.neutral.50}",
              _dark: "{colors.neutral.900}",
            },
          },
          error: {
            value: { _light: "{colors.red.500}", _dark: "{colors.red.400}" },
          },
          warning: {
            value: {
              _light: "{colors.orange.600}",
              _dark: "{colors.orange.300}",
            },
          },
          success: {
            value: {
              _light: "{colors.green.600}",
              _dark: "{colors.green.300}",
            },
          },
          info: {
            value: {
              _light: "{colors.primary.600}",
              _dark: "{colors.primary.300}",
            },
          },
        },
        border: {
          DEFAULT: {
            value: {
              _light: "{colors.neutral.200}",
              _dark: "{colors.neutral.800}",
            },
          },
          muted: {
            value: {
              _light: "{colors.neutral.100}",
              _dark: "{colors.neutral.900}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.neutral.50}",
              _dark: "{colors.neutral.950}",
            },
          },
          emphasized: {
            value: {
              _light: "{colors.neutral.300}",
              _dark: "{colors.neutral.700}",
            },
          },
          inverted: {
            value: {
              _light: "{colors.neutral.800}",
              _dark: "{colors.neutral.200}",
            },
          },
          error: {
            value: { _light: "{colors.red.500}", _dark: "{colors.red.400}" },
          },
          warning: {
            value: {
              _light: "{colors.orange.500}",
              _dark: "{colors.orange.400}",
            },
          },
          success: {
            value: {
              _light: "{colors.green.500}",
              _dark: "{colors.green.400}",
            },
          },
          info: {
            value: { _light: "{colors.blue.500}", _dark: "{colors.blue.400}" },
          },
        },
        primary: {
          contrast: {
            value: {
              _light: "{colors.primary.50}",
              _dark: "{colors.primary.50}",
            },
          },
          fg: {
            value: {
              _light: "{colors.primary.700}",
              _dark: "{colors.primary.300}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.primary.100}",
              _dark: "{colors.primary.900}",
            },
          },
          muted: {
            value: {
              _light: "{colors.primary.200}",
              _dark: "{colors.primary.800}",
            },
          },
          emphasized: {
            value: {
              _light: "{colors.primary.300}",
              _dark: "{colors.primary.700}",
            },
          },
          solid: {
            value: {
              _light: "{colors.primary.500}",
              _dark: "{colors.primary.600}",
            },
          },
          focusRing: {
            value: {
              _light: "{colors.primary.500}",
              _dark: "{colors.primary.500}",
            },
          },
        },
        secondary: {
          contrast: {
            value: {
              _light: "{colors.secondary.50}",
              _dark: "{colors.secondary.50}",
            },
          },
          fg: {
            value: {
              _light: "{colors.secondary.800}",
              _dark: "{colors.secondary.300}",
            },
          },
          subtle: {
            value: {
              _light: "{colors.secondary.100}",
              _dark: "{colors.secondary.900}",
            },
          },
          muted: {
            value: {
              _light: "{colors.secondary.200}",
              _dark: "{colors.secondary.800}",
            },
          },
          emphasized: {
            value: {
              _light: "{colors.secondary.300}",
              _dark: "{colors.secondary.700}",
            },
          },
          solid: {
            value: {
              _light: "{colors.secondary.400}",
              _dark: "{colors.secondary.400}",
            },
          },
          focusRing: {
            value: {
              _light: "{colors.secondary.500}",
              _dark: "{colors.secondary.500}",
            },
          },
        },
      },
    },
  },
});

export default createSystem(defaultConfig, config);
