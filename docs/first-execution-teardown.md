# From zero to one verified KeeperHub execution

ChaosKit is a reproducible onboarding teardown for a builder who needs to tell four states apart: a configuration check, a simulation, a KeeperHub execution, and an onchain receipt.

The goal is not to make every check look successful. The goal is to make the first real execution understandable, bounded, and easy to verify.

## What this teardown covers

The reference path uses a KeeperHub organization wallet and a Base Sepolia public canary. It ends with this completed KeeperHub execution:

- KeeperHub execution ID: `dpnxfa52zwzoz58pod0f4`
- Chain: Base Sepolia, `84532`
- Transaction: [`0x843bdfd7be5b74bf3396792611c623f283eeec64d9f386e72448fe5da60520aa`](https://sepolia.basescan.org/tx/0x843bdfd7be5b74bf3396792611c623f283eeec64d9f386e72448fe5da60520aa)
- Call: zero-value `ping(bytes32)` on an already deployed external public canary
- Receipt: succeeded, with the expected `Flightcheck` event

This is execution-rail evidence only. It is not a ChaosKit deployment, FillPilot-owned contract, token approval, CoW order, or financial fill.

## The shortest safe path

1. Create or select a KeeperHub organization and its EVM-compatible organization wallet.
2. Select the target testnet inside the organization wallet. For this path, use Base Sepolia, chain ID `84532`.
3. Fund that same organization wallet with a small amount of Base Sepolia ETH. Ethereum Sepolia ETH does not pay Base Sepolia gas.
4. Connect the builder product to KeeperHub over the remote MCP endpoint, then approve the organization access request.
5. Read the wallet, target chain, and native gas balance. Treat this as a prerequisite check, not a transaction.
6. Simulate the exact reviewed call. Record the contract, function, calldata, value, and gas estimate. Treat this as a simulation, not a transaction.
7. Review the exact write with a human, submit it once through KeeperHub with a stable idempotency key, then poll its execution status.
8. Verify the returned transaction hash on the target-chain explorer. A completed KeeperHub status and a successful chain receipt are separate facts that should agree.

## What we actually observed

| Boundary                          | Observed result                                                                         | What it means                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| KeeperHub organization connection | OAuth approval completed after a fresh connection                                       | The builder product can read the selected KeeperHub organization. It does not imply a transaction exists.                      |
| Base Sepolia funding              | The organization wallet showed Base Sepolia ETH on BaseScan                             | The wallet can pay gas on chain `84532`. It does not prove sponsorship on another chain.                                       |
| Exact-call simulation             | KeeperHub simulated the zero-value public-canary `ping(bytes32)` call at 23,929 gas     | The reviewed bytes were executable in the simulation context. It did not deploy, approve, sign, submit, or send a transaction. |
| KeeperHub execution               | Execution `dpnxfa52zwzoz58pod0f4` reached `completed`                                   | KeeperHub accepted the exact approved request. Polling still had to retrieve the chain proof.                                  |
| Onchain receipt                   | Base Sepolia receipt succeeded and emitted `Flightcheck`                                | The chain independently confirms the bounded call and sender.                                                                  |
| Repeated submit                   | The same idempotency key returned an idempotent replay rather than a second transaction | Duplicate protection is part of execution reliability, not an error to hide.                                                   |

## Friction points and the exact lesson

### 1. The selected wallet and the funded wallet can be different

**Reproduction:** View the KeeperHub organization wallet on Base Sepolia, then fund it with Base Sepolia ETH before preparing the canary execution.

**Observed outcome:** Testnet balances are chain-specific. Ethereum Sepolia ETH cannot pay Base Sepolia gas, so the execution wallet must be funded on Base Sepolia.

**Lesson:** Every preflight needs the tuple `wallet address + chain ID + native asset`, not a generic “wallet funded” label.

**Proposed improvement:** In the organization wallet and direct-execution review, show a chain-specific gas row that links the selected execution chain to the same wallet address. Warn when a balance exists only on another network.

### 2. A simulation is valuable, but it is not a transaction

**Reproduction:** Run a KeeperHub simulation for an exact call and inspect the returned gas estimate.

**Observed outcome:** The simulation returns callable bytes and gas evidence without a transaction hash or a chain receipt.

**Lesson:** A UI that calls simulation “executed” trains builders to claim the wrong result.

**Proposed improvement:** Standardize four visible lifecycle labels across the product surface: `preflight`, `simulated`, `submitted`, and `confirmed onchain`. Each label should state whether a transaction hash exists.

### 3. The result of a submit needs independent reconciliation

**Reproduction:** Submit one reviewed, zero-value testnet call through KeeperHub, save the returned execution ID, then poll status and open the returned chain receipt.

**Observed outcome:** The execution ID and completed status appeared before the chain receipt was independently checked.

**Lesson:** “Completed” is an important execution-plane signal, but the final evidence is the matching transaction hash and receipt.

**Proposed improvement:** Make a terminal execution view place the execution ID, transaction hash, explorer link, gas, and final receipt state in one copyable receipt card. The product should distinguish a completed status without a transaction hash from a confirmed onchain result.

### 4. Idempotency needs a visible outcome

**Reproduction:** Retry the exact same reviewed request with the same stable idempotency key.

**Observed outcome:** KeeperHub returned an idempotent replay. It did not create a second chain transaction.

**Lesson:** A retry can be safe only when the client and execution layer identify the request consistently.

**Proposed improvement:** Expose the idempotency key and replay state in the execution receipt so a builder can explain why a second click changed no chain state.

### 5. Application OAuth storage must be durable on serverless hosting

**Reproduction:** Start OAuth on one serverless instance, then handle the callback on another while storing the authorization attempt only in the local temporary filesystem.

**Observed outcome:** The callback can lose the saved redirect URL, state, or PKCE verifier because serverless instances do not share `/tmp`.

**Lesson:** This was a FillPilot application bug, not a KeeperHub bug. It occurred during this build and was fixed by saving the short-lived encrypted OAuth state in Postgres.

**Proposed improvement for builders:** Treat OAuth state as encrypted, short-lived server-side data. Use a shared database or managed session store, validate state before token exchange, and never put tokens in browser storage.

## What ChaosKit adds

ChaosKit turns those lessons into a small, interactive preflight lab:

1. A controlled diagnosis records the selected prerequisite boundary.
2. A controlled dry run records that a simulation is not a write.
3. A duplicate guard proves one durable outcome for repeated controlled requests.
4. A read-only adapter validates the completed FillPilot proof without receiving any KeeperHub credential or write authority.

The first three stages are explicitly controlled local evidence. They are not presented as KeeperHub calls or onchain activity. The fourth is a real read-only reference to a completed KeeperHub execution.

## Run it locally

Requirements: Node.js 24+, pnpm 10+, and PostgreSQL.

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Open `http://127.0.0.1:3001/lab/new` and run the stages in order. The evidence panel will retain controlled runs in PostgreSQL. Set `FILLPILOT_URL=http://127.0.0.1:3000` only when FillPilot is also running locally. ChaosKit reads only FillPilot's public proof endpoint.

## Verify the contribution

```bash
pnpm test
pnpm lint
pnpm typecheck
```

For the live version, open [ChaosKit](https://keeperhub-chaoskit.vercel.app) and [FillPilot's public proof](https://fillpilot-six.vercel.app/proof/base-sepolia-canary-20260812). The production app does not receive a KeeperHub API key, private key, testnet write flag, or mainnet write flag.

## Scope and limits

- ChaosKit does not submit a transaction, retry a KeeperHub execution, approve tokens, deploy a contract, or place a CoW order.
- The reference transaction is a single external public Base Sepolia canary. It should not be replayed for a demo.
- This document reports observations from one build path. It does not claim that every KeeperHub organization, wallet, chain, or workflow has the same configuration.
