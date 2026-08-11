import Link from "next/link";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/">ChaosKit</Link>
      <nav aria-label="Primary navigation" className={styles.nav}>
        <Link href="/lab/demo-run">Runbook</Link>
        <a href="#evidence">Evidence</a>
        <a href="#how-it-works">Docs</a>
      </nav>
      <Link className={styles.action} href="/lab/new">Start a controlled test</Link>
    </header>
  );
}
