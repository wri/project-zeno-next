import type { AnalysisService } from "../application/analysis-service";
import type { AnalysisSelection } from "../domain/analysis-selection";
import type { AnalysisResult } from "../domain/analysis-result";

/**
 * TEMPORARY stand-in for the real application service. Lets the feature be
 * exercised end-to-end behind `?ff=analysis` before the REST gateway + LRO
 * state machine exist. Replace with the real AnalysisService (bottom of stack).
 */
export class StubAnalysisService implements AnalysisService {
  // Default delay simulates a slow operation so the running state is visible
  // in the browser. Tests pass 0 (or use fake timers) to stay fast.
  constructor(private readonly delayMs: number = 1000) {}

  async run(selection: AnalysisSelection, signal?: AbortSignal): Promise<AnalysisResult> {
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      const id = setTimeout(resolve, this.delayMs);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(id);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true }
      );
    });
    const { area } = selection;
    return {
      id: `stub:${area.source}:${area.srcId ?? area.name}`,
      charts: [
        {
          id: "stub-chart-1",
          position: 0,
          title: `Tree cover loss — ${area.name}`,
          type: "bar",
          xAxis: "year",
          yAxis: "area_ha",
          colorField: "",
          stackField: "",
          groupField: "",
          seriesFields: ["area_ha"],
          data: [
            { year: "2020", area_ha: 148_000 },
            { year: "2021", area_ha: 162_000 },
            { year: "2022", area_ha: 175_000 },
            { year: "2023", area_ha: 191_000 },
          ],
        },
        {
          id: "stub-chart-2",
          position: 1,
          title: `Cumulative tree cover loss — ${area.name}`,
          type: "line",
          xAxis: "year",
          yAxis: "cumulative_ha",
          colorField: "",
          stackField: "",
          groupField: "",
          seriesFields: ["cumulative_ha"],
          data: [
            { year: "2020", cumulative_ha: 148_000 },
            { year: "2021", cumulative_ha: 310_000 },
            { year: "2022", cumulative_ha: 485_000 },
            { year: "2023", cumulative_ha: 676_000 },
          ],
        },
      ],
      params: {
        source: area.source,
        srcId: area.srcId,
        subtype: area.subtype,
        name: area.name,
      },
    };
  }
}
