import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  listRunEvidence,
  recordDurableEvidence,
} from "@/server/db/evidence-repository";

const payloadSchema = z.object({
  stage: z.enum(["diagnose", "dry-run", "duplicate-guard"]),
});

export const runtime = "nodejs";

/** Records controlled-test evidence only. It has no KeeperHub or chain adapter. */
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/lab/runs/[id]/evidence">,
) {
  try {
    const { id: runId } = await context.params;
    const { stage } = payloadSchema.parse(await request.json());
    const history = await listRunEvidence({ runId });
    if (stage === "dry-run" && !hasStage(history, "diagnose")) {
      return blocked("Run the controlled diagnosis first.");
    }
    if (stage === "duplicate-guard" && !hasStage(history, "dry-run")) {
      return blocked("Run the controlled dry-run first.");
    }

    const input = {
      runId,
      stage,
      outcome: "controlled-verified",
      idempotencyKey: `${runId}:${stage}:v1`,
      facts: controlledFacts(stage),
    };
    const first = await recordDurableEvidence(input);
    const replay =
      stage === "duplicate-guard"
        ? await recordDurableEvidence(input)
        : undefined;
    const updated = await listRunEvidence({ runId });
    return NextResponse.json({
      evidence: first.evidence,
      idempotentReplay: first.idempotentReplay || replay?.idempotentReplay,
      durableRequestCount: updated.filter(
        (item) => item.stage === "duplicate-guard",
      ).length,
      boundary:
        "Controlled local evidence only. No KeeperHub request, signature, or transaction was created.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not record evidence.",
      },
      { status: 503 },
    );
  }
}

function hasStage(history: { stage: string }[], stage: string) {
  return history.some((item) => item.stage === stage);
}

function blocked(error: string) {
  return NextResponse.json({ error }, { status: 409 });
}

function controlledFacts(stage: "diagnose" | "dry-run" | "duplicate-guard") {
  if (stage === "diagnose") {
    return { mode: "controlled", expectedChainId: 11155111 };
  }
  if (stage === "dry-run") {
    return { mode: "controlled", transactionCreated: false };
  }
  return { mode: "controlled", duplicateRequests: 2, durableOutcomes: 1 };
}
