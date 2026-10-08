// @vitest-environment happy-dom
/**
 * On non-HTTPS origins (e.g. S3 previews) navigator.clipboard is missing, so
 * copy actions must fall back to document.execCommand("copy"): components via
 * Chakra's useClipboard, exportToAI via its own fallback.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useClipboard } from "@chakra-ui/react";
import type { InsightWidget } from "@/app/types/chat";
import { exportToAI } from "@/app/utils/exportToAI";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let copied: string[];

beforeEach(() => {
  copied = [];
  // As on an insecure origin: no Clipboard API.
  vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
  // Both fallbacks copy a temporary node holding the text.
  document.execCommand = vi.fn(() => {
    const node = document.body.lastChild as HTMLTextAreaElement | null;
    copied.push(node?.value ?? node?.textContent ?? "");
    return true;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("copy without the Clipboard API", () => {
  it("copies a value passed to the hook", async () => {
    const { result } = renderHook(() =>
      useClipboard({ value: "selected text" })
    );
    act(() => result.current.copy());
    await waitFor(() => expect(copied).toEqual(["selected text"]));
  });

  it("copies the AI export prompt for providers without URL pre-fill", () => {
    vi.stubGlobal("open", vi.fn());
    const widget = {
      title: "Tree cover loss",
      data: [{ year: 2020, loss: 12 }],
    } as unknown as InsightWidget;

    expect(exportToAI(widget, "gemini")).toBe("clipboard");
    expect(copied).toHaveLength(1);
    expect(copied[0]).toContain("I was exploring geospatial data");
  });
});
