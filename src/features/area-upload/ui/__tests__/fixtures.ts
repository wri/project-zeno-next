export const SQUARE_GEOJSON = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [30, 10],
        [30, 10.5],
        [30.5, 10.5],
        [30.5, 10],
        [30, 10],
      ],
    ],
  },
};

export function geoJsonFile(content: unknown = SQUARE_GEOJSON): File {
  return new File([JSON.stringify(content)], "area.geojson");
}

export function fileOfSize(name: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name);
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}
