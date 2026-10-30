import { PLACE_PLURALS } from "../model/config";
import type { UseCaseResult } from "../model/types";
import { share } from "./format";

const MIN_PLACE_SHARE = 0.15;

/** Lower-case a name for mid-sentence use, leaving acronyms ("GHG") alone. */
function inSentence(name: string): string {
  return /^[A-Z][a-z]/.test(name)
    ? name.charAt(0).toLowerCase() + name.slice(1)
    : name;
}

/**
 * One sentence describing what a use case is made of, e.g. "Mostly
 * monitoring and causal questions, about sub-national areas, using
 * disturbance alerts and tree cover loss."
 */
export function mixSentence(useCase: UseCaseResult): string {
  const { composition, stats } = useCase;
  const types = composition.types.slice(0, 2).map((t) => t.label.toLowerCase());
  const places = composition.places
    .filter((p) => (share(p.count, stats.total) ?? 0) >= MIN_PLACE_SHARE)
    .slice(0, 2)
    .map((p) => PLACE_PLURALS[p.key.toLowerCase()] ?? p.key.toLowerCase());
  const datasets = composition.datasets
    .slice(0, 2)
    .map((d) => inSentence(d.label));
  return (
    `Mostly ${types.join(" and ")} questions` +
    (places.length ? `, about ${places.join(" and ")}` : "") +
    (datasets.length ? `, using ${datasets.join(" and ")}` : "") +
    "."
  );
}
