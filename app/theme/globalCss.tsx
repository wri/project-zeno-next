const globalCss = {
  '[data-scope="date-picker"][data-part="positioner"]': {
    "--z-index": "2000 !important",
  },
  h2: {
    marginBottom: 4,
    fontSize: "lg",
    fontWeight: "bold",
  },
  h3: {
    marginBottom: 4,
    fontWeight: "bold",
  },
  ul: {
    marginTop: 4,
    marginBottom: 4,
    listStyleType: "disc",
    paddingLeft: 4,
  },
  ol: {
    marginTop: 4,
    marginBottom: 4,
    listStyleType: "decimal",
    paddingLeft: 4,
  },
  p: {
    marginTop: 4,
    marginBottom: 4,
  },
  // Voice dictation panel: entrance fade and the "listening" dot blink.
  "@keyframes vpFadeUp": {
    from: { opacity: 0, transform: "translateY(6px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
  "@keyframes vpDotBlink": {
    "0%, 100%": { opacity: 1 },
    "50%": { opacity: 0.28 },
  },
};

export default globalCss;
