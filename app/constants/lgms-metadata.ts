/**
 * Data Catalog info-modal text for the LGMS dataset family, from David Gibbs'
 * approved dataset-menu entries (2026-09-17, PZB-1346). The net-AFOLU entry is
 * also mirrored in the backend catalog (`land_ghg_inventory.yml` in
 * project-zeno); the sector layers are client-only. The modal builds from these
 * cards rather than from an agent response, so the two have to stay in step.
 *
 * His entries have no Methodology block — the methodology sentence closes each
 * overview instead — so these cards deliberately declare none.
 */

export type LgmsLayerMetadata = {
  summary: string;
  description: string;
  cautions: string;
  citation: string;
};

const paragraphs = (items: string[]) => items.join("\n\n");
const numbered = (items: string[]) =>
  items.map((item, i) => `${i + 1}. ${item}`).join("\n");
const bullets = (items: string[]) => items.join("\n");
const link = (url: string) => `[${url}](${url})`;

const LGMS_PREPRINT = "https://www.researchsquare.com/article/rs-10244608/v1";

const SOURCE_VEGETATION = `- Vegetation: Gibbs et al. under review (preprint: ${link(LGMS_PREPRINT)})`;
const SOURCE_MINERAL_SOIL = `- Mineral soil: Gibbs et al. under review (preprint: ${link(LGMS_PREPRINT)}), Hengl et al. 2026 (${link("https://essd.copernicus.org/articles/18/989/2026/")}, with summary at ${link("https://landcarbonlab.org/insights/soil-carbon-dynamics-maps/")})`;
const SOURCE_ORGANIC_SOIL =
  "- Organic soil: Glen et al. 2026 (link available upon publication)";
const SOURCE_CROPLAND = `- Cropland management: Cao et al. 2026 (${link("https://www.nature.com/articles/s41558-026-02558-4")}), with additional explanation at ${link("https://www.wri.org/insights/climate-emissions-growing-crops")}`;
const SOURCE_LIVESTOCK = "- Livestock: Bilotto et al. in prep";

export const LGMS_NET_FLUX_METADATA: LgmsLayerMetadata = {
  summary: "Average annual net GHG flux from land use and agriculture",
  description: paragraphs([
    "This dataset maps the average annual net GHG flux from land use and agriculture for 2016-2024. Net flux is the difference between gross emissions (positive) and gross removals (negative). It integrates five datasets: growth and disturbance of vegetation (trees, shrubs, grasses, crops), carbon stock change in mineral soil (0-30 cm depth), disturbance of organic soil (e.g., peat), cropland management emissions, and livestock emissions. Emissions arise from disturbance or loss of vegetation, loss of soil organic carbon in mineral soil, disturbance of organic soil, and agriculture (cropland management and livestock). Removals arise from growth of vegetation and gain of soil organic carbon in mineral soil. Emissions include CO2, CH4, and N2O; the latter two gases arise from fires, drainage of organic soil, and agriculture. Carbon pools in vegetation include aboveground, belowground, deadwood, and litter.",
    "Each constituent dataset was developed using flux-appropriate methods, then harmonized for a more complete view of land use-based fluxes. Generally speaking, constituent data sets are based on the IPCC Guidelines for National Greenhouse Gas Inventories (2019 refinement).",
    "This dataset supports monitoring the climate change impacts of land use and agriculture across spatial scales and can assist a variety of actors and organizations with decreasing land use-based emissions or increasing removals. It can be used to determine the relative contributions of land use and agriculture to land use-based GHG fluxes.",
  ]),
  cautions: numbered([
    "Values are modeled and, as such, have multiple sources of uncertainty. Users are strongly encouraged to read and fully comprehend the metadata and other available documentation prior to data use. Only uncertainty estimates for global fluxes have been calculated but they cannot be displayed at this time.",
    "Vegetation emissions, removals, and net flux are annual (2016-2024). All other datasets are not annual. Organic soil is in multi-year blocks (2016-2020 and 2021-2024). Mineral soil is the change over 2010/2015 vs. 2015-2020, with that change over that period applied to every year between 2016 and 2024. Cropland management and livestock are for 2020 but applied to all years.",
    "Land use datasets are at 30-m resolution but agriculture datasets are at 10-km resolution. The difference is due to the resolution of input datasets.",
    "Emissions and removals due to changes in vegetation and soil carbon stocks on croplands are covered in the vegetation and soil datasets, not the cropland management dataset. Likewise, emissions from land use change related to cropland (e.g., forest to crops) are in the vegetation and soil data, not the cropland management dataset.",
    "This does not distinguish between permanent and temporary loss or gain, anthropogenic and natural disturbances, or natural and planted trees. Emissions from deforestation are not currently provided. Likewise, removals due to afforestation or reforestation (active or passive) are not currently provided.",
    "These datasets cannot be used to estimate carbon stocks or densities in a given year or over a range of years.",
    "These datasets cannot be used to estimate or calculate carbon credits or offsets at the jurisdictional or project scale.",
  ]),
  citation: bullets([
    SOURCE_VEGETATION,
    SOURCE_MINERAL_SOIL,
    SOURCE_ORGANIC_SOIL,
    SOURCE_CROPLAND,
    SOURCE_LIVESTOCK,
  ]),
};

export const LGMS_LULUCF_METADATA: LgmsLayerMetadata = {
  summary:
    "Average annual net GHG flux from vegetation and soil due to land use and land-use change",
  description: paragraphs([
    "This dataset maps the average annual net GHG flux from land use and land-use change at 30-m resolution for 2016-2024. Net flux is the difference between gross emissions (positive) and gross removals (negative). It integrates three datasets: growth and disturbance of vegetation (trees, shrubs, grasses, crops), carbon stock change in mineral soil (0-30 cm depth), and disturbance of organic soil (e.g., peat). Emissions arise from disturbance or loss of vegetation, loss of soil organic carbon in mineral soil, and disturbance of organic soil. Removals arise from growth of vegetation and gain of soil organic carbon in mineral soil. Emissions include CO2, CH4, and N2O; the latter two gases arise from fires and drainage of organic soil. Carbon pools in vegetation include aboveground, belowground, deadwood, and litter.",
    "Each constituent dataset was developed using flux-appropriate methods, then harmonized for a more complete view of land use-based fluxes. Generally speaking, constituent data sets are based on multiple Earth observation data sets—each supported by field data—that have been integrated using the IPCC Guidelines for National Greenhouse Gas Inventories (2019 refinement).",
    "This dataset supports monitoring the climate change impacts of land use and land use change across spatial scales and can assist a variety of actors and organizations with decreasing land use-based emissions or increasing removals. It can be used to determine the relative contributions of vegetation, mineral soil, and organic soil to land use-based GHG fluxes.",
  ]),
  cautions: numbered([
    "Values are modeled and, as such, have multiple sources of uncertainty. Users are strongly encouraged to read and fully comprehend the metadata and other available documentation prior to data use. Only uncertainty estimates for global fluxes have been calculated but they cannot be displayed at this time.",
    "Vegetation emissions, removals, and net flux are annual (2016-2024). All other datasets are not annual. Organic soil is in multi-year blocks (2016-2020 and 2021-2024). Mineral soil is the change over 2010/2015 vs. 2015-2020, with that change over that period applied to every year between 2016 and 2024.",
    "Emissions and removals due to changes in vegetation and soil carbon stocks on croplands are covered in the vegetation and soil datasets, not the cropland management dataset. Likewise, emissions from land use change related to cropland (e.g., forest to crops) are in the vegetation and soil data, not the cropland management dataset.",
    "This does not distinguish between permanent and temporary loss or gain, anthropogenic and natural disturbances, or natural and planted trees. Emissions from deforestation are not currently provided. Likewise, removals due to afforestation or reforestation (active or passive) are not currently provided.",
    "This dataset does not include natural CH4 emissions from wetlands. CH4 emissions from disturbed organic soil are included.",
    "These datasets cannot be used to estimate carbon stocks or densities in a given year or over a range of years.",
    "These datasets cannot be used to estimate or calculate carbon credits or offsets at the jurisdictional or project scale.",
  ]),
  citation: bullets([
    SOURCE_VEGETATION,
    SOURCE_MINERAL_SOIL,
    SOURCE_ORGANIC_SOIL,
  ]),
};

export const LGMS_AGRICULTURE_METADATA: LgmsLayerMetadata = {
  summary: "GHG emissions from agriculture in 2020",
  description: paragraphs([
    "This dataset maps the GHG emissions from agriculture in 2020. It integrates two emissions datasets: cropland management emissions and livestock emissions. Cropland management includes manure application, synthetic fertilizer application, and crop residue decomposition for over 40 crops, as well as rice cultivation emissions. It is based on maps of crop extent, crop management, climate, and more. Livestock emissions includes monogastrics and ruminants, with multiple production systems for each. GHGs include CH4 and N2O. Emissions from land-use change and soil are covered in separate layers.",
    "Each constituent dataset was developed using flux-appropriate methods, then harmonized for a more complete view of land use-based fluxes. Generally speaking, constituent data sets are based on the IPCC Guidelines for National Greenhouse Gas Inventories (2019 refinement).",
    "This dataset supports monitoring the climate change impacts of agriculture across spatial scales and can assist a variety of actors and organizations with decreasing agriculture-based emissions.",
  ]),
  cautions: numbered([
    "Values are modeled and, as such, have multiple sources of uncertainty. Users are strongly encouraged to read and fully comprehend the metadata and other available documentation prior to data use. Only uncertainty estimates for global fluxes have been calculated but they cannot be displayed at this time.",
    "Emissions from vegetation and soil in croplands are covered in the vegetation and soil datasets, not the cropland management dataset. Likewise, emissions from land use change related to cropland (e.g., forest to crops) are in the vegetation and soil data, not the cropland management dataset.",
    "The constituent datasets use regional, national, and sometimes subnational data for some inputs. This results in more regionally appropriate data, but also inconsistency across regions. At the same time, some inputs are global constants, underestimating spatial heterogeneity.",
  ]),
  citation: bullets([SOURCE_CROPLAND, SOURCE_LIVESTOCK]),
};

export const LGMS_CROPLAND_METADATA: LgmsLayerMetadata = {
  summary: "GHG emissions from cropland management in 2020",
  description: paragraphs([
    "This dataset maps the GHG emissions from cropland management in 2020, including manure application, synthetic fertilizer application, and crop residue decomposition for over 40 crops, as well as rice cultivation emissions. It is based on maps of crop extent, crop management, climate, and more. GHGs include CH4 and N2O. Emissions from land-use change and soil are covered in separate layers. It was created by combining geospatial and statistical (survey) data within the methods of the IPCC Guidelines for National Greenhouse Gas Inventories (2019 refinement).",
    "This dataset supports monitoring the climate change impacts of agriculture across spatial scales and can assist a variety of actors and organizations with decreasing agriculture-based emissions.",
  ]),
  cautions: numbered([
    "Values are modeled and, as such, have multiple sources of uncertainty. Users are strongly encouraged to read and fully comprehend the metadata and other available documentation prior to data use. Only uncertainty estimates for global fluxes have been calculated but they cannot be displayed at this time.",
    "Emissions from vegetation and soil in croplands are covered in the vegetation and soil datasets, not the cropland management dataset. Likewise, emissions from land use change related to cropland (e.g., forest to crops) are in the vegetation and soil data, not the cropland management dataset.",
    "The constituent datasets use regional, national, and sometimes subnational data for some inputs. This results in more regionally appropriate data, but also inconsistency across regions. At the same time, some inputs are global constants, underestimating spatial heterogeneity.",
  ]),
  citation: bullets([SOURCE_CROPLAND]),
};

export const LGMS_LIVESTOCK_METADATA: LgmsLayerMetadata = {
  summary: "GHG emissions from livestock in 2020",
  description: paragraphs([
    "This dataset maps the GHG emissions from livestock in 2020, including monogastrics and ruminants, with multiple production systems for each. GHGs include CH4 and N2O. Emissions from land-use change and soil are covered in separate layers.",
    "This dataset supports monitoring the climate change impacts of livestock across spatial scales and can assist a variety of actors and organizations with decreasing agriculture-based emissions.",
  ]),
  cautions: numbered([
    "Values are modeled and, as such, have multiple sources of uncertainty. Users are strongly encouraged to read and fully comprehend the metadata and other available documentation prior to data use. Only uncertainty estimates for global fluxes have been calculated but they cannot be displayed at this time.",
    "The constituent datasets use regional, national, and sometimes subnational data for some inputs. This results in more regionally appropriate data, but also inconsistency across regions. At the same time, some inputs are global constants, underestimating spatial heterogeneity.",
  ]),
  citation: bullets([SOURCE_LIVESTOCK]),
};
