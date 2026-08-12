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
type RecentRun = { id: string; target: string; expectedChainId: number };

function now(value = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

export function RunbookLab() {
  const [state, setState] = useState<RunState>(initialState);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [error, setError] = useState<string>();
  const [runId, setRunId] = useState<string>();
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [historyLabel, setHistoryLabel] = useState("No durable run selected.");
  const [fillPilotProof, setFillPilotProof] = useState<string>(
    "Checking FillPilot's completed public proof…",
  );
  const [proofVerified, setProofVerified] = useState(false);
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
          proof?: {
            network?: string;
            chainId?: number;
            executionId?: string;
            receiptStatus?: string;
            boundary?: string;
          };
        };
        const proof = payload.proof;
        const verified =
          response.ok &&
          proof?.network === "Base Sepolia" &&
          proof.chainId === 84532 &&
          proof.receiptStatus === "Succeeded" &&
          typeof proof.executionId === "string";
        setProofVerified(verified);
        setFillPilotProof(
          verified
            ? `FillPilot proof verified: ${proof.executionId}, completed on Base Sepolia (84532). ${proof.boundary ?? ""}`
            : `FillPilot proof unavailable: ${payload.reason ?? "proof check failed."}`,
        );
      })
      .catch(() => {
        setFillPilotProof("FillPilot proof unavailable: proof check failed.");
        setProofVerified(false);
      });
  }, []);

  useEffect(() => {
    void fetch("/api/lab/runs")
      .then(async (response) => {
        const payload = (await response.json()) as { runs?: RecentRun[] };
        setRecentRuns(
          response.ok && Array.isArray(payload.runs) ? payload.runs : [],
        );
      })
      .catch(() => setRecentRuns([]));
  }, []);

  async function showDurableEvidence(id: string) {
    try {
      setError(undefined);
      const response = await fetch(`/api/lab/runs/${id}/evidence`);
      const payload = (await response.json()) as {
        evidence?: Array<{ createdAt: string; stage: string; outcome: string }>;
        error?: string;
      };
      if (!response.ok || !payload.evidence) throw new Error(payload.error);
      setEvidence(
        payload.evidence.map((item) => ({
          at: now(new Date(item.createdAt)),
          stage: item.stage,
          detail: `${item.outcome}. Durable controlled evidence.`,
        })),
      );
      setHistoryLabel(`Viewing durable evidence for run_${id.slice(0, 8)}.`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load durable evidence.",
      );
    }
  }

  async function ensureRunId() {
    if (runId) return runId;
    const response = await fetch("/api/lab/runs", { method: "POST" });
    const payload = (await response.json()) as {
      run?: RecentRun;
      error?: string;
    };
    if (!response.ok || !payload.run) throw new Error(payload.error);
    setRunId(payload.run.id);
    setRecentRuns((old) =>
      [payload.run!, ...old.filter((run) => run.id !== payload.run!.id)].slice(
        0,
        8,
      ),
    );
    setHistoryLabel(
      `Viewing durable evidence for run_${payload.run.id.slice(0, 8)}.`,
    );
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
          <p className="mono">{fillPilotProof}</p>
          <Stage
            number="01"
            name="Diagnose"
            status={diagnosed ? "verified" : "ready"}
            detail={
              diagnosed
                ? "Controlled diagnosis saved for Ethereum Sepolia. A real KeeperHub doctor remains pending."
                : "Record a controlled prerequisite check. This cannot send a transaction."
            }
            action="Record controlled diagnosis"
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
            action="Record controlled dry-run"
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
            name="Canary boundary"
            status="locked"
            detail={
              proofVerified && canaryReady
                ? "FillPilot's public Base Sepolia proof record is valid. ChaosKit read the record without gaining any authority to submit another call."
                : proofVerified
                  ? "FillPilot's public Base Sepolia proof record is valid. Finish the controlled evidence stages to compare the documented test path with a real receipt."
                  : "FillPilot's public proof record could not be validated. ChaosKit cannot request a testnet write."
            }
            action="Proof read only, no write authority"
            disabled
          />
        </section>
        {error ? <p role="alert">{error}</p> : null}
        <aside className={styles.evidence} aria-live="polite">
          <h2>Evidence</h2>
          <p className="mono">No onchain action has been requested.</p>
          {evidence.length === 0 ? (
            <p className={styles.empty}>
              Run a stage to create durable controlled evidence.
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
          <h3 className={styles.historyTitle}>Recent controlled runs</h3>
          <p className={styles.historyLabel}>{historyLabel}</p>
          {recentRuns.length === 0 ? (
            <p className={styles.empty}>
              No durable runs are available in this environment.
            </p>
          ) : (
            <ol className={styles.history}>
              {recentRuns.map((run) => (
                <li key={run.id}>
                  <span className="mono">run_{run.id.slice(0, 8)}</span>
                  <span>Ethereum Sepolia ({run.expectedChainId})</span>
                  <button
                    type="button"
                    onClick={() => void showDurableEvidence(run.id)}
                  >
                    View evidence
                  </button>
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
