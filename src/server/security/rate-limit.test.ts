import { describe, expect, it, beforeEach } from "vitest";

import { allowAnonymousWrite, resetAnonymousWriteLimits } from "./rate-limit";

describe("anonymous lab write limit", () => {
  beforeEach(() => resetAnonymousWriteLimits());

  it("allows the bounded burst, then returns a retry window", () => {
    for (let count = 0; count < 20; count += 1) {
      expect(allowAnonymousWrite("test", 1_000)).toMatchObject({
        allowed: true,
      });
    }
    expect(allowAnonymousWrite("test", 1_000)).toMatchObject({
      allowed: false,
    });
    expect(allowAnonymousWrite("test", 62_000)).toMatchObject({
      allowed: true,
    });
  });
});
