import { useSyncExternalStore } from "react";
import { getLocale, setLocale, subscribeLocale, type Locale } from "./locale";

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, () => "en");
}

export { setLocale };
