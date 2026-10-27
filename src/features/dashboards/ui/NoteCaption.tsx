import InsightCaption from "@/app/components/InsightCaption";
import type { NoteSource } from "../lib/widgets";

/**
 * A note's provenance caption: curated for an analysis template's fixed copy,
 * none for the owner's own words, AI-assisted for the agent's notes. The
 * curated "Learn more" text describes a data query, so a note drops the link.
 */
export default function NoteCaption({ source }: { source: NoteSource }) {
  if (source === "user") return null;
  return source === "template" ? (
    <InsightCaption curated showLearnMore={false} />
  ) : (
    <InsightCaption />
  );
}
