# Task: Enable Blueprint Contract Tests in Main CI

**Priority:** 🟠 HIGH
**Effort:** ~3 days
**Related Issue:** #325 (re-audit finding §3)
**Suggested labels:** `ci`, `smart-contracts`, `testing`

## Problem

`vitest.config.ts` explicitly excludes `contracts/tests/` from the standard test run. The 42+ Blueprint tests added in PR #321 can only be executed manually via `npx blueprint test`. As a result, every push to `main` can silently break the on-chain contract behaviour without surfacing a CI failure.

## Acceptance Criteria

- [ ] Add a dedicated CI job (`contracts-test`) that runs `npx blueprint test` on every pull request.
- [ ] Cache the Tact compiler toolchain to keep the job fast.
- [ ] Make the job a **required status check** on the `main` branch protection rules.
- [ ] Keep `vitest` excluding `contracts/tests/` (intentional — Blueprint has its own runner) but add a comment pointing to the new CI job.
- [ ] Update `CONTRIBUTING.md` with the "how to run contract tests locally" section.
- [ ] Ensure the job runs against the pinned Tact version from `package.json`.

## Proposed Implementation

```yaml
# .github/workflows/contracts.yml
name: Contract Tests
on:
  pull_request:
    paths:
      - 'contracts/**'
      - '.github/workflows/contracts.yml'
  push:
    branches: [main]

jobs:
  blueprint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx blueprint test
        working-directory: contracts
```

## Files to Create/Modify

- `.github/workflows/contracts.yml` (new)
- `CONTRIBUTING.md` — add "Running contract tests" section
- `vitest.config.ts` — add clarifying comment
- Branch protection rules (manual GitHub settings update) — capture in a setup note

## References

- Re-audit report §3: TON Smart Contracts
- PR #321 (merged)
- [Blueprint test runner](https://github.com/ton-org/blueprint)
