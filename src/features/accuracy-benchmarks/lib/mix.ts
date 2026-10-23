import { PLACE_PLURALS } from "../model/config";
import type { UseCaseResult } from "../model/types";

const MIN_PLACE_SHARE = 0.15;

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * One sentence describing what a use case is made of, e.g. "Mostly
 * monitoring and causal questions, about sub-national areas, using
 * disturbance alerts and tree cover loss."
 */
export function mixSentence(
  useCase: UseCaseResult,
  typeLabels: Readonly<Record<string, string>>
): string {
  const { composition, stats } = useCase;
  const total = stats.scored + stats.errors;
  const types = composition.types
    .slice(0, 2)
    .map((t) => (typeLabels[t.key] ?? t.key).toLowerCase());
  const places = composition.places
    .filter((p) => total > 0 && p.count / total >= MIN_PLACE_SHARE)
    .slice(0, 2)
    .map((p) => PLACE_PLURALS[p.key.toLowerCase()] ?? p.key.toLowerCase());
  const datasets = composition.datasets
    .slice(0, 2)
    .map((d) => lowerFirst(d.key));
  return (
    `Mostly ${types.join(" and ")} questions` +
    (places.length ? `, about ${places.join(" and ")}` : "") +
    (datasets.length ? `, using ${datasets.join(" and ")}` : "") +
    "."
  );
}
