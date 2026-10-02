// @vitest-environment happy-dom
/**
 * The LGMS dataset panel now carries David Gibbs' approved copy (PZB-1346):
 * his entry has no Methodology block, so the section drops for LGMS while
 * every other dataset keeps its own.
 *
 * The Data Catalog builds this modal straight from the static card
 * (`card as unknown as DatasetInfo` in CatalogPanel) rather than from an agent
 * response, and it is the only LGMS panel a regular user can open — the agent
 * hides LGMS behind the experimental profile. So the card has to carry the
 * same copy as the backend catalog entry.
 */
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { DatasetInfo } from "@/app/types/chat";
import { DATASET_CARDS } from "@/app/constants/datasets";

import { DatasetInfoModal } from "../DatasetInfoModal";

const LGMS_DATASET_ID = 12;

function renderModal(dataset: DatasetInfo) {
  render(
    <ChakraProvider value={defaultSystem}>
      <DatasetInfoModal isOpen onClose={() => {}} dataset={dataset} />
    </ChakraProvider>
  );
}

const lgmsCard = DATASET_CARDS.find((c) => c.dataset_id === LGMS_DATASET_ID);

describe("DatasetInfoModal", () => {
  it("renders no Methodology section for a dataset that declares none", () => {
    renderModal({
      dataset_id: 1,
      dataset_name: "Some dataset",
      tile_url: "",
      description: "A description",
      cautions: "A caution",
    });

    expect(screen.queryByText("Methodology")).toBeNull();
    expect(screen.getByText("Cautions")).toBeTruthy();
  });

  it("keeps the Methodology section for a dataset that declares one", () => {
    renderModal({
      dataset_id: 1,
      dataset_name: "Some dataset",
      tile_url: "",
      description: "A description",
      methodology: "How it was built",
    });

    expect(screen.getByText("Methodology")).toBeTruthy();
  });

  it("renders the summary as a lede when the dataset declares one", () => {
    renderModal({
      dataset_id: 1,
      dataset_name: "Some dataset",
      tile_url: "",
      summary: "A one-line summary",
      description: "A description",
    });

    expect(screen.getByText("A one-line summary")).toBeTruthy();
  });

  it("renders no lede when the dataset has no summary", () => {
    renderModal({
      dataset_id: 1,
      dataset_name: "Some dataset",
      tile_url: "",
      description: "A description",
    });

    expect(screen.queryByText("A one-line summary")).toBeNull();
  });
});

describe("the LGMS catalog card", () => {
  it("carries the approved copy the panel renders", () => {
    expect(lgmsCard?.summary).toBeTruthy();
    expect(lgmsCard?.description).toBeTruthy();
    expect(lgmsCard?.cautions).toBeTruthy();
    expect(lgmsCard?.citation).toBeTruthy();
  });

  it("opens with the summary lede", () => {
    renderModal(lgmsCard as unknown as DatasetInfo);

    expect(screen.getByText(lgmsCard?.summary as string)).toBeTruthy();
  });

  it("declares no methodology, matching David's entry", () => {
    expect(lgmsCard?.methodology).toBeFalsy();
  });

  it("opens with Description, Cautions and Citation but no Methodology", () => {
    renderModal(lgmsCard as unknown as DatasetInfo);

    expect(screen.getByText("Description")).toBeTruthy();
    expect(screen.getByText("Cautions")).toBeTruthy();
    expect(screen.getByText("Citation")).toBeTruthy();
    expect(screen.queryByText("Methodology")).toBeNull();
  });

  it("renders the citation sources as links", () => {
    renderModal(lgmsCard as unknown as DatasetInfo);

    const hrefs = [...document.querySelectorAll("a")].map((a) =>
      a.getAttribute("href")
    );

    expect(hrefs).toContain(
      "https://www.researchsquare.com/article/rs-10244608/v1"
    );
    expect(hrefs).toContain(
      "https://www.nature.com/articles/s41558-026-02558-4"
    );
  });
});

describe("links in catalog prose", () => {
  /**
   * The catalog writes source links as markdown, both in David's LGMS sources
   * and in older entries like tree_cover.yml. Without an `a` renderer they
   * come out the same colour as body text with no underline, and clicking one
   * navigates the app away in the same tab, losing chat state.
   */
  it("opens a source in a new tab without leaking the referrer", () => {
    renderModal({
      dataset_id: 1,
      dataset_name: "Some dataset",
      tile_url: "",
      description: "A description",
      citation:
        "Hansen et al. ([https://doi.org/10.1126/science.1244693](https://doi.org/10.1126/science.1244693))",
    });

    const link = screen.getByRole("link", {
      name: "https://doi.org/10.1126/science.1244693",
    });

    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });

  it("gives the LGMS sources the same treatment", () => {
    renderModal(lgmsCard as unknown as DatasetInfo);

    const links = [...document.querySelectorAll("a")];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    }
  });
});
