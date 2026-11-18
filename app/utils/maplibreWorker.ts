import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// maplibre-gl 6 looks for its worker file next to its own module, which the
// Vite bundle does not keep, so point it at the worker Vite emits. Import this
// module (for its side effect) before any map is created.
setWorkerUrl(workerUrl);
