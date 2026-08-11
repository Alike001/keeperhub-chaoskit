import { NextResponse } from "next/server";

import { readFillPilotExecutionBoundary } from "@/server/integrations/fillpilot-readiness";

export const runtime = "nodejs";

/** Reads FillPilot's own locked testnet facts. It cannot call KeeperHub or submit. */
export async function GET() {
  try {
    return NextResponse.json({
      source: "fillpilot",
      ...(await readFillPilotExecutionBoundary()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        source: "fillpilot",
        status: "unavailable",
        writesEnabled: false,
        reason:
          error instanceof Error ? error.message : "FillPilot unavailable.",
      },
      { status: 503 },
    );
  }
}
