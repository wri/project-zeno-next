import { describe, expect, it } from "vitest";
import {
  classifyFlag,
  classifyTopics,
  classifyTurn,
  coarseRollup,
  complexityBand,
  complexityScore,
  continuationDistribution,
  flagDistribution,
  intentDistribution,
  intentOf,
  languageReconciliation,
  NA_LABEL,
  outcomeMixByDimension,
  reconcileLang,
  tagTraces,
} from "../analytics/taxonomy";
import { makeRow } from "./helpers";

// The worked examples below are the ones documented in the taxonomy spec
// (docs/taxonomy_v2.md §8, docs/redefinitions.md). They pin the v2.1 rules:
// spatial is view-only, ranking+comparative merged into comparison, and
// non-analytical turns gate to not_applicable.

describe("classifyFlag", () => {
  it("flags empty, junk, test scaffolding, system text and templated prompts", () => {
    expect(classifyFlag("")).toBe("null");
    expect(classifyFlag("   ")).toBe("null");
    expect(classifyFlag("test")).toBe("junk_test");
    expect(classifyFlag("dsdssds")).toBe("junk_test");
    expect(classifyFlag("bcdfghjk")).toBe("junk_test"); // consonant soup
    expect(classifyFlag("pick a dataset for the analysis")).toBe(
      "internal_test"
    );
    expect(classifyFlag("User performed UI action")).toBe("system_injected");
    expect(classifyFlag("Analyse Tree cover loss in Mali.")).toBe(
      "templated_analyse"
    );
    expect(classifyFlag("Analyze Portugal")).toBe("templated_analyse");
    expect(classifyFlag("How much forest did Brazil lose in 2023?")).toBe(
      "organic"
    );
  });
});

describe("classifyTopics", () => {
  it("tags subjects and rolls up to coarse buckets", () => {
    // "tree cover loss" matches deforestation AND forest_status (the two
    // regexes overlap in the source vocabulary) — multi-tag is faithful.
    expect(classifyTopics("tree cover loss in Brazil")).toBe(
      "deforestation|forest_status"
    );
    expect(classifyTopics("recent fire alerts")).toContain("fire");
    expect(classifyTopics("hello there")).toBe("unclassified");
    expect(coarseRollup("deforestation|fire")).toBe("Forest & tree cover|Fire");
    // overlapping fine tags collapse to a single coarse bucket
    expect(coarseRollup("deforestation|forest_status")).toBe(
      "Forest & tree cover"
    );
    expect(coarseRollup("unclassified")).toBe("Unclassified");
  });

  it("tags the v2.1 satellite_imagery subject", () => {
    expect(
      classifyTopics("What year is the satellite image I am viewing?")
    ).toBe("satellite_imagery");
  });
});

describe("intent (v2.1 rules)", () => {
  it("classifies a 'show me [metric]' prompt by its metric, not as spatial", () => {
    // v2.1: spatial is view-only. "show me tree cover loss" is quantification.
    expect(
      intentOf("show me tree cover loss in this area", "deforestation")
    ).toBe("quantification");
    expect(
      intentOf("show me tree cover loss in brazil in 2023", "deforestation")
    ).toBe("quantification");
  });

  it("keeps true navigation as spatial", () => {
    expect(intentOf("show me the map of the amazon", "unclassified")).toBe(
      "spatial"
    );
    expect(intentOf("zoom to the congo basin", "unclassified")).toBe("spatial");
  });

  it("treats superlatives and A-vs-B as one comparison intent", () => {
    expect(
      intentOf("which country lost the most forest in 2023?", "deforestation")
    ).toBe("comparison");
    expect(
      intentOf("compare deforestation in peru and colombia", "deforestation")
    ).toBe("comparison");
  });

  it("classifies trend, causal and monitoring", () => {
    expect(intentOf("how has fire activity changed since 2015?", "fire")).toBe(
      "trend"
    );
    expect(intentOf("why did forest loss rise in para?", "deforestation")).toBe(
      "causal"
    );
    expect(
      intentOf("are there recent disturbance alerts here?", "alerts")
    ).toBe("monitoring");
  });
});

describe("classifyTurn", () => {
  it("gates non-analytical roles to not_applicable", () => {
    expect(
      classifyTurn(
        "give me a tl;dr of this insight",
        "organic",
        1,
        "unclassified"
      )
    ).toMatchObject({ turnRole: "insight_operation", intent: NA_LABEL });
    expect(classifyTurn("yes", "organic", 1, "unclassified")).toMatchObject({
      turnRole: "confirmation_selection",
      intent: NA_LABEL,
    });
    expect(
      classifyTurn("what datasets do you have?", "organic", 0, "unclassified")
    ).toMatchObject({ turnRole: "meta_platform", intent: NA_LABEL });
  });

  it("treats a bare correction as not_applicable (regressions: the 'no,' bug)", () => {
    // docs/redefinitions.md: "no, do not use drivers." must gate to NA, not causal.
    expect(
      classifyTurn("no, do not use drivers.", "organic", 1, "unclassified")
    ).toMatchObject({ turnRole: "follow_up_refine", intent: NA_LABEL });
    expect(
      classifyTurn(
        "sorry I meant the bekaa valley",
        "organic",
        1,
        "unclassified"
      )
    ).toMatchObject({ intent: NA_LABEL });
  });

  it("keeps a correction that carries a year or metric analytical", () => {
    // "no, use 2024 instead" carries a year, so it stays a real intent.
    const r = classifyTurn(
      "no, use 2024 instead",
      "organic",
      1,
      "unclassified"
    );
    expect(r.turnRole).toBe("follow_up_refine");
    expect(r.intent).not.toBe(NA_LABEL);
  });

  it("does not misread 'now' as the negation 'no'", () => {
    const r = classifyTurn(
      "now compare it with syria",
      "organic",
      1,
      "unclassified"
    );
    expect(r.turnRole).toBe("follow_up_refine");
    expect(r.intent).toBe("comparison");
  });
});

describe("complexity", () => {
  it("returns null for an empty prompt and bands it as not_applicable", () => {
    expect(complexityScore("")).toBeNull();
    expect(complexityBand(null)).toBe(NA_LABEL);
  });

  it("does not credit a bare preposition as an area (the v2 'for' bug)", () => {
    // "trend for tree cover loss" has no place — 'for' alone must not score area.
    const score = complexityScore("what's the trend for tree cover loss") ?? 0;
    const withPlace =
      complexityScore("what's the trend for tree cover loss in Brazil") ?? 0;
    expect(withPlace).toBeGreaterThan(score);
  });

  it("bands scores as documented", () => {
    expect(complexityBand(0)).toBe("minimal");
    expect(complexityBand(1)).toBe("minimal");
    expect(complexityBand(2)).toBe("low");
    expect(complexityBand(4)).toBe("moderate");
    expect(complexityBand(6)).toBe("high");
  });
});

describe("reconcileLang", () => {
  it("is system-preferred, backfills blanks, flags disagreements", () => {
    expect(reconcileLang("en", "en")).toEqual({
      langFinal: "en",
      langAgreement: "agree",
    });
    expect(reconcileLang("de", "en")).toEqual({
      langFinal: "de",
      langAgreement: "disagree",
    });
    expect(reconcileLang("", "es")).toEqual({
      langFinal: "es",
      langAgreement: "detected_only",
    });
    expect(reconcileLang("en", "und")).toEqual({
      langFinal: "en",
      langAgreement: "system_only",
    });
    expect(reconcileLang("", null)).toEqual({
      langFinal: "und",
      langAgreement: "none",
    });
  });
});

describe("tagTraces", () => {
  it("orders a session by time, assigns turn position, and inherits topics", () => {
    // Deliberately supplied out of order to prove the internal time-sort.
    const tagged = tagTraces([
      makeRow({
        traceId: "b",
        sessionId: "s1",
        timestamp: "2026-06-01T10:05:00Z",
        prompt: "now compare it with Syria",
        language: "en",
      }),
      makeRow({
        traceId: "a",
        sessionId: "s1",
        timestamp: "2026-06-01T10:00:00Z",
        prompt: "How much tree cover loss did Lebanon have in 2023?",
        language: "en",
      }),
    ]);
    // Output preserves INPUT order (b, a).
    const byId = new Map(tagged.map((t) => [t.row.traceId, t]));
    const a = byId.get("a")!;
    const b = byId.get("b")!;

    expect(a.turnPos).toBe(0);
    expect(a.topics).toBe("deforestation|forest_status");
    expect(a.intent).toBe("quantification");

    expect(b.turnPos).toBe(1);
    expect(b.turnRole).toBe("follow_up_refine");
    expect(b.intent).toBe("comparison");
    // topic-less continuation inherits the session's literal topic
    expect(b.topics).toBe("deforestation|forest_status");
    expect(b.topicsInherited).toBe(true);
    expect(b.topicCoarse).toBe("Forest & tree cover");
  });

  it("treats a null sessionId as its own singleton session", () => {
    const tagged = tagTraces([
      makeRow({ traceId: "x", sessionId: null, prompt: "yes" }),
      makeRow({ traceId: "y", sessionId: null, prompt: "ok" }),
    ]);
    // Each is turn 0 of its own session, so neither is a confirmation follow-up.
    expect(tagged.every((t) => t.turnPos === 0)).toBe(true);
  });

  it("produces sane distributions", () => {
    const tagged = tagTraces([
      makeRow({
        traceId: "1",
        sessionId: "s",
        timestamp: "2026-06-01T10:00:00Z",
        prompt: "How much forest did Brazil lose in 2023?",
        language: "en",
      }),
      makeRow({
        traceId: "2",
        sessionId: "s",
        timestamp: "2026-06-01T10:01:00Z",
        prompt: "compare that with Peru",
        language: "en",
      }),
      makeRow({
        traceId: "3",
        sessionId: "t",
        timestamp: "2026-06-01T10:00:00Z",
        prompt: "test",
        language: "en",
      }),
    ]);

    const flags = flagDistribution(tagged);
    expect(flags.find((f) => f.label === "junk_test")?.count).toBe(1);
    expect(flags.find((f) => f.label === "organic")?.count).toBe(2);

    // junk excluded from organic-only intent distribution
    const intents = intentDistribution(tagged, { organic: true });
    const total = intents.reduce((a, b) => a + b.count, 0);
    expect(total).toBe(2);

    const cont = continuationDistribution(tagged, { organic: true });
    expect(cont.find((c) => c.label === "refinement")?.count).toBe(1);

    const lang = languageReconciliation(tagged);
    expect(lang.finalCounts.find((l) => l.label === "en")?.count).toBe(2);
  });
});

describe("outcomeMixByDimension", () => {
  const tagged = tagTraces([
    makeRow({
      traceId: "1",
      sessionId: "s",
      prompt: "How much tree cover loss did Brazil have in 2023?",
      outcome: "ANSWER",
      language: "en",
    }),
    makeRow({
      traceId: "2",
      sessionId: "t",
      prompt: "why did fires increase in Peru?",
      outcome: "SOFT_ERROR",
      language: "en",
    }),
    makeRow({
      traceId: "3",
      sessionId: "u",
      prompt: "yes",
      outcome: "DEFER",
      language: "en",
    }),
  ]);

  it("breaks outcomes down by coarse topic", () => {
    const mix = outcomeMixByDimension(tagged, "topic");
    expect(
      mix.find((m) => m.label === "Forest & tree cover")?.counts.ANSWER
    ).toBe(1);
    expect(mix.find((m) => m.label === "Fire")?.counts.SOFT_ERROR).toBe(1);
  });

  it("breaks outcomes down by intent, skipping non-analytical turns", () => {
    const mix = outcomeMixByDimension(tagged, "intent");
    const labels = mix.map((m) => m.label);
    expect(labels).toContain("quantification");
    expect(labels).toContain("causal");
    // the bare "yes" (not_applicable) contributes nothing
    expect(mix.reduce((a, b) => a + b.total, 0)).toBe(2);
  });

  it("breaks outcomes down by reconciled language", () => {
    const mix = outcomeMixByDimension(tagged, "language");
    expect(mix.find((m) => m.label === "en")?.total).toBe(3);
  });

  it("breaks outcomes down by turn role (all roles, incl. non-analytical)", () => {
    const mix = outcomeMixByDimension(tagged, "turn");
    const labels = mix.map((m) => m.label);
    expect(labels).toContain("new_query");
    // "yes" is a confirmation_selection, which IS a turn category here
    expect(mix.find((m) => m.label === "confirmation_selection")?.total).toBe(
      1
    );
    expect(mix.reduce((a, b) => a + b.total, 0)).toBe(3);
  });

  it("uses a custom outcomeOf accessor (e.g. a refined outcome)", () => {
    // Map every trace to a single injected code — proves the counts key off the
    // accessor's return value, not row.outcome.
    const mix = outcomeMixByDimension(tagged, "language", {
      outcomeOf: () => "ANSWER_CLEAN",
    });
    expect(mix.find((m) => m.label === "en")?.counts.ANSWER_CLEAN).toBe(3);
  });

  it("skips turns with no outcome", () => {
    const noOutcome = tagTraces([
      makeRow({
        traceId: "z",
        prompt: "How much forest was lost?",
        outcome: null,
      }),
    ]);
    expect(outcomeMixByDimension(noOutcome, "topic")).toEqual([]);
    // a custom accessor returning nullish also skips
    expect(
      outcomeMixByDimension(tagged, "topic", { outcomeOf: () => null })
    ).toEqual([]);
  });
});
