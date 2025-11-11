import { describe, it, expect } from "vitest";
import { compareFacts } from "./rules";

describe("compareFacts", () => {
  it("flags objective mismatch", () => {
    const out = compareFacts({ objective: "alpha" }, { objective: "market-making" });
    expect(out.length).toBe(1);
    expect(out[0].category).toBe("objective");
  });
});

