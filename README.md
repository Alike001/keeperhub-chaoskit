# ChaosKit

ChaosKit is a controlled onboarding lab for KeeperHub builders. It helps a new builder prove the execution path before their workflow is allowed to expose value.

Public app: [keeperhub-chaoskit.vercel.app](https://keeperhub-chaoskit.vercel.app)

ChaosKit is submitted as a separate Best Onboarding UX Improvement bounty contribution. Its teardown is the primary artifact, and the lab is a controlled companion. It is not a KeeperHub execution client and does not submit transactions.

Read the [first-execution onboarding teardown](docs/first-execution-teardown.md) for the exact tested path, observed outcomes, and proposed improvements that shaped the lab.

The problem is practical: a first KeeperHub workflow can fail for several reasons, such as missing wallet setup, wrong network, failed simulation, or duplicate triggers. A builder needs evidence that explains which boundary failed without mistaking a controlled test for a transfer.

## What it does

1. Records a controlled Base Sepolia connection diagnosis with no transaction.
2. Records a controlled Base Sepolia safe dry-run with no transaction.
3. Runs a duplicate-request test and proves one durable database outcome.
4. Reads FillPilot's completed public Base Sepolia proof record without receiving any KeeperHub credential or write authority.

The fourth stage stays visibly locked. ChaosKit never submits, retries, signs, deploys, approves tokens, or sends a transaction. Its job is to make the route to a first real execution understandable and reproducible.

## Why this fits the bounty

The KeeperHub Best Onboarding UX Improvement bounty asks for work that gets a new builder from zero to a first executed transaction faster. ChaosKit contributes the layer before that first write:

- clear separation of diagnosis, simulation, idempotency, submission, and receipt states
- durable evidence that survives a page reload
- a real, read-only reference to a completed KeeperHub execution
- explicit language that prevents a controlled test from looking like a live transaction

## Real execution reference

ChaosKit validates FillPilot's public proof record. The record identifies a completed, zero-value Base Sepolia KeeperHub canary call and links to its independently verifiable transaction receipt:

- [Base Sepolia transaction receipt](https://sepolia.basescan.org/tx/0x843bdfd7be5b74bf3396792611c623f283eeec64d9f386e72448fe5da60520aa)
- FillPilot execution ID: `dpnxfa52zwzoz58pod0f4`

This receipt is external evidence. It is not created, controlled, or replayed by ChaosKit.

## Local setup

Requirements: Node.js 24+, pnpm 10+, and PostgreSQL.

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev -- --port 3001
```

Open `http://127.0.0.1:3001` and choose **Start a controlled test**. PostgreSQL must be running before the migration and the controlled lab.

When both apps run locally, start FillPilot on port `3000` and ChaosKit on port `3001`. Set `FILLPILOT_URL=http://127.0.0.1:3000` in ChaosKit only when FillPilot is running. ChaosKit calls only FillPilot's fixed public proof endpoint. It does not read API keys, browser sessions, or wallet credentials from FillPilot. The controlled lab uses Base Sepolia chain ID `84532` to match the published proof.

## Verification

```bash
pnpm test
pnpm lint
pnpm typecheck
```

The PostgreSQL integration tests use `TEST_DATABASE_URL`. Vitest skips those tests when the environment is absent, so run the complete suite with:

```bash
node --env-file=.env.local node_modules/vitest/vitest.mjs run
```

Public lab writes are bounded by a small anonymous rate limit and remain controlled evidence only. The production app does not receive a KeeperHub API key, private key, testnet write flag, or mainnet write flag.

## Known boundaries

- The first three stages create controlled PostgreSQL evidence. They do not call KeeperHub or a blockchain.
- The final stage reads FillPilot's published proof record and links to BaseScan. It has no write authority and does not independently submit or replay the transaction.
- A local two-app run needs FillPilot on port 3000 for the read-only proof adapter. ChaosKit still runs its controlled lab without FillPilot.
