/**
 * Info-dialog text for Planet imagery (the legend's info button on a Planet
 * capture), from the Planet dataset metadata entry (2026-10-06). The backend's
 * show-imagery-planet skill describes the same product to the agent, so the
 * two have to stay in step.
 *
 * The citation keeps its "[year of image]" and "[DATE]" placeholders; the
 * dialog fills them (see imageryCitation).
 */

export type ImageryMetadataFact = { label: string; value: string };

export type ImageryMetadata = {
  title: string;
  facts: ImageryMetadataFact[];
  /** Markdown. */
  overview: string;
  citation: string;
};

const paragraphs = (items: string[]) => items.join("\n\n");
const link = (url: string) => `[${url}](${url})`;

const PLANET_BLOG =
  "https://www.globalforestwatch.org/blog/data-and-tools/planet-imagery-changes-gfw/";

export const PLANET_METADATA: ImageryMetadata = {
  title: "Planet Satellite Imagery",
  facts: [
    {
      label: "Function",
      value:
        "High-resolution satellite imagery is essential for providing context to other data layers available on GFW, such as interpreting drivers of tree cover change. It is commonly used to identify possible causes of near-real-time disturbance alerts. The imagery can also be used in validation protocols, to assess accuracy of land/forest cover and change products.",
    },
    { label: "Resolution", value: "4.77m" },
    {
      label: "Geographic coverage",
      value: "Forest disturbance alert locations in the Amazon biome",
    },
    { label: "Source", value: "Planet Labs." },
    { label: "Frequency of updates", value: "Monthly" },
    { label: "Date of content", value: "September 2020 to present" },
  ],
  overview: paragraphs([
    "Through a partnership with Bezos Earth Fund and the Andes Amazon Fund and Planet, anyone can now access Planet’s high-resolution, analysis-ready monthly mosaics (single images that combine multiple satellite images) in disturbed vegetation in the Amazon in order to help reduce and reverse the loss of tropical forests, combat climate change, conserve biodiversity, and facilitate sustainable development. The natural color images use information from visible light (red, green and blue) to show the earth’s surface as it would appear to the human eye.",
    "The coverage of this product is the Amazon biome according to RAISG and is updated monthly, with images available from September 2020.",
    "The product is available to view when users are zoomed into the map over the Amazon – if you cannot see the images, please zoom in further.",
    "The product can be viewed in areas where there's recent vegetation disturbance. We show the product in areas where there's been alerts in the last year – and this is updated monthly on a rolling basis. This means imagery is available underneath alerts only and not in other areas where there's e.g. stable forest, cropland, and urban areas. Mosaics for the previous month, are available from around the 15th of the following month, and alerts from the previous year are masked. Therefore, imagery underneath alerts which occurred between the 1 and 15th of the month cannot be viewed. This process starts with the first new mosaic of the program, which is June 2026, and this mosaic for June plus all previous mosaics will be masked to show imagery under alerts from the past 2 years, in this case 1 June 2024 – 31 May 2026. Moving forward, all historic mosaics will also show imagery where new alerts occur – thus the mask will be updated for historic imagery every month. Monthly mosaics are available back to September 2020.",
    "We use our Integrated Disturbance Alert product, and include a 500 m buffer around all alert pixels, allowing users to see the context of the alerts, and allowing for any shift between the imagery and the alerts. The buffer uses a dilation approach, which results in a 1 km circle around each pixel. Single pixels with low confidence are removed (thus high and highest single pixels are included).",
    "If users want to see additional context, we recommend users explore Planet in combination with Sentinel-2 imagery available on GNW.",
    "One of the most frequent use cases of satellite imagery is that it informs users who are investigating vegetation disturbances (alert data) for illegal activities such as logging or conversion to agriculture. Because of the high costs associated with accessing imagery for the whole of the Amazon basin, we've prioritized locations where potential disturbances have occurred.",
    `Read our blog for more information on access to Planet data through GNW: ${link(PLANET_BLOG)}`,
  ]),
  citation:
    "Image © [year of image] Planet Labs Inc. Accessed through Global Nature Watch Horizon on [DATE]. www.horizon.globalnaturewatch.org",
};
