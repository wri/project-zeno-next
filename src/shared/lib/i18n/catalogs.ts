import en from "./messages/en.json";
import es from "./messages/es.json";
import fr from "./messages/fr.json";
import id from "./messages/id.json";
import pt from "./messages/pt.json";
import zh from "./messages/zh.json";
import type { Locale } from "./locale";

/** A key of the English source catalog, e.g. `chat.input.send`. */
export type MessageKey = keyof typeof en;

/**
 * Typed loosely on purpose: a locale may lag behind en.json and fall back to
 * English at runtime. The key-parity test is what keeps them in step.
 */
export const catalogs: Record<Locale, Partial<Record<MessageKey, string>>> & {
  en: Record<MessageKey, string>;
} = { en, es, fr, pt, id, zh };
