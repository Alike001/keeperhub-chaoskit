import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";

import { createDatabase } from "./client";
import { labRuns, runEvidence } from "./schema";

export type DurableEvidenceInput = Readonly<{
  runId: string;
  stage: string;
  outcome: string;
  idempotencyKey: string;
  facts: Record<string, unknown>;
}>;

export async function createLabRun(input: {
  target: string;
  expectedChainId: number;
  databaseUrl?: string;
}) {
  if (!input.target.trim() || !Number.isSafeInteger(input.expectedChainId)) {
    throw new Error(
      "A target and expected chain ID are required for a lab run",
    );
  }
  const { client, db } = createDatabase(input.databaseUrl);
  try {
    const [run] = await db
      .insert(labRuns)
      .values({
        id: randomUUID(),
        target: input.target,
        expectedChainId: input.expectedChainId,
        createdAt: new Date(),
      })
      .returning();
    return run;
  } finally {
    await client.end();
  }
}

export async function recordDurableEvidence(
  input: DurableEvidenceInput & { databaseUrl?: string },
) {
  if (!input.idempotencyKey.trim()) {
    throw new Error("A durable evidence idempotency key is required");
  }
  const { client, db } = createDatabase(input.databaseUrl);
  try {
    const [created] = await db
      .insert(runEvidence)
      .values({
        id: randomUUID(),
        runId: input.runId,
        stage: input.stage,
        outcome: input.outcome,
        idempotencyKey: input.idempotencyKey,
        facts: input.facts,
        createdAt: new Date(),
      })
      .onConflictDoNothing({
        target: [runEvidence.runId, runEvidence.idempotencyKey],
      })
      .returning();
    if (created) return { evidence: created, idempotentReplay: false };

    const [existing] = await db
      .select()
      .from(runEvidence)
      .where(
        and(
          eq(runEvidence.runId, input.runId),
          eq(runEvidence.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (!existing) throw new Error("Durable evidence replay could not be read");
    return { evidence: existing, idempotentReplay: true };
  } finally {
    await client.end();
  }
}

export async function listRunEvidence(input: {
  runId: string;
  databaseUrl?: string;
}) {
  const { client, db } = createDatabase(input.databaseUrl);
  try {
    return await db
      .select()
      .from(runEvidence)
      .where(eq(runEvidence.runId, input.runId))
      .orderBy(asc(runEvidence.createdAt));
  } finally {
    await client.end();
  }
}

/** Recent controlled runs are evidence metadata, never execution authority. */
export async function listRecentLabRuns(
  input: { databaseUrl?: string; limit?: number } = {},
) {
  const limit = input.limit ?? 8;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 25) {
    throw new Error("Lab run history limit must be between 1 and 25");
  }
  const { client, db } = createDatabase(input.databaseUrl);
  try {
    return await db
      .select()
      .from(labRuns)
      .orderBy(desc(labRuns.createdAt))
      .limit(limit);
  } finally {
    await client.end();
  }
}
