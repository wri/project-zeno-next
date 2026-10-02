import { describe, expect, it } from "vitest";

import {
  clean,
  formatHectares,
  getBoundaryFeatureDetails,
} from "@/app/utils/boundaryFeatureDetails";

// Property bags below are trimmed copies of real features decoded from the
// GFW boundary tiles (Pará, Brazil), placeholders ("NA", "Not Reported"…)
// included as they arrive.

const gadmMunicipality = {
  gid_0: "BRA",
  name_0: "Brazil",
  gid_1: "BRA.14_1",
  name_1: "Pará",
  nl_name_1: "NA",
  gid_2: "BRA.14.120_2",
  name_2: "São Félix do Xingu",
  varname_2: "NA",
  type_2: "Município",
  engtype_2: "Municipality",
  adm_level: "2",
  isdisputed: "FALSE",
  max_level: "2",
  gfw_area__ha: 8421298.85435259,
};

const kba = {
  country: "Brazil",
  natname: "Serra dos Carajás",
  intname: "Serra dos Carajás",
  kbastatus: "confirmed",
  kbaclass: "Global",
  azestatus: "-",
  lastupdate: "2009",
  gfw_area__ha: 1223590.35616998,
};

const wdpa = {
  name_eng: "Reserva Biológica Do Tapirapé",
  name: "Reserva Biológica Do Tapirapé",
  desig: "Reserva Biológica",
  desig_eng: "Biological Reserve",
  desig_type: "National",
  iucn_cat: "Ia",
  status: "Designated",
  status_yr: 1989,
  gov_type: "Sub-national ministry or agency",
  own_type: "Not Reported",
  mang_auth: "Instituto Chico Mendes De Conservação Da Biodiversidade",
  gfw_area__ha: 99272.3204391379,
};

const landmark = {
  name: "Resex Rio Xingu",
  identity: "Community",
  form_rec: "Acknowledged by govt",
  doc_status: "Documented",
  country: "Brazil",
  category: "Reserva Extrativista",
  data_src_s: "MMA",
  gfw_area__ha: 303004.056185703,
};

describe("clean", () => {
  it.each(["NA", "Not Reported", "Not Applicable", "-", "  ", null, undefined])(
    "treats %j as missing",
    (value) => expect(clean(value)).toBeUndefined()
  );

  it("keeps and trims real values", () => {
    expect(clean("  Ia ")).toBe("Ia");
    expect(clean(1989)).toBe("1989");
  });
});

describe("formatHectares", () => {
  it("formats compactly", () => {
    expect(formatHectares(8421298.85)).toBe("8.4M ha");
    expect(formatHectares(99272.32)).toBe("99.3K ha");
  });

  it("drops non-positive and non-numeric values", () => {
    expect(formatHectares(0)).toBeUndefined();
    expect(formatHectares("abc")).toBeUndefined();
  });
});

describe("getBoundaryFeatureDetails", () => {
  it("describes a GADM unit by its own level with its parent chain", () => {
    expect(getBoundaryFeatureDetails("GADM", gadmMunicipality)).toEqual({
      kind: "Municipality",
      title: "São Félix do Xingu",
      status: undefined,
      rows: [
        { label: "Part of", value: "Pará, Brazil" },
        { label: "Local type", value: "Município" },
        { label: "Admin level", value: "2" },
        { label: "Area", value: "8.4M ha" },
      ],
      source: "GADM 4.1",
    });
  });

  it("falls back to a generic level kind and flags disputed GADM units", () => {
    const details = getBoundaryFeatureDetails("GADM", {
      name_0: "Brazil",
      name_1: "Pará",
      adm_level: "1",
      isdisputed: "TRUE",
    });

    expect(details.kind).toBe("State / province");
    expect(details.title).toBe("Pará");
    expect(details.status).toBe("Disputed");
    expect(details.rows[0]).toEqual({ label: "Part of", value: "Brazil" });
  });

  it("omits the local-name row when a KBA's names match", () => {
    const details = getBoundaryFeatureDetails("KBA", kba);

    expect(details.kind).toBe("Key Biodiversity Area");
    expect(details.status).toBe("Confirmed");
    expect(details.rows.map((r) => r.label)).toEqual([
      "Class",
      "Country",
      "Area",
      "Last updated",
    ]);
  });

  it("combines WDPA status with its year and drops placeholder fields", () => {
    const details = getBoundaryFeatureDetails("WDPA", wdpa);

    expect(details.kind).toBe("Biological Reserve");
    expect(details.status).toBe("Designated 1989");
    expect(details.rows).toContainEqual({
      label: "IUCN category",
      value: "Ia",
    });
    expect(details.rows.some((r) => r.value === "Not Reported")).toBe(false);
  });

  it("names LandMark kind and data provider", () => {
    const details = getBoundaryFeatureDetails("LandMark", landmark);

    expect(details.kind).toBe("Community land");
    expect(details.status).toBe("Acknowledged by govt");
    expect(details.source).toBe("LandMark · MMA");
  });

  it("survives a feature with no properties", () => {
    const details = getBoundaryFeatureDetails("WDPA", null);

    expect(details.title).toBe("Unnamed area");
    expect(details.status).toBeUndefined();
    expect(details.rows).toEqual([]);
  });
});
