export type FillPilotReadiness = Readonly<{
  chainId: number;
  network: string;
  status: "configured" | "not-configured";
  reason?: string;
  writesEnabled: false;
}>;

export type FillPilotCanaryBoundary = Readonly<{
  status: "deployment-required";
  writesEnabled: false;
  boundary: string;
}>;

export type FillPilotExecutionBoundary = Readonly<{
  readiness: FillPilotReadiness;
  canary: FillPilotCanaryBoundary;
}>;

export async function readFillPilotReadiness(
  fetcher: typeof fetch = fetch,
  baseUrl = process.env.FILLPILOT_URL ?? "http://127.0.0.1:3000",
): Promise<FillPilotReadiness> {
  const response = await fetcher(`${baseUrl}/api/testnet/readiness`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`FillPilot readiness returned HTTP ${response.status}`);
  const payload = (await response.json()) as Partial<FillPilotReadiness>;
  if (
    payload.chainId !== 11155111 ||
    payload.network !== "Ethereum Sepolia" ||
    (payload.status !== "configured" && payload.status !== "not-configured") ||
    payload.writesEnabled !== false
  ) {
    throw new Error(
      "FillPilot returned an invalid read-only readiness response",
    );
  }
  return payload as FillPilotReadiness;
}

/**
 * Reads FillPilot's two non-submitting testnet facts as one bounded result.
 * It deliberately accepts only the locked canary state. A future deploy or
 * write-enabled response must add a separately reviewed adapter and test.
 */
export async function readFillPilotExecutionBoundary(
  fetcher: typeof fetch = fetch,
  baseUrl = process.env.FILLPILOT_URL ?? "http://127.0.0.1:3000",
): Promise<FillPilotExecutionBoundary> {
  const [readiness, canaryResponse] = await Promise.all([
    readFillPilotReadiness(fetcher, baseUrl),
    fetcher(`${baseUrl}/api/testnet/canary`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    }),
  ]);
  if (!canaryResponse.ok)
    throw new Error(
      `FillPilot canary boundary returned HTTP ${canaryResponse.status}`,
    );

  const canaryPayload =
    (await canaryResponse.json()) as Partial<FillPilotCanaryBoundary>;
  if (
    canaryPayload.status !== "deployment-required" ||
    canaryPayload.writesEnabled !== false ||
    typeof canaryPayload.boundary !== "string"
  ) {
    throw new Error("FillPilot returned an invalid locked canary boundary");
  }

  return { readiness, canary: canaryPayload as FillPilotCanaryBoundary };
}
