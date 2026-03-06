/**
 * Extract tabular rows from an AnalyticsDataItem's `data` field.
 *
 * The analytics API returns data in one of these shapes:
 *
 * 1. Row-oriented: `{ data: [ {col1: v, col2: v}, ... ] }`
 *    → item.data.data is an array of row objects.
 *
 * 2. Columnar (pandas dict-style):
 *    ```
 *    {
 *      "aoi_id": ["BRA", "ESP", ...],
 *      "area_ha": [123.4, 567.8, ...],
 *      "dataset_name": "Tree cover gain",   // scalar metadata
 *      "start_date": "2000-01-01",          // scalar metadata
 *      ...
 *    }
 *    ```
 *    Each array-valued key is a column, all arrays have the same length.
 *    Scalar keys (dataset_name, start_date, etc.) are metadata, not columns.
 *
 * 3. The `data` field itself is an array of row objects (no wrapper).
 *
 * This function normalises all three into an array of row objects.
 */
export function extractRows(
  data: unknown,
): Record<string, unknown>[] {
  if (!data || typeof data !== "object") return [];

  // Shape 1: data.data is an array of row objects
  const asRecord = data as Record<string, unknown>;
  if (Array.isArray(asRecord.data)) {
    // But only if the elements are objects (not primitives)
    if (
      asRecord.data.length > 0 &&
      typeof asRecord.data[0] === "object" &&
      asRecord.data[0] !== null &&
      !Array.isArray(asRecord.data[0])
    ) {
      return asRecord.data as Record<string, unknown>[];
    }
  }

  // Shape 3: data itself is an array of row objects
  if (Array.isArray(data)) {
    if (
      data.length > 0 &&
      typeof data[0] === "object" &&
      data[0] !== null &&
      !Array.isArray(data[0])
    ) {
      return data as Record<string, unknown>[];
    }
    return [];
  }

  // Shape 2: columnar format — detect by finding array-valued keys
  // with matching lengths.
  const entries = Object.entries(asRecord);
  const arrayEntries = entries.filter(
    ([, v]) => Array.isArray(v) && (v as unknown[]).length > 0,
  );

  if (arrayEntries.length === 0) return [];

  // All column arrays must have the same length
  const lengths = arrayEntries.map(([, v]) => (v as unknown[]).length);
  const rowCount = lengths[0];
  const allSameLength = lengths.every((l) => l === rowCount);

  if (!allSameLength) {
    // Not a clean columnar format — bail out
    return [];
  }

  // Transpose columnar → row-oriented
  const columnNames = arrayEntries.map(([k]) => k);
  const columnArrays = arrayEntries.map(([, v]) => v as unknown[]);

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, unknown> = {};
    for (let c = 0; c < columnNames.length; c++) {
      row[columnNames[c]] = columnArrays[c][i];
    }
    rows.push(row);
  }

  return rows;
}
