import { Font } from "@react-pdf/renderer";

let registered = false;

/**
 * Registers IBM Plex Sans (400/500/700) and IBM Plex Mono (400) with
 * @react-pdf/renderer's font system.
 *
 * URLs are the raw TTF files served by fonts.gstatic.com (extracted from
 * the Google Fonts CSS endpoint, not the CSS URL itself).
 *
 * Idempotent — safe to call multiple times.
 */
export default function registerPdfFonts(): void {
  if (registered) return;

  Font.register({
    family: "IBM Plex Sans",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/ibmplexsans/v23/zYXGKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1swZSAXcomDVmadSD6llzAA.ttf",
        fontWeight: 400,
      },
      {
        src: "https://fonts.gstatic.com/s/ibmplexsans/v23/zYXGKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1swZSAXcomDVmadSD2FlzAA.ttf",
        fontWeight: 500,
      },
      {
        src: "https://fonts.gstatic.com/s/ibmplexsans/v23/zYXGKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1swZSAXcomDVmadSDDV5zAA.ttf",
        fontWeight: 700,
      },
    ],
  });

  Font.register({
    family: "IBM Plex Mono",
    src: "https://fonts.gstatic.com/s/ibmplexmono/v20/-F63fjptAgt5VM-kVkqdyU8n5ig.ttf",
  });

  // Disable word hyphenation — keeps table cells and labels cleaner
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
