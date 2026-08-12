import { NextResponse } from "next/server";

import { readFillPilotProof } from "@/server/integrations/fillpilot-readiness";

export const runtime = "nodejs";

/** Reads FillPilot's public receipt record. It cannot call KeeperHub or submit. */
export async function GET() {
  try {
    return NextResponse.json({
      source: "fillpilot",
      proof: await readFillPilotProof(),
      boundary:
        "Read-only proof check. ChaosKit cannot submit, retry, simulate, or otherwise control the FillPilot execution.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        source: "fillpilot",
        status: "unavailable",
        reason:
          error instanceof Error ? error.message : "FillPilot unavailable.",
      },
      { status: 503 },
    );
  }
}
