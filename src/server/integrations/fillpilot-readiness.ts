export type FillPilotReadiness = Readonly<{
  chainId: number;
  network: string;
  status: "configured" | "not-configured";
  reason?: string;
  writesEnabled: false;
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
