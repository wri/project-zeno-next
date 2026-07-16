/**
 * Pure text transforms behind the text-widget edit toolbar. Each takes the
 * textarea's current value + selection and returns the new value with the
 * selection to restore, so the component stays a thin DOM shim (set value,
 * re-apply selection) and the fiddly offset maths is unit-tested here.
 *
 * The editor is raw markdown (no rich-text dependency): inline buttons wrap the
 * selection, block buttons rewrite whole lines. Block buttons strip an existing
 * marker of the same family first, so switching H1→H2 or list→list replaces
 * rather than stacking `## # …`.
 */
export interface EditResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Wrap the selection in `before`/`after` (e.g. `**`…`**`). With no selection,
 * inserts `placeholder` between the markers and selects it, so a lone click
 * gives the user something to type over.
 */
export function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string
): EditResult {
  const selected = value.slice(start, end) || placeholder;
  return {
    value: value.slice(0, start) + before + selected + after + value.slice(end),
    selectionStart: start + before.length,
    selectionEnd: start + before.length + selected.length,
  };
}

/**
 * Rewrite every line touched by the selection via `apply`, then select the
 * whole rewritten block. Expands the selection out to full line boundaries
 * first so a caret mid-line still transforms its line.
 */
export function prefixLines(
  value: string,
  start: number,
  end: number,
  apply: (line: string, index: number) => string
): EditResult {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const nextNewline = value.indexOf("\n", end);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;
  const transformed = value
    .slice(lineStart, lineEnd)
    .split("\n")
    .map(apply)
    .join("\n");
  return {
    value: value.slice(0, lineStart) + transformed + value.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + transformed.length,
  };
}

const LIST_MARKER = /^(?:[-*+]\s+|\d+\.\s+)/;

/** Set the line to an ATX heading of `level`, replacing any existing heading. */
export const headingApply =
  (level: number) =>
  (line: string): string =>
    "#".repeat(level) + " " + line.replace(/^#{1,6}\s+/, "");

/** Turn each line into a `- ` bullet, replacing any existing list marker. */
export const bulletApply =
  () =>
  (line: string): string =>
    "- " + line.replace(LIST_MARKER, "");

/** Number each line `1. `, `2. `, … replacing any existing list marker. */
export const numberApply =
  () =>
  (line: string, index: number): string =>
    `${index + 1}. ` + line.replace(LIST_MARKER, "");
