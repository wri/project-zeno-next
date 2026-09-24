import type { LayerId } from "@/app/types/map";

/**
 * Display model for a hovered boundary feature: the eyebrow kind, title,
 * optional status pill, label/value rows and data source. Built from the raw
 * vector-tile properties, whose keys differ per boundary layer.
 */
export interface BoundaryFeatureDetails {
  /** Short kind shown after "AREA ·" — e.g. "Municipality", "Biological Reserve". */
  kind: string;
  title: string;
  status?: string;
  rows: { label: string; value: string }[];
  source: string;
}

type Props = Record<string, unknown>;

/** Values the source datasets use to mean "no data". */
const PLACEHOLDERS = new Set([
  "",
  "-",
  "na",
  "n/a",
  "null",
  "none",
  "not reported",
  "not applicable",
]);

/** A trimmed display string, or undefined for missing/placeholder values. */
export function clean(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return PLACEHOLDERS.has(text.toLowerCase()) ? undefined : text;
}

const HECTARES = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** "8.4M ha"; undefined for non-positive or non-numeric input. */
export function formatHectares(value: unknown): string | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return `${HECTARES.format(n)} ha`;
}

function capitalise(text: string | undefined): string | undefined {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : undefined;
}

/** Drop rows whose value is missing so the tooltip only shows real data. */
function rows(
  entries: [string, string | undefined][]
): BoundaryFeatureDetails["rows"] {
  return entries.flatMap(([label, value]) => (value ? [{ label, value }] : []));
}

const GADM_LEVEL_KIND = ["Country", "State / province", "District"];

function gadmDetails(p: Props): BoundaryFeatureDetails {
  const level = Math.max(0, Math.min(2, Number(p.adm_level) || 0));
  const names = [0, 1, 2].map((l) => clean(p[`name_${l}`]));
  const parents = names.slice(0, level).filter(Boolean).reverse().join(", ");

  return {
    kind: clean(p[`engtype_${level}`]) ?? GADM_LEVEL_KIND[level],
    title: names[level] ?? clean(p.country) ?? "Unnamed area",
    status:
      clean(p.isdisputed)?.toUpperCase() === "TRUE" ? "Disputed" : undefined,
    rows: rows([
      ["Part of", parents || undefined],
      ["Local type", clean(p[`type_${level}`])],
      ["Admin level", String(level)],
      ["Area", formatHectares(p.gfw_area__ha)],
    ]),
    source: "GADM 4.1",
  };
}

function kbaDetails(p: Props): BoundaryFeatureDetails {
  const intName = clean(p.intname);
  const natName = clean(p.natname);
  return {
    kind: "Key Biodiversity Area",
    title: intName ?? natName ?? "Unnamed area",
    status: capitalise(clean(p.kbastatus)),
    rows: rows([
      ["Local name", natName !== intName ? natName : undefined],
      ["Class", clean(p.kbaclass)],
      ["Country", clean(p.country)],
      ["Area", formatHectares(p.gfw_area__ha)],
      ["Last updated", clean(p.lastupdate)],
    ]),
    source: "BirdLife International",
  };
}

function wdpaDetails(p: Props): BoundaryFeatureDetails {
  const status = clean(p.status);
  const year = Number(p.status_yr) > 0 ? String(p.status_yr) : undefined;
  const iucn = clean(p.iucn_cat);
  return {
    kind: clean(p.desig_eng) ?? clean(p.desig) ?? "Protected area",
    title: clean(p.name_eng) ?? clean(p.name) ?? "Unnamed area",
    status: status && year ? `${status} ${year}` : status,
    rows: rows([
      ["IUCN category", iucn],
      ["Governance", clean(p.gov_type)],
      ["Managed by", clean(p.mang_auth)],
      ["Designation", clean(p.desig_type)],
      ["Area", formatHectares(p.gfw_area__ha)],
    ]),
    source: "World Database on Protected Areas",
  };
}

function landmarkDetails(p: Props): BoundaryFeatureDetails {
  const identity = clean(p.identity);
  const provider = clean(p.data_src_s) ?? clean(p.data_src);
  return {
    kind: identity ? `${identity} land` : "Indigenous & community land",
    title: clean(p.name) ?? "Unnamed area",
    status: clean(p.form_rec),
    rows: rows([
      ["Category", clean(p.category)],
      ["Documentation", clean(p.doc_status)],
      ["Country", clean(p.country)],
      ["Area", formatHectares(p.gfw_area__ha)],
    ]),
    source: provider ? `LandMark · ${provider}` : "LandMark",
  };
}

const BUILDERS: Record<LayerId, (p: Props) => BoundaryFeatureDetails> = {
  GADM: gadmDetails,
  KBA: kbaDetails,
  WDPA: wdpaDetails,
  LandMark: landmarkDetails,
};

/** Tooltip details for a feature hovered on the given boundary layer. */
export function getBoundaryFeatureDetails(
  layerId: LayerId,
  properties: Props | null | undefined
): BoundaryFeatureDetails {
  return BUILDERS[layerId](properties ?? {});
}
