/**
 * Public API of the `area-ranking` feature (FSD slice).
 *
 * The curated ranking of areas by tree cover loss (or its emissions), the
 * `ranked-bar` type that project-zeno's tree cover loss generator returns for
 * several areas: a bar per area, ten to a page. Consumers import ONLY from this
 * barrel.
 */
export { isRankingWidget, rankingTableProps } from "./model/ranking";
export { RankingBody } from "./ui/RankingBody";
