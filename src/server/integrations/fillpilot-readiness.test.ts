import { describe, expect, it } from "vitest";

import {
  readFillPilotExecutionBoundary,
  readFillPilotReadiness,
} from "./fillpilot-readiness";

describe("FillPilot read-only readiness adapter", () => {
  it("accepts only a factual Sepolia response with writes disabled", async () => {
    const readiness = await readFillPilotReadiness(
      async () =>
        new Response(
          JSON.stringify({
            chainId: 11155111,
            network: "Ethereum Sepolia",
            status: "not-configured",
            reason: "SEPOLIA_RPC_URL is required",
            writesEnabled: false,
          }),
        ),
      "http://fillpilot.test",
    );
    expect(readiness.writesEnabled).toBe(false);
  });

  it("surfaces the explicit locked canary boundary without enabling writes", async () => {
    const boundary = await readFillPilotExecutionBoundary(async (input) => {
      const url = String(input);
      if (url.endsWith("/api/testnet/readiness")) {
        return new Response(
          JSON.stringify({
            chainId: 11155111,
            network: "Ethereum Sepolia",
            status: "configured",
            writesEnabled: false,
          }),
        );
      }
      return new Response(
        JSON.stringify({
          status: "deployment-required",
          writesEnabled: false,
          boundary: "Canary deployment remains separately reviewed.",
        }),
      );
    }, "http://fillpilot.test");

    expect(boundary.readiness.status).toBe("configured");
    expect(boundary.canary.status).toBe("deployment-required");
    expect(boundary.canary.writesEnabled).toBe(false);
  });

  it("rejects a response that reports write enablement", async () => {
    await expect(
      readFillPilotReadiness(
        async () =>
          new Response(
            JSON.stringify({
              chainId: 11155111,
              network: "Ethereum Sepolia",
              status: "configured",
              writesEnabled: true,
            }),
          ),
        "http://fillpilot.test",
      ),
    ).rejects.toThrow("invalid read-only");
  });
});
