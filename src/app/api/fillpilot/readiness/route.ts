import { NextResponse } from "next/server";

import { readFillPilotReadiness } from "@/server/integrations/fillpilot-readiness";

export const runtime = "nodejs";

/** Reads FillPilot's own readiness endpoint. It cannot call KeeperHub or submit. */
export async function GET() {
  try {
    return NextResponse.json({
      source: "fillpilot",
      ...(await readFillPilotReadiness()),
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
