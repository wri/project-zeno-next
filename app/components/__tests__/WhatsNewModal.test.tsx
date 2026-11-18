// @vitest-environment happy-dom
/**
 * The What's new panel's "try it" buttons: a boundary action shows its layer
 * over faded tree cover loss and frames an area (waiting for the map when it
 * isn't loaded), a prompt action asks the assistant in a new chat (but not
 * while a response streams or the user is out of prompts), a link action
 * opens its page. Each closes the panel.
 */
import { ChakraProvider } from "@chakra-ui/react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { MapRef } from "react-map-gl/maplibre";
import { beforeEach, describe, expect, it, vi } from "vitest";

import system from "@/app/theme";
import { TREE_COVER_LOSS_DATASET_ID } from "@/app/constants/datasets";
import { openWhatsNew } from "@/app/hooks/useWhatsNew";
import useAuthStore from "@/app/store/authStore";
import useChatStore from "@/app/store/chatStore";
import useMapStore from "@/app/store/mapStore";
import useSidebarStore from "@/app/store/sidebarStore";
import {
  WHATS_NEW_FEATURES,
  type BoundaryAction,
  type LinkAction,
  type PromptAction,
  type WhatsNewFeature,
} from "../whatsNewFeatures";

const router = vi.hoisted(() => ({ pathname: "/app", push: vi.fn() }));

vi.mock("@/src/shared/lib/router", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePathname: () => router.pathname,
  useRouter: () => ({ push: router.push }),
}));

import WhatsNewModal from "../WhatsNewModal";

const boundaryFeature = WHATS_NEW_FEATURES.find(
  (f) => f.action?.kind === "boundary"
)!;
const boundary = boundaryFeature.action as BoundaryAction;
const promptFeature = WHATS_NEW_FEATURES.find(
  (f) => f.action?.kind === "prompt"
)!;
const prompt = promptFeature.action as PromptAction;
const linkFeature = WHATS_NEW_FEATURES.find((f) => f.action?.kind === "link")!;
const link = linkFeature.action as LinkAction;

async function openPanel(pathname = "/app") {
  router.pathname = pathname;
  render(
    <ChakraProvider value={system}>
      <WhatsNewModal />
    </ChakraProvider>
  );
  await act(async () => openWhatsNew());
}

async function click(el: Element) {
  await act(async () => {
    fireEvent.click(el);
  });
}

/** Expands the feature's row unless it is already open, then clicks its button. */
async function runAction(feature: WhatsNewFeature) {
  const { label } = feature.action!;
  if (!screen.queryByRole("button", { name: label })) {
    // The row's name leads with its step number.
    await click(
      screen.getByRole("button", {
        name: (name) => name.endsWith(feature.title),
      })
    );
  }
  await click(screen.getByRole("button", { name: label }));
}

const panelOpen = () =>
  screen.queryByRole("button", { name: "Close what's new" }) !== null;

/**
 * A stand-in for a loaded map's ref. Only its identity and whether its
 * container is on the page matter here: the store keeps a map's ref after
 * the map unmounts, and the container leaves the page with it.
 */
function loadedMap({ onPage }: { onPage: boolean }): MapRef {
  const container = document.createElement("div");
  if (onPage) document.body.append(container);
  return {
    getMap: () => ({ getContainer: () => container }),
  } as unknown as MapRef;
}

const firstMap = loadedMap({ onPage: true });
const nextMap = loadedMap({ onPage: true });
// Left in the store by a map that has since unmounted.
const unmountedMap = loadedMap({ onPage: false });

const button = (name: string) =>
  screen.getByRole("button", { name }) as HTMLButtonElement;

const opacityOf = (id: string) =>
  useMapStore.getState().layers.find((l) => l.id === id)?.opacity;

describe("WhatsNewModal actions", () => {
  const flyToBounds = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useChatStore.setState({ currentThreadId: null, isLoading: false });
    useAuthStore.setState({ usedPrompts: 0, totalPrompts: 10 });
    useMapStore.setState({
      mapRef: firstMap,
      selectAreaLayer: "GADM",
      flyToBounds,
      layers: [
        {
          id: "tcl",
          name: "Tree cover loss",
          type: "raster",
          visible: true,
          opacity: 1,
          datasetId: TREE_COVER_LOSS_DATASET_ID,
        },
        {
          id: "tcl-context",
          name: "Primary forest",
          type: "raster",
          visible: true,
          opacity: 1,
          datasetId: TREE_COVER_LOSS_DATASET_ID,
          parentLayerId: "tcl",
        },
      ],
    });
    useSidebarStore.setState({
      areasPanelOpen: false,
      areasPanelFilter: "mine",
    });
  });

  it("shows the boundary over faded tree cover loss, framed, on the map", async () => {
    await openPanel("/app/threads/t1");

    await runAction(boundaryFeature);

    expect(useSidebarStore.getState()).toMatchObject({
      areasPanelOpen: true,
      areasPanelFilter: "boundaries",
    });
    expect(useMapStore.getState().selectAreaLayer).toBe(boundary.layerId);
    expect(opacityOf("tcl")).toBe(0.3);
    expect(opacityOf("tcl-context")).toBe(1);
    expect(flyToBounds).toHaveBeenCalledWith(boundary.bounds);
    expect(router.push).not.toHaveBeenCalled();
    expect(panelOpen()).toBe(false);
  });

  it("returns to the live thread's map and waits for it to load", async () => {
    useChatStore.setState({ currentThreadId: "t1" });
    await openPanel("/dashboards");

    await runAction(boundaryFeature);

    expect(router.push).toHaveBeenCalledWith("/app/threads/t1");
    expect(useSidebarStore.getState().areasPanelFilter).toBe("boundaries");
    expect(useMapStore.getState().selectAreaLayer).toBe("GADM");
    expect(flyToBounds).not.toHaveBeenCalled();

    act(() => useMapStore.setState({ mapRef: nextMap }));

    expect(useMapStore.getState().selectAreaLayer).toBe(boundary.layerId);
    expect(opacityOf("tcl")).toBe(0.3);
    expect(flyToBounds).toHaveBeenCalledWith(boundary.bounds);
  });

  it("opens a new chat's map when there is no thread", async () => {
    await openPanel("/dashboards");

    await runAction(boundaryFeature);

    expect(router.push).toHaveBeenCalledWith("/app");
  });

  it("waits for the map on the map route before it has loaded", async () => {
    useMapStore.setState({ mapRef: null });
    await openPanel("/app");

    await runAction(boundaryFeature);

    expect(flyToBounds).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();

    act(() => useMapStore.setState({ mapRef: firstMap }));

    expect(flyToBounds).toHaveBeenCalledWith(boundary.bounds);
  });

  it("waits for the new map on returning to the map while it loads", async () => {
    useMapStore.setState({ mapRef: unmountedMap });
    await openPanel("/app");

    await runAction(boundaryFeature);

    expect(flyToBounds).not.toHaveBeenCalled();
    expect(useMapStore.getState().selectAreaLayer).toBe("GADM");

    act(() => useMapStore.setState({ mapRef: nextMap }));

    expect(useMapStore.getState().selectAreaLayer).toBe(boundary.layerId);
    expect(flyToBounds).toHaveBeenCalledWith(boundary.bounds);
  });

  it("keeps waiting for the new map when clicked again before it loads", async () => {
    useMapStore.setState({ mapRef: unmountedMap });
    await openPanel("/dashboards");
    await runAction(boundaryFeature);
    // The first click went to the map, whose new map is still loading.
    router.pathname = "/app";
    await act(async () => openWhatsNew());
    await runAction(boundaryFeature);

    expect(flyToBounds).not.toHaveBeenCalled();

    act(() => useMapStore.setState({ mapRef: nextMap }));

    expect(flyToBounds).toHaveBeenCalledTimes(1);
  });

  it("asks the assistant in a new chat", async () => {
    await openPanel("/app/threads/t1");

    await runAction(promptFeature);

    expect(router.push).toHaveBeenCalledTimes(1);
    const url = new URL(router.push.mock.calls[0][0], "http://localhost");
    expect(url.pathname).toBe("/app");
    expect(url.searchParams.get("prompt")).toBe(prompt.prompt);
    expect(panelOpen()).toBe(false);
  });

  it.each([
    [
      "a response is streaming",
      () => useChatStore.setState({ isLoading: true }),
    ],
    [
      "the user is out of prompts",
      () => useAuthStore.setState({ usedPrompts: 10, totalPrompts: 10 }),
    ],
  ])("disables the prompt button while %s", async (_, setUp) => {
    setUp();
    await openPanel("/app");

    await runAction(promptFeature);

    expect(button(prompt.label).disabled).toBe(true);
    expect(router.push).not.toHaveBeenCalled();
    expect(panelOpen()).toBe(true);
  });

  it("keeps the other buttons enabled while a response is streaming", async () => {
    useChatStore.setState({ isLoading: true });
    await openPanel("/app");

    await runAction(linkFeature);

    expect(router.push).toHaveBeenCalledWith(link.href);
  });

  it("opens a link action's page", async () => {
    await openPanel("/app/threads/t1");

    await runAction(linkFeature);

    expect(router.push).toHaveBeenCalledWith(link.href);
    expect(panelOpen()).toBe(false);
  });
});
