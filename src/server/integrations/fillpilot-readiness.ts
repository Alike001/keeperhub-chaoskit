export type FillPilotProof = Readonly<{
  id: "base-sepolia-canary-20260812";
  network: "Base Sepolia";
  chainId: 84532;
  executionId: string;
  transactionHash: `0x${string}`;
  transactionLink: string;
  receiptStatus: "Succeeded";
  boundary: string;
}>;

/**
 * Reads FillPilot's fixed public proof record. It uses no KeeperHub credential
 * and never exposes a submission path to ChaosKit.
 */
export async function readFillPilotProof(
  fetcher: typeof fetch = fetch,
  baseUrl = process.env.FILLPILOT_URL ?? "http://127.0.0.1:3000",
): Promise<FillPilotProof> {
  const response = await fetcher(
    `${baseUrl}/api/public/proof/base-sepolia-canary-20260812`,
    { cache: "no-store", headers: { Accept: "application/json" } },
  );
  if (!response.ok)
    throw new Error(`FillPilot proof returned HTTP ${response.status}`);

  const payload = (await response.json()) as {
    proof?: Partial<FillPilotProof>;
  };
  const proof = payload.proof;
  if (
    proof?.id !== "base-sepolia-canary-20260812" ||
    proof.network !== "Base Sepolia" ||
    proof.chainId !== 84532 ||
    proof.receiptStatus !== "Succeeded" ||
    !/^0x[0-9a-f]{64}$/i.test(proof.transactionHash ?? "") ||
    typeof proof.transactionLink !== "string" ||
    typeof proof.executionId !== "string" ||
    typeof proof.boundary !== "string"
  ) {
    throw new Error("FillPilot returned an invalid public proof record");
  }
  return proof as FillPilotProof;
}
