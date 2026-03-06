import { StyleSheet } from "@react-pdf/renderer";

/**
 * Styles for the PDF report document.
 *
 * Colours are hardcoded hex values matching the Chakra theme so they work
 * inside @react-pdf/renderer's own reconciler (no CSS variables, no tokens).
 */
const styles = StyleSheet.create({
  // ── Page ────────────────────────────────────────────────────────────
  page: {
    padding: 40,
    paddingBottom: 60,
    fontFamily: "IBM Plex Sans",
    fontSize: 10,
    color: "#394048", // neutral.600
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#B2B7BD", // neutral.400
    textAlign: "center",
  },

  // ── Title ───────────────────────────────────────────────────────────
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#002C6C", // primary.700
    marginBottom: 16,
  },

  // ── Block layout ────────────────────────────────────────────────────
  blockFull: {
    width: "100%",
    marginBottom: 14,
  },
  blockRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  blockHalf: {
    width: "49%",
  },

  // ── Text block ──────────────────────────────────────────────────────
  textBlock: {
    lineHeight: 1.55,
  },
  textParagraph: {
    marginBottom: 6,
  },

  // ── Insight block (shared) ──────────────────────────────────────────
  insightContainer: {
    border: "1px solid #AFBFE6", // primary.200
    borderRadius: 4,
    overflow: "hidden",
  },
  insightHeader: {
    backgroundColor: "#E8F0FE",
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  insightTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: "#002C6C", // primary.700
  },
  insightBadge: {
    fontSize: 7,
    color: "#666E7B",
    marginLeft: "auto",
  },
  insightBody: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  insightDescription: {
    fontSize: 8,
    color: "#666E7B", // neutral.500
    marginBottom: 6,
  },

  // ── Chart image ─────────────────────────────────────────────────────
  chartImage: {
    width: "100%",
    objectFit: "contain",
  },
  chartPlaceholder: {
    height: 80,
    backgroundColor: "#F4F5F7",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  chartPlaceholderText: {
    fontSize: 9,
    color: "#B2B7BD",
    fontStyle: "italic",
  },

  // ── Table ───────────────────────────────────────────────────────────
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F4F5F7", // neutral.200
    borderBottom: "1px solid #E1E2E6", // neutral.300
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 8,
    fontWeight: 600,
    color: "#666E7B", // neutral.500
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5px solid #E1E2E6",
  },
  tableRowStriped: {
    flexDirection: "row",
    borderBottom: "0.5px solid #E1E2E6",
    backgroundColor: "#FAFAFA",
  },
  tableCell: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 8,
  },
  truncationNote: {
    fontSize: 7,
    color: "#666E7B",
    marginTop: 4,
    fontStyle: "italic",
  },
});

export default styles;
