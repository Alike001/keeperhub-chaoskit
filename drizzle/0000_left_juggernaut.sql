CREATE TABLE "lab_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"target" text NOT NULL,
	"expected_chain_id" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_evidence" (
	"id" uuid PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"outcome" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"facts" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "run_evidence" ADD CONSTRAINT "run_evidence_run_id_lab_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."lab_runs"("id") ON DELETE cascade ON UPDATE no action;