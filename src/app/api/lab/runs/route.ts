import { NextResponse } from "next/server";

import {
  createLabRun,
  listRecentLabRuns,
} from "@/server/db/evidence-repository";

export const runtime = "nodejs";

/** Reads compact metadata for earlier controlled runs. It cannot execute anything. */
export async function GET() {
  try {
    return NextResponse.json({ runs: await listRecentLabRuns() });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read lab history.",
      },
      { status: 503 },
    );
  }
}

/** Starts a controlled local run. This route cannot call KeeperHub or a chain. */
export async function POST() {
  try {
    const run = await createLabRun({
      target: "fillpilot-ethereum-sepolia-canary",
      expectedChainId: 11155111,
    });
    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not start lab run.",
      },
      { status: 503 },
    );
  }
}
