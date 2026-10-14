// @vitest-environment happy-dom
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TermsConsentLabel } from "../TermsConsentLabel";

describe("TermsConsentLabel", () => {
  it("asks for the same four documents as the onboarding form, opening in a new tab", () => {
    const { container } = render(
      <ChakraProvider value={defaultSystem}>
        <TermsConsentLabel />
      </ChakraProvider>
    );
    expect(container.textContent).toBe(
      "I accept the Terms of Use and Global Nature Watch AI Terms of Use, and I " +
        "acknowledge the privacy practices described in the Privacy Policy and " +
        "the Global Nature Watch AI Privacy Policy."
    );
    const links = screen.getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "https://www.wri.org/about/legal/general-terms-use",
      "https://help.horizon.globalnaturewatch.org/global-nature-watch-ai-terms-of-use",
      "https://www.wri.org/about/privacy-policy",
      "https://help.horizon.globalnaturewatch.org/legal-notices/global-nature-watch-ai-privacy-notice",
    ]);
    for (const link of links) {
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });
});
