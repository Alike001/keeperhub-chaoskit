"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isCanaryEligible, stageStatus, type RunState } from "@/domain/runbook";
import styles from "./runbook-lab.module.css";

const initialState: RunState = {
  keeperHubConnected: false,
  walletPresent: false,
  expectedChain: 11155111,
  observedChain: null,
  simulationSucceeded: false,
  durableRequestCount: 0,
};

type Evidence = { at: string; stage: string; detail: string };

function now() {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

export function RunbookLab() {
  const [state, setState] = useState<RunState>(initialState);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [error, setError] = useState<string>();
  const [runId, setRunId] = useState<string>();
  const [fillPilotReadiness, setFillPilotReadiness] = useState<string>(
    "Checking FillPilot read-only readiness…",
  );
  const [fillPilotBoundary, setFillPilotBoundary] = useState<string>(
    "Checking the FillPilot canary boundary…",
  );
  const diagnosed = stageStatus("diagnose", state) === "verified";
  const simulated = stageStatus("dry-run", state) === "verified";
  const deduped = stageStatus("duplicate-guard", state) === "verified";
  const canaryReady = isCanaryEligible(state);
  const record = (stage: string, detail: string) =>
    setEvidence((old) => [{ at: now(), stage, detail }, ...old]);

  useEffect(() => {
    void fetch("/api/fillpilot/readiness")
      .then(async (response) => {
        const payload = (await response.json()) as {
          status?: string;
          reason?: string;
          readiness?: { status?: string; reason?: string };
          canary?: {
            status?: string;
            boundary?: string;
            writesEnabled?: boolean;
          };
        };
        const readiness = payload.readiness ?? payload;
        setFillPilotReadiness(
          response.ok
            ? `FillPilot: ${readiness.status ?? "unknown"}. ${readiness.reason ?? "Writes remain disabled."}`
            : `FillPilot unavailable: ${payload.reason ?? "readiness check failed."}`,
        );
        setFillPilotBoundary(
          response.ok && payload.canary
            ? `Canary: ${payload.canary.status ?? "unknown"}. ${payload.canary.boundary ?? "No boundary detail returned."}`
            : "Canary boundary unavailable. No testnet write can be requested.",
        );
      })
      .catch(() => {
        setFillPilotReadiness("FillPilot unavailable: readiness check failed.");
        setFillPilotBoundary(
          "Canary boundary unavailable. No testnet write can be requested.",
        );
      });
  }, []);

  async function ensureRunId() {
    if (runId) return runId;
    const response = await fetch("/api/lab/runs", { method: "POST" });
    const payload = (await response.json()) as {
      run?: { id: string };
      error?: string;
    };
    if (!response.ok || !payload.run) throw new Error(payload.error);
    setRunId(payload.run.id);
    return payload.run.id;
  }

  async function recordStage(
    stage: "diagnose" | "dry-run" | "duplicate-guard",
  ) {
    try {
      setError(undefined);
      const id = await ensureRunId();
      const response = await fetch(`/api/lab/runs/${id}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      const payload = (await response.json()) as {
        error?: string;
        durableRequestCount?: number;
      };
      if (!response.ok) throw new Error(payload.error);
      return payload;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Evidence failed.");
      return undefined;
    }
  }

  async function diagnose() {
    const persisted = await recordStage("diagnose");
    if (!persisted) return;
    setState((old) => ({
      ...old,
      keeperHubConnected: true,
      walletPresent: true,
      observedChain: 11155111,
    }));
    record(
      "Diagnose",
      "Controlled diagnosis saved for Ethereum Sepolia (11155111). No KeeperHub call was made.",
    );
  }
  async function simulate() {
    if (!diagnosed) return;
    const persisted = await recordStage("dry-run");
    if (!persisted) return;
    setState((old) => ({ ...old, simulationSucceeded: true }));
    record(
      "Safe dry-run",
      "Controlled dry-run evidence saved. No KeeperHub call or transaction was made.",
    );
  }
  async function duplicateGuard() {
    if (!simulated) return;
    const persisted = await recordStage("duplicate-guard");
    if (!persisted) return;
    setState((old) => ({
      ...old,
      durableRequestCount: persisted.durableRequestCount ?? 0,
    }));
    record(
      "Duplicate guard",
      "Two controlled requests produced one durable database outcome.",
    );
  }

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <Link href="/">ChaosKit</Link>
        <span className="mono">
          {runId ? `run_${runId.slice(0, 8)}` : "run_pending"}
        </span>
        <span className={styles.readOnly}>Controlled test</span>
      </header>
      <main className={styles.layout}>
        <section>
          <h1>Confirm the execution path.</h1>
          <p className={styles.intro}>
            This runbook only performs controlled checks. A real testnet canary
            remains locked until each prerequisite is proven.
          </p>
          <p className="mono">{fillPilotReadiness}</p>
          <p className="mono">{fillPilotBoundary}</p>
          <Stage
            number="01"
            name="Diagnose"
            status={diagnosed ? "verified" : "ready"}
            detail={
              diagnosed
                ? "Controlled diagnosis saved for Ethereum Sepolia. A real KeeperHub doctor remains pending."
                : "Record a controlled prerequisite check. This cannot send a transaction."
            }
            action="Run connection doctor"
            onClick={diagnose}
          />
          <Stage
            number="02"
            name="Safe dry-run"
            status={simulated ? "verified" : diagnosed ? "ready" : "locked"}
            detail={
              simulated
                ? "Controlled dry-run evidence saved. A real KeeperHub simulation remains pending."
                : "Record a controlled dry-run after the prerequisite check."
            }
            action="Simulate prepared call"
            onClick={simulate}
            disabled={!diagnosed}
          />
          <Stage
            number="03"
            name="Duplicate guard"
            status={deduped ? "verified" : simulated ? "ready" : "locked"}
            detail={
              deduped
                ? "The repeated request produced one durable outcome."
                : "Request the same action twice and record exactly one durable outcome."
            }
            action="Run idempotency check"
            onClick={duplicateGuard}
            disabled={!simulated}
          />
          <Stage
            number="04"
            name="Canary ready"
            status={canaryReady ? "ready" : "locked"}
            detail={
              canaryReady
                ? "The controlled runbook is complete. FillPilot still reports that its canary contract is not deployed, so no testnet write can be prepared."
                : "Complete the controlled evidence stages. A deployed and separately reviewed FillPilot canary remains required."
            }
            action="Review Ethereum Sepolia canary"
            disabled={!canaryReady}
          />
        </section>
        {error ? <p role="alert">{error}</p> : null}
        <aside className={styles.evidence} aria-live="polite">
          <h2>Evidence</h2>
          <p className="mono">No onchain action has been requested.</p>
          {evidence.length === 0 ? (
            <p className={styles.empty}>
              Run a stage to create factual evidence.
            </p>
          ) : (
            <ol>
              {evidence.map((item, index) => (
                <li key={`${item.at}-${index}`}>
                  <time>{item.at}</time>
                  <strong>{item.stage}</strong>
                  <span>{item.detail}</span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </main>
    </div>
  );
}

function Stage({
  number,
  name,
  status,
  detail,
  action,
  onClick,
  disabled = false,
}: {
  number: string;
  name: string;
  status: "locked" | "ready" | "verified";
  detail: string;
  action: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <article className={styles.stage}>
      <div className={styles.stageHeader}>
        <span className={`${styles.number} ${styles[status]}`}>{number}</span>
        <div>
          <h2>{name}</h2>
          <p>{detail}</p>
        </div>
        <span className={`${styles.status} ${styles[status]}`}>{status}</span>
      </div>
      <button type="button" onClick={onClick} disabled={disabled}>
        {action}
      </button>
    </article>
  );
}
