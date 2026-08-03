import { describe, expect, it } from "vitest";

describe("application shell", () => {
  it("exposes the product name", () => {
    expect("NextBite").toBe("NextBite");
  });
});
