/**
 * Multilingual refusal/apology needles for the non-English defer audit.
 * Applied to the *answer* text (fetched per-trace via the detail endpoint),
 * anchored to the opening of the answer — the same idea as the server's
 * English-only heuristic in project-zeno parse.py, extended per language.
 */

const NEEDLES: readonly string[] = [
  // English (mirrors the server list)
  "i can't",
  "i cannot",
  "i'm sorry",
  "i am sorry",
  "i'm unable",
  "i am unable",
  "unable to",
  "apologi",
  // Spanish
  "lo siento",
  "no puedo",
  "no es posible",
  "disculp",
  // Portuguese
  "desculpe",
  "não posso",
  "não consigo",
  "não é possível",
  "lamento",
  // French
  "désolé",
  "je ne peux pas",
  "je suis désolé",
  "impossible de",
  // German
  "es tut mir leid",
  "ich kann nicht",
  "leider kann ich",
  // Indonesian / Malay
  "maaf",
  "tidak bisa",
  "tidak dapat",
  // Italian
  "mi dispiace",
  "non posso",
  // Swahili
  "samahani",
  "siwezi",
];

/** Only the opening of the answer counts — apologies mid-answer are asides. */
const MATCH_WINDOW_CHARS = 200;

export interface RefusalMatch {
  readonly matched: boolean;
  readonly needle: string | null;
}

export function looksLikeRefusal(answer: unknown): RefusalMatch {
  const head = String(answer ?? "")
    .slice(0, MATCH_WINDOW_CHARS)
    .toLowerCase();
  if (!head.trim()) return { matched: false, needle: null };
  const needle = NEEDLES.find((n) => head.includes(n)) ?? null;
  return { matched: needle !== null, needle };
}
