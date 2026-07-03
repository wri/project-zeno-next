import type { CodeActPart } from "@/app/types/chat";

/**
 * Builds a single self-contained markdown record of how an insight was
 * generated — narrative, code, and execution output in order, plus sources —
 * so the provenance can be archived, attached to reports, or audited
 * outside the app.
 */

const PART_HEADINGS: Record<CodeActPart["type"], string> = {
  text_output: "Narrative",
  code_block: "Code",
  execution_output: "Execution output",
};

export interface ProvenanceRecordInput {
  title?: string;
  /** Parts with content already base64-decoded. */
  parts: { type: CodeActPart["type"]; content: string }[];
  sourceUrls?: string[];
  /** Injectable for deterministic tests; defaults to now. */
  exportedAt?: Date;
}

export function buildProvenanceMarkdown({
  title,
  parts,
  sourceUrls,
  exportedAt,
}: ProvenanceRecordInput): string {
  const lines: string[] = [];
  const timestamp = (exportedAt ?? new Date()).toISOString();

  lines.push(`# ${title || "Insight generation record"}`);
  lines.push("");
  lines.push(
    `> AI-assisted analysis generation record · exported ${timestamp}`
  );
  lines.push(
    "> AI models may produce incomplete or incorrect information. " +
      "Verify outputs before using them in your work."
  );

  parts.forEach((part, index) => {
    lines.push("");
    lines.push(`## Step ${index + 1} — ${PART_HEADINGS[part.type]}`);
    lines.push("");
    if (part.type === "code_block") {
      lines.push("```python");
      lines.push(part.content);
      lines.push("```");
    } else if (part.type === "execution_output") {
      lines.push("```");
      lines.push(part.content);
      lines.push("```");
    } else {
      lines.push(part.content);
    }
  });

  if (sourceUrls && sourceUrls.length > 0) {
    lines.push("");
    lines.push("## Sources");
    lines.push("");
    sourceUrls.forEach((url, index) => {
      lines.push(`${index + 1}. ${url}`);
    });
  }

  lines.push("");
  return lines.join("\n");
}

export function provenanceFilename(title: string | undefined): string {
  const slug = (title || "insight").replace(/[^a-z0-9]/gi, "_").slice(0, 80);
  return `${slug}_generation_record.md`;
}
