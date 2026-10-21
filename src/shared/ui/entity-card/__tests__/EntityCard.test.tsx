// @vitest-environment happy-dom
/**
 * EntityCard is the one compact row behind every card in the app (panels,
 * chat, picker). GTM tracks its toggles by the switch's `data-panel` +
 * aria-label, so the analytics contract is pinned here once for every caller.
 */
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EntityCard, type EntityCardProps } from "../EntityCard";

function renderCard(props: Partial<EntityCardProps> = {}) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <EntityCard
        kind="area"
        thumbnail={null}
        title="Pará, Brazil"
        meta="Administrative area"
        {...props}
      />
    </ChakraProvider>
  );
}

const toggle = (
  over: Partial<Extract<EntityCardProps["interaction"], { mode: "toggle" }>>
): EntityCardProps["interaction"] => ({
  mode: "toggle",
  checked: false,
  onChange: vi.fn(),
  ...over,
});

const checkbox = (ariaLabel: string) =>
  within(screen.getByLabelText(ariaLabel)).getByRole(
    "checkbox"
  ) as HTMLInputElement;

/** Clicks on `document` that landed inside the switch tagged for GTM. */
async function documentClicksOnSwitch(
  selector: string,
  act_: () => Promise<void>
): Promise<number> {
  const seen: Element[] = [];
  const listener = (e: Event) => seen.push(e.target as Element);
  document.addEventListener("click", listener);
  await act_();
  document.removeEventListener("click", listener);
  return seen.filter((t) => t.closest(selector)).length;
}

describe("EntityCard — content", () => {
  it("shows the title and meta line", () => {
    renderCard();
    expect(screen.getByText("Pará, Brazil")).toBeTruthy();
    expect(screen.getByText("Administrative area")).toBeTruthy();
  });

  it("shows the kind eyebrow only with showKind", () => {
    const { unmount } = renderCard({ showKind: true });
    expect(screen.getByText("AREA")).toBeTruthy();
    unmount();

    renderCard();
    expect(screen.queryByText("AREA")).toBeNull();
  });

  it("drops the glyph from the DATA eyebrow only", () => {
    const eyebrowGlyph = (label: string) =>
      screen.getByText(label).parentElement?.querySelector("svg");

    const { unmount } = renderCard({ kind: "dataset", showKind: true });
    expect(eyebrowGlyph("DATA")).toBeNull();
    unmount();

    renderCard({ showKind: true });
    expect(eyebrowGlyph("AREA")).toBeTruthy();
  });

  it("gives an analysis one merged eyebrow for kind and verification, on every surface", () => {
    const { unmount } = renderCard({
      kind: "analysis",
      verification: "verified",
    });
    expect(screen.getByText("CURATED ANALYSIS")).toBeTruthy();
    expect(screen.queryByText("ANALYSIS")).toBeNull();
    unmount();

    renderCard({
      kind: "analysis",
      verification: "ai-generated",
      showKind: true,
    });
    expect(screen.getByText("AI-ASSISTED ANALYSIS")).toBeTruthy();
    expect(screen.queryByText("ANALYSIS")).toBeNull();
  });

  it("renders the badge and the toggle status only when passed", () => {
    const { unmount } = renderCard({
      badge: <span>VIEW ONLY</span>,
      interaction: toggle({ status: "On dashboard" }),
    });
    expect(screen.getByText("VIEW ONLY")).toBeTruthy();
    expect(screen.getByText("On dashboard")).toBeTruthy();
    unmount();

    renderCard({ interaction: toggle({}) });
    expect(screen.queryByText("VIEW ONLY")).toBeNull();
    expect(screen.queryByText("Show on map")).toBeNull();
  });

  it("is static by default: no switch, no button role", () => {
    renderCard();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("falls back to the kind's glyph when there is no thumbnail", () => {
    const { container, unmount } = renderCard({ thumbnail: undefined });
    expect(container.querySelectorAll("svg")).toHaveLength(1);
    unmount();

    const withImage = renderCard({ thumbnail: <img alt="" src="x.png" /> });
    expect(withImage.container.querySelectorAll("svg")).toHaveLength(0);
  });

  it("labels the (i) by kind, or by infoLabel", () => {
    const { unmount } = renderCard({ kind: "dataset", onInfo: vi.fn() });
    expect(
      screen.getByLabelText("Show dataset info: Pará, Brazil")
    ).toBeTruthy();
    unmount();

    renderCard({ kind: "analysis", onInfo: vi.fn() });
    expect(screen.getByLabelText("View analysis: Pará, Brazil")).toBeTruthy();
    unmount();

    renderCard({ onInfo: vi.fn(), infoLabel: "About this area" });
    expect(screen.getByLabelText("About this area: Pará, Brazil")).toBeTruthy();
  });
});

describe("EntityCard — toggle", () => {
  it("labels the switch by the action it will take (map by default)", () => {
    const { unmount } = renderCard({ interaction: toggle({}) });
    expect(checkbox("Show Pará, Brazil on map").checked).toBe(false);
    unmount();

    renderCard({ interaction: toggle({ checked: true }) });
    expect(checkbox("Hide Pará, Brazil from map").checked).toBe(true);
  });

  it("labels a dashboard switch as add / remove, and custom labels verbatim", () => {
    const { unmount } = renderCard({
      interaction: toggle({ verb: "dashboard" }),
    });
    expect(checkbox("Add Pará, Brazil to dashboard")).toBeTruthy();
    unmount();

    renderCard({
      interaction: toggle({
        checked: true,
        verb: { on: "Cancel adding Pará, Brazil to dashboard", off: "x" },
      }),
    });
    expect(checkbox("Cancel adding Pará, Brazil to dashboard")).toBeTruthy();
  });

  it("toggles when anywhere on the row is clicked", async () => {
    const onChange = vi.fn();
    renderCard({ interaction: toggle({ onChange }) });

    await act(async () => {
      fireEvent.click(screen.getByText("Administrative area"));
    });

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("toggles once (not twice) when the switch itself is clicked", async () => {
    const onChange = vi.fn();
    renderCard({ interaction: toggle({ onChange, checked: true }) });

    await act(async () => {
      fireEvent.click(checkbox("Hide Pará, Brazil from map"));
    });

    expect(onChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("does not toggle from the row while disabled", async () => {
    const onChange = vi.fn();
    renderCard({ interaction: toggle({ onChange, disabled: true }) });

    await act(async () => {
      fireEvent.click(screen.getByText("Administrative area"));
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(checkbox("Show Pará, Brazil on map").disabled).toBe(true);
  });

  it("does not toggle from the (i) or the actions", async () => {
    const onChange = vi.fn();
    const onInfo = vi.fn();
    const onLocate = vi.fn();
    renderCard({
      interaction: toggle({ onChange }),
      onInfo,
      actions: (
        <button type="button" onClick={onLocate}>
          Locate
        </button>
      ),
    });

    await act(async () => {
      fireEvent.click(screen.getByLabelText("Show area info: Pará, Brazil"));
      fireEvent.click(screen.getByRole("button", { name: "Locate" }));
    });

    expect(onInfo).toHaveBeenCalledOnce();
    expect(onLocate).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("EntityCard — link", () => {
  const link = (onClick = vi.fn()): EntityCardProps["interaction"] => ({
    mode: "link",
    onClick,
    ariaLabel: "Open dashboard",
  });

  // A native <button>, so Enter and Space come from the browser.
  it("opens from a real, labelled button", async () => {
    const onClick = vi.fn();
    renderCard({ kind: "dashboard", interaction: link(onClick) });
    const button = screen.getByRole("button", { name: "Open dashboard" });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("leaves the title readable rather than folding it into the button", () => {
    renderCard({ kind: "dashboard", interaction: link() });
    const button = screen.getByRole("button", { name: "Open dashboard" });

    expect(button.contains(screen.getByText("Pará, Brazil"))).toBe(false);
  });

  it("keeps its actions and (i) as separate controls, not inside the button", async () => {
    const onClick = vi.fn();
    const onMenu = vi.fn();
    const onInfo = vi.fn();
    renderCard({
      kind: "dashboard",
      interaction: link(onClick),
      onInfo,
      infoLabel: "Dashboard info",
      actions: (
        <button type="button" onClick={onMenu}>
          Actions
        </button>
      ),
    });
    const button = screen.getByRole("button", { name: "Open dashboard" });
    const action = screen.getByRole("button", { name: "Actions" });
    const info = screen.getByLabelText("Dashboard info: Pará, Brazil");

    expect(button.contains(action)).toBe(false);
    expect(button.contains(info)).toBe(false);
    // No wrapper takes over the role either.
    expect(button.parentElement?.closest('[role="button"]')).toBeNull();

    await act(async () => {
      fireEvent.click(action);
      fireEvent.click(info);
    });

    expect(onMenu).toHaveBeenCalledOnce();
    expect(onInfo).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("EntityCard — analytics (GTM)", () => {
  it("surfaces row and switch clicks to document as clicks on the tagged switch", async () => {
    renderCard({ interaction: toggle({ dataPanel: "areas" }) });

    const hits = await documentClicksOnSwitch(
      '[data-panel="areas"][aria-label="Show Pará, Brazil on map"]',
      async () => {
        await act(async () => {
          fireEvent.click(screen.getByText("Pará, Brazil"));
        });
        // A real pointer click lands on the switch's visible root, not its
        // visually-hidden input.
        await act(async () => {
          fireEvent.click(screen.getByLabelText("Show Pará, Brazil on map"));
        });
      }
    );

    expect(hits).toBe(2);
  });

  it("keeps the dashboard phrasing as the GTM key", async () => {
    renderCard({
      interaction: toggle({ dataPanel: "analyses", verb: "dashboard" }),
    });

    const hits = await documentClicksOnSwitch(
      '[data-panel="analyses"][aria-label="Add Pará, Brazil to dashboard"]',
      async () => {
        await act(async () => {
          fireEvent.click(screen.getByText("Pará, Brazil"));
        });
      }
    );

    expect(hits).toBe(1);
  });
});
