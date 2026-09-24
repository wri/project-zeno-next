import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";

// Same rule set eslint-config-next's core-web-vitals + typescript presets
// enabled, minus the @next/* rules.
const eslintConfig = [
  {
    ignores: [
      ".next/",
      ".claude/",
      "dist/",
      "dist-ssr/",
      "coverage/",
      "next-env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  reactHooks.configs.flat.recommended,
  prettier,
  {
    plugins: { "jsx-a11y": jsxA11y },
    settings: { react: { version: "detect" } },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "react/no-unknown-property": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-no-target-blank": "off",
      "jsx-a11y/alt-text": ["warn", { elements: ["img"], img: ["Image"] }],
      "jsx-a11y/aria-props": "warn",
      "jsx-a11y/aria-proptypes": "warn",
      "jsx-a11y/aria-unsupported-elements": "warn",
      "jsx-a11y/role-has-required-aria-props": "warn",
      "jsx-a11y/role-supports-aria-props": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-router",
              message:
                "Import routing APIs from @/src/shared/lib/router instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/shared/lib/router/index.tsx",
      "src/app/main.tsx",
      "src/app/routes.tsx",
      "src/app/entry-server.tsx",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];

export default eslintConfig;
