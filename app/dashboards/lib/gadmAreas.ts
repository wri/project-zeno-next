// Static GADM areas for the dashboards prototype.
//
// Selecting an area in the Areas pane only needs a display name (it sets the
// dashboard's AOI label), so this is a hand-picked, offline list standing in
// for a real GADM name search. `id`/`level` are illustrative — kept so the
// shape is close to a real GADM record if this is later wired to the GFW Data
// API or a backend search endpoint. Not exhaustive; representative.

export type GadmLevel = "Country" | "State / Province" | "District";

export interface GadmArea {
  /** Illustrative GADM GID (e.g. "BRA", "BRA.16_1"). */
  id: string;
  /** Display name, country-qualified for sub-national areas. */
  name: string;
  level: GadmLevel;
}

export const GADM_AREAS: GadmArea[] = [
  // Countries (ADM_0)
  { id: "BRA", name: "Brazil", level: "Country" },
  { id: "IDN", name: "Indonesia", level: "Country" },
  { id: "COD", name: "Democratic Republic of the Congo", level: "Country" },
  { id: "COL", name: "Colombia", level: "Country" },
  { id: "PER", name: "Peru", level: "Country" },
  { id: "BOL", name: "Bolivia", level: "Country" },
  { id: "MYS", name: "Malaysia", level: "Country" },
  { id: "IND", name: "India", level: "Country" },
  { id: "ESP", name: "Spain", level: "Country" },
  { id: "USA", name: "United States", level: "Country" },

  // States / provinces (ADM_1)
  { id: "BRA.16_1", name: "Paraná, Brazil", level: "State / Province" },
  { id: "BRA.1_1", name: "Acre, Brazil", level: "State / Province" },
  { id: "BRA.14_1", name: "Pará, Brazil", level: "State / Province" },
  { id: "BRA.13_1", name: "Mato Grosso, Brazil", level: "State / Province" },
  {
    id: "IDN.13_1",
    name: "Kalimantan Timur, Indonesia",
    level: "State / Province",
  },
  { id: "PER.17_1", name: "Madre de Dios, Peru", level: "State / Province" },
  { id: "COL.25_1", name: "Putumayo, Colombia", level: "State / Province" },
  {
    id: "USA.5_1",
    name: "California, United States",
    level: "State / Province",
  },
  { id: "ESP.6_1", name: "Cataluña, Spain", level: "State / Province" },

  // Districts (ADM_2)
  { id: "BRA.16.1_1", name: "Curitiba, Paraná, Brazil", level: "District" },
  {
    id: "PER.17.1_1",
    name: "Tambopata, Madre de Dios, Peru",
    level: "District",
  },
];
