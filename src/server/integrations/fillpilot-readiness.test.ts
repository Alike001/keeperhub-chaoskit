import { describe, expect, it } from "vitest";

import { readFillPilotProof } from "./fillpilot-readiness";

describe("FillPilot public-proof adapter", () => {
  it("accepts a complete, successful Base Sepolia proof record", async () => {
    const proof = await readFillPilotProof(
      async () =>
        new Response(
          JSON.stringify({
            proof: {
              id: "base-sepolia-canary-20260812",
              network: "Base Sepolia",
              chainId: 84532,
              executionId: "dpnxfa52zwzoz58pod0f4",
              transactionHash:
                "0x843bdfd7be5b74bf3396792611c623f283eeec64d9f386e72448fe5da60520aa",
              transactionLink: "https://sepolia.basescan.org/tx/example",
              receiptStatus: "Succeeded",
              boundary: "External public canary.",
            },
          }),
        ),
      "http://fillpilot.test",
    );
    expect(proof.chainId).toBe(84532);
    expect(proof.receiptStatus).toBe("Succeeded");
  });

  it("rejects a record that does not prove a successful receipt", async () => {
    await expect(
      readFillPilotProof(
        async () =>
          new Response(
            JSON.stringify({
              proof: {
                id: "base-sepolia-canary-20260812",
                network: "Base Sepolia",
                chainId: 84532,
                receiptStatus: "Pending",
              },
            }),
          ),
        "http://fillpilot.test",
      ),
    ).rejects.toThrow("invalid public proof");
  });
});
