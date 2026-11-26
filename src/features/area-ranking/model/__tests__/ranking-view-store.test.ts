import { beforeEach, describe, expect, it } from "vitest";

import useRankingViewStore from "../ranking-view-store";

describe("useRankingViewStore", () => {
  beforeEach(() => useRankingViewStore.setState({ pageByWidget: {} }));

  it("keeps the page of each widget on its own", () => {
    const { setPage } = useRankingViewStore.getState();
    setPage("w1", 2);
    setPage("w2", 1);
    setPage("w1", 3);
    expect(useRankingViewStore.getState().pageByWidget).toEqual({
      w1: 3,
      w2: 1,
    });
  });
});
