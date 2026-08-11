import postgres from "postgres";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import {
  createLabRun,
  listRecentLabRuns,
  listRunEvidence,
  recordDurableEvidence,
} from "./evidence-repository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
let client: ReturnType<typeof postgres> | undefined;
const runIds: string[] = [];

describeWithDatabase("durable lab evidence", () => {
  beforeAll(() => {
    client = postgres(databaseUrl as string, { max: 1 });
  });

  afterEach(async () => {
    for (const runId of runIds.splice(0)) {
      await client!`delete from lab_runs where id = ${runId}`;
    }
  });

  afterAll(async () => {
    await client?.end();
  });

  it("stores one evidence row when a stage is recorded twice", async () => {
    const run = await createLabRun({
      target: "fillpilot-testnet-canary",
      expectedChainId: 11155111,
      databaseUrl,
    });
    runIds.push(run.id);
    const input = {
      runId: run.id,
      stage: "duplicate-guard",
      outcome: "verified",
      idempotencyKey: `${run.id}:duplicate-guard:v1`,
      facts: { durableRequestCount: 1 },
      databaseUrl,
    };

    const first = await recordDurableEvidence(input);
    const replay = await recordDurableEvidence(input);
    const history = await listRunEvidence({ runId: run.id, databaseUrl });

    expect(first.idempotentReplay).toBe(false);
    expect(replay.idempotentReplay).toBe(true);
    expect(replay.evidence.id).toBe(first.evidence.id);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      stage: "duplicate-guard",
      outcome: "verified",
    });
  });

  it("lists newest durable runs first within the requested limit", async () => {
    const older = await createLabRun({
      target: "older-run",
      expectedChainId: 11155111,
      databaseUrl,
    });
    const newer = await createLabRun({
      target: "newer-run",
      expectedChainId: 11155111,
      databaseUrl,
    });
    runIds.push(older.id, newer.id);

    const history = await listRecentLabRuns({ databaseUrl, limit: 1 });

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ id: newer.id, target: "newer-run" });
  });
});
