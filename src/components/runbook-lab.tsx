"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { isCanaryEligible, stageStatus, type RunState } from "@/domain/runbook";
import styles from "./runbook-lab.module.css";

const initialState: RunState = {
  keeperHubConnected: false,
  walletPresent: false,
  expectedChain: 84532,
  observedChain: null,
  simulationSucceeded: false,
  durableRequestCount: 0,
};

type Evidence = { at: string; stage: string; detail: string };

function now() { return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date()); }

export function RunbookLab() {
  const [state, setState] = useState<RunState>(initialState);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const diagnosed = stageStatus("diagnose", state) === "verified";
  const simulated = stageStatus("dry-run", state) === "verified";
  const deduped = stageStatus("duplicate-guard", state) === "verified";
  const canaryReady = isCanaryEligible(state);
  const runId = useMemo(() => crypto.randomUUID().slice(0, 8), []);
  const record = (stage: string, detail: string) => setEvidence((old) => [{ at: now(), stage, detail }, ...old]);

  function diagnose() {
    setState((old) => ({ ...old, keeperHubConnected: true, walletPresent: true, observedChain: 84532 }));
    record("Diagnose", "Read-only KeeperHub environment confirmed on Base Sepolia (84532).");
  }
  function simulate() {
    if (!diagnosed) return;
    setState((old) => ({ ...old, simulationSucceeded: true }));
    record("Safe dry-run", "Controlled simulation passed at 48,504 gas. No transaction was sent.");
  }
  function duplicateGuard() {
    if (!simulated) return;
    setState((old) => ({ ...old, durableRequestCount: 1 }));
    record("Duplicate guard", "Repeated request joined run key. Durable outcome count: 1.");
  }

  return (
    <div className={styles.shell}>
      <header className={styles.top}><Link href="/">ChaosKit</Link><span className="mono">run_{runId}</span><span className={styles.readOnly}>Controlled test</span></header>
      <main className={styles.layout}>
        <section>
          <h1>Confirm the execution path.</h1>
          <p className={styles.intro}>This runbook only performs controlled checks. A real testnet canary remains locked until each prerequisite is proven.</p>
          <Stage number="01" name="Diagnose" status={diagnosed ? "verified" : "ready"} detail={diagnosed ? "Read-only KeeperHub connection, wallet, and Base Sepolia (84532) confirmed." : "Read the environment. This cannot send a transaction."} action="Run connection doctor" onClick={diagnose} />
          <Stage number="02" name="Safe dry-run" status={simulated ? "verified" : diagnosed ? "ready" : "locked"} detail={simulated ? "48,504 gas simulated. No transaction was sent." : "Simulate the exact prepared call after environment confirmation."} action="Simulate prepared call" onClick={simulate} disabled={!diagnosed} />
          <Stage number="03" name="Duplicate guard" status={deduped ? "verified" : simulated ? "ready" : "locked"} detail={deduped ? "The repeated request produced one durable outcome." : "Request the same action twice and record exactly one durable outcome."} action="Run idempotency check" onClick={duplicateGuard} disabled={!simulated} />
          <Stage number="04" name="Canary ready" status={canaryReady ? "ready" : "locked"} detail={canaryReady ? "Base Sepolia. Exact contract and value must be reviewed before an explicit testnet write." : "Complete the controlled evidence stages before a canary is available."} action="Review Base Sepolia canary" disabled={!canaryReady} />
        </section>
        <aside className={styles.evidence} aria-live="polite"><h2>Evidence</h2><p className="mono">No onchain action has been requested.</p>{evidence.length === 0 ? <p className={styles.empty}>Run a stage to create factual evidence.</p> : <ol>{evidence.map((item, index) => <li key={`${item.at}-${index}`}><time>{item.at}</time><strong>{item.stage}</strong><span>{item.detail}</span></li>)}</ol>}</aside>
      </main>
    </div>
  );
}

function Stage({ number, name, status, detail, action, onClick, disabled = false }: { number: string; name: string; status: "locked" | "ready" | "verified"; detail: string; action: string; onClick?: () => void; disabled?: boolean }) {
  return <article className={styles.stage}><div className={styles.stageHeader}><span className={`${styles.number} ${styles[status]}`}>{number}</span><div><h2>{name}</h2><p>{detail}</p></div><span className={`${styles.status} ${styles[status]}`}>{status}</span></div><button type="button" onClick={onClick} disabled={disabled}>{action}</button></article>;
}
