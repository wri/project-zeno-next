import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The map and dashboard used to carry separate upload validators with
 * different file types and limits (and the map's had a MultiPolygon bug).
 * These checks keep them on one implementation.
 */
const ENTRY_POINTS = [
  "app/components/UploadAreaDialog.tsx",
  "src/features/dashboards/ui/NewDashboardScreen.tsx",
];

const ENTITY_DIR = "src/entities/custom-area/";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === "__tests__") return [];
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("area upload has a single implementation", () => {
  it.each(ENTRY_POINTS)("%s renders the shared AreaUploadDialog", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src).toMatch(
      /import\s*\{[^}]*\bAreaUploadDialog\b[^}]*\}\s*from\s*"@\/src\/features\/area-upload"/
    );
    expect(src).toMatch(/<AreaUploadDialog\b/);
  });

  it("declares the upload limits and validation only in the custom-area entity", () => {
    const offenders = [...walk("app"), ...walk("src")]
      .filter((file) => /\.tsx?$/.test(file) && !file.startsWith(ENTITY_DIR))
      .filter((file) =>
        /\b(const|function)\s+(ACCEPTED_FILE_TYPES|MAX_FILE_SIZE\w*|BATCH_UPLOAD_\w+|validateArea\w*)\b/.test(
          readFileSync(file, "utf8")
        )
      );
    expect(offenders).toEqual([]);
  });
});
