import { describe, expect, it } from "vitest";
import { isCanaryEligible, stageStatus, type RunState } from "./runbook";

const safeState: RunState = {
  keeperHubConnected: true,
  walletPresent: true,
  expectedChain: 84532,
  observedChain: 84532,
  simulationSucceeded: true,
  durableRequestCount: 1,
};

describe("ChaosKit runbook gates", () => {
  it("does not unlock a canary before each controlled check succeeds", () => {
    expect(isCanaryEligible({ ...safeState, simulationSucceeded: false })).toBe(
      false,
    );
    expect(isCanaryEligible({ ...safeState, durableRequestCount: 2 })).toBe(
      false,
    );
    expect(isCanaryEligible({ ...safeState, observedChain: 8453 })).toBe(false);
  });

  it("permits a canary only for an exact single durable outcome", () => {
    expect(stageStatus("duplicate-guard", safeState)).toBe("verified");
    expect(stageStatus("canary", safeState)).toBe("ready");
    expect(isCanaryEligible(safeState)).toBe(true);
  });
});
