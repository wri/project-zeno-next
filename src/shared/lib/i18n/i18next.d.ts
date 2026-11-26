import type en from "./messages/en.json";

/** Types `t()` keys against the English source catalog, so a typo fails tsc. */
declare module "i18next" {
  interface CustomTypeOptions {
    keySeparator: false;
    nsSeparator: false;
    resources: { translation: typeof en };
    interpolationPrefix: "{";
    interpolationSuffix: "}";
  }
}
