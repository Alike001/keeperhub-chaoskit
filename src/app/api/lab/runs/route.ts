import { NextResponse } from "next/server";

import {
  createLabRun,
  listRecentLabRuns,
} from "@/server/db/evidence-repository";
import { allowAnonymousWrite } from "@/server/security/rate-limit";

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
  const limit = allowAnonymousWrite("lab-run");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many lab runs. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }
  try {
    const run = await createLabRun({
      target: "fillpilot-base-sepolia-canary",
      expectedChainId: 84532,
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
