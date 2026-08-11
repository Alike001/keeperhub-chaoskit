import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const labRuns = pgTable("lab_runs", {
  id: uuid("id").primaryKey(),
  target: text("target").notNull(),
  expectedChainId: integer("expected_chain_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const runEvidence = pgTable("run_evidence", {
  id: uuid("id").primaryKey(),
  runId: uuid("run_id").notNull().references(() => labRuns.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(),
  outcome: text("outcome").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  facts: jsonb("facts").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
