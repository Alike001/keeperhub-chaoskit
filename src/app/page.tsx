import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import styles from "./page.module.css";

const stages = [
  ["01", "Diagnose", "Read connection, wallet, chain, reserve, and allowance. No transaction."],
  ["02", "Safe dry-run", "Simulate the exact intended call and record its gas and result."],
  ["03", "Duplicate guard", "Send the same controlled request twice and prove one durable outcome."],
  ["04", "Canary ready", "Show the exact Base Sepolia boundary before an operator can opt in."],
] as const;

export default function LandingPage() {
  return (
    <main>
      <SiteHeader />
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>Know it will recover before it moves value.</h1>
          <p>ChaosKit is a controlled reliability lab for KeeperHub builders. Test the execution path before a workflow can expose funds.</p>
          <ul className="mono">
            <li>Controlled faults, clearly labelled.</li>
            <li>One durable outcome, even when a request repeats.</li>
            <li>Testnet canary, exact boundary, explicit operator approval.</li>
          </ul>
          <Link className={styles.primary} href="/lab/new">Start a controlled test <span aria-hidden>→</span></Link>
        </div>
        <ol className={styles.rail} aria-label="Four controlled test stages">
          {stages.map(([number, name, description], index) => (
            <li key={name} className={styles.stage}>
              <span className={index === 2 ? styles.blocked : index === 3 ? styles.ready : styles.done}>{number}</span>
              <div><h2>{name}</h2><p>{description}</p></div>
            </li>
          ))}
        </ol>
      </section>
      <section className={styles.evidence} id="evidence">
        <div><h2>A failure is useful when it leaves evidence.</h2><p>Every stage records what was checked, what happened, and whether a transaction existed. This lets a new builder learn from a failed prerequisite without mistaking it for a failed transfer.</p></div>
        <div className={styles.table} role="table" aria-label="Evidence fields">
          <div role="row"><span role="columnheader">Stage</span><span role="columnheader">Evidence</span><span role="columnheader">Meaning</span></div>
          <div role="row"><span role="cell">Safe dry-run</span><span role="cell">gas, revert result, call hash</span><span role="cell">No transaction was sent</span></div>
          <div role="row"><span role="cell">Duplicate guard</span><span role="cell">idempotency key, record count</span><span role="cell">One durable outcome</span></div>
          <div role="row"><span role="cell">Canary</span><span role="cell">chain, contract, value, receipt</span><span role="cell">Explicit testnet proof</span></div>
        </div>
      </section>
      <section className={styles.docs} id="how-it-works"><p className="mono">KeeperHub onboarding improvement</p><h2>Build confidence from facts, not from a happy-path demo.</h2></section>
    </main>
  );
}
