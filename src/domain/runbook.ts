export const stages = [
  "diagnose",
  "dry-run",
  "duplicate-guard",
  "canary",
] as const;

export type Stage = (typeof stages)[number];
export type StageStatus = "locked" | "ready" | "verified" | "blocked";

export type RunState = Readonly<{
  keeperHubConnected: boolean;
  walletPresent: boolean;
  expectedChain: number | null;
  observedChain: number | null;
  simulationSucceeded: boolean;
  durableRequestCount: number;
}>;

export function stageStatus(stage: Stage, state: RunState): StageStatus {
  const diagnosisReady =
    state.keeperHubConnected &&
    state.walletPresent &&
    state.expectedChain !== null &&
    state.expectedChain === state.observedChain;

  if (stage === "diagnose") return diagnosisReady ? "verified" : "blocked";
  if (stage === "dry-run")
    return diagnosisReady
      ? state.simulationSucceeded
        ? "verified"
        : "ready"
      : "locked";
  if (stage === "duplicate-guard") {
    if (!diagnosisReady || !state.simulationSucceeded) return "locked";
    return state.durableRequestCount === 1 ? "verified" : "ready";
  }
  if (
    !diagnosisReady ||
    !state.simulationSucceeded ||
    state.durableRequestCount !== 1
  )
    return "locked";
  return "ready";
}

export function isCanaryEligible(state: RunState): boolean {
  return stageStatus("canary", state) === "ready";
}
