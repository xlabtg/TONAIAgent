# TONAIAgent — Technical Debt Report

> Issue #241 · Deliverable 4 of 6

---

## Overview

This report catalogs the accumulated technical debt in the TONAIAgent repository as of version 2.40.0. Each item is classified by category, estimated remediation effort, and priority relative to MVP readiness.

Technical debt is not inherently negative — much of it was accepted deliberately to enable rapid iteration. This report provides visibility so debt can be addressed systematically.

---

## Debt Severity Classification

| Level | Icon | Meaning |
|-------|------|---------|
| Critical | 🔴 | Blocks MVP or production deployment |
| High | 🟠 | Significantly impacts maintainability or scalability |
| Medium | 🟡 | Noticeable friction; should be resolved before scaling |
| Low | 🟢 | Minor; can be deferred indefinitely |

---

## 1. Architecture Debt

### TD-A1: Binary Artifacts in Version Control 🟠

**Description**: Four ZIP files (`installer.zip`, `php-app.zip`, `telegram-miniapp.zip`, `static-website.zip`) are committed to the repository root.

**Impact**:
- Inflates git history size permanently (binary blobs cannot be removed from existing clones without `git filter-repo`)
- Causes confusion — contributors cannot tell if these are source or build outputs
- Slows `git clone` for all contributors

**Remediation**:
1. Remove ZIPs from tracking via `git rm --cached *.zip`
2. Update `.gitignore`
3. Generate ZIPs in CI and publish as release artifacts

**Effort**: 30 minutes
**Priority**: High — should be done before any new contributors onboard

---

### TD-A2: 82 `src/` Modules Without Hierarchy 🟠

**Description**: All 82 TypeScript modules exist at the same depth in `src/` with no subdirectory organization. No visual distinction between core, extended, and research modules.

**Impact**:
- New contributors cannot identify what to focus on
- No enforced boundaries between modules
- Circular dependency risk increases with flat structure
- IDE navigation is difficult

**Remediation**: See [refactoring-roadmap.md H2](refactoring-roadmap.md#horizon-2--structure-mvp-short-term) for consolidation plan.

**Effort**: 6–8 weeks
**Priority**: Medium — important pre-scale, not blocking MVP

---

### TD-A3: Duplicate Mini App Implementations 🟠

**Description**: Three implementations of the Telegram Mini App:
1. `miniapp/` — vanilla JS frontend (34 KB `production.js`, 17 KB `app.js`)
2. `telegram-miniapp/` — PHP backend
3. `src/production-miniapp/` — TypeScript module

No single owner or canonical version is documented.

**Impact**:
- Features implemented in one are missed in others
- Bug fixes must be applied in multiple places
- New developers don't know which to modify

**Remediation**:
1. Document the current production stack (which files are live)
2. Define `miniapp/` + `telegram-miniapp/` as canonical until TypeScript migration
3. Deprecate `src/production-miniapp/` or clearly mark as "next version"

**Effort**: 2 hours (documentation) + 3–4 months (full TS migration)
**Priority**: Medium

---

### TD-A4: Two Website Implementations 🟡

**Description**: `website/` (Next.js) and `static-website/` (static HTML) both exist and presumably represent the same product.

**Impact**:
- Content must be maintained in two places
- 58 KB `static-website/index.html` is unmaintainable
- Deployment choice is unclear

**Remediation**: Decide which is canonical; archive the other; redirect traffic.

**Effort**: 1 day (decision + redirect setup)
**Priority**: Medium

---

### TD-A5: Research Modules Mixed with Production Code 🟠

**Description**: 8 research/experimental modules (`agfi`, `agfn`, `gaei`, `gaamp`, `grif`, `sgia`, `aifos`, `acms`) live in `src/` alongside production modules with no distinction.

**Impact**:
- New contributors may invest time in research code thinking it's production
- Research code may have lower test coverage and quality standards
- Module count inflated by 10%

**Remediation**: Move to `research/` directory per [restructuring-plan.md Phase 1](restructuring-plan.md#phase-1--docs-and-research-separation-non-breaking).

**Effort**: 2 hours
**Priority**: High — low effort, high clarity gain

---

## 2. Code Quality Debt

### TD-C1: Monolithic Vanilla JS Files 🟡

**Description**: `miniapp/production.js` (34 KB) and `miniapp/app.js` (17 KB) are single large files with no module boundaries.

**Impact**:
- Hard to test individual functions
- No tree-shaking possible
- Difficult to onboard new frontend developers

**Remediation**: Refactor to ES modules; apply component-based structure; add build step.

**Effort**: 2–3 weeks
**Priority**: Medium — address during TypeScript migration

---

### TD-C2: No TypeScript Strict Mode in Main Config 🟡

**Description**: `tsconfig.json` targets ES2020 but `tsconfig.strict.json` is a separate file. Strict mode is not enforced by default in the main build.

**Impact**:
- Type safety gaps may exist in production code
- `any` types may be used silently

**Remediation**: Enable `strict: true` in `tsconfig.json` and resolve all type errors.

**Effort**: 1–2 weeks
**Priority**: Medium

---

### TD-C3: `src/index.ts` is 1,720 Lines 🟡

**Description**: The main export manifest is 1,720 lines and growing. It re-exports everything from all 82 modules.

**Impact**:
- Becomes a merge conflict hotspot
- Slow to parse and comprehend
- Any module refactoring requires touching this file

**Remediation**: Split into domain-specific barrel files; reduce to top-level domain imports.

**Effort**: 4 hours
**Priority**: Medium

---

### TD-C4: `package.json` is 582 Lines 🟡

**Description**: The root `package.json` contains 66 export entries, all build scripts, all dev dependencies in a single 582-line file.

**Impact**:
- Difficult to navigate
- Long list of `exports` creates maintenance burden
- All 66 entries must be updated for any path change

**Remediation**: Auto-generate `exports` field from directory structure; adopt workspace-level `package.json` files.

**Effort**: 4 hours
**Priority**: Low

---

### TD-C5: PHP Installer Non-Standard for TS Project 🟠

**Description**: `installer/` is a PHP-based multi-step installation wizard for a primarily TypeScript project.

**Impact**:
- Requires PHP runtime to install a TypeScript project
- Inconsistent developer experience
- Cannot be tested with TypeScript test tooling

**Remediation**: Replace with `@tonaiagent/create` CLI (TypeScript); see [refactoring-roadmap.md H3-1](refactoring-roadmap.md#h3-1-replace-php-installer-with-typescript-cli).

**Effort**: 2–3 weeks
**Priority**: Medium

---

## 3. Testing Debt

### TD-T1: No Enforced Coverage Threshold 🟠

**Description**: `vitest.config.*` does not define a minimum coverage threshold. There is no CI gate to prevent coverage regression.

**Impact**:
- Code can be merged with 0% coverage
- Coverage trends are invisible until manually checked

**Remediation**: Add `coverage.thresholds` to Vitest config; enforce in CI.

**Effort**: 2 hours
**Priority**: High

---

### TD-T2: No Integration Tests for PHP Backend 🟡

**Description**: `telegram-miniapp/` and `php-app/` have no automated tests visible in the repository.

**Impact**:
- PHP API behavior cannot be verified automatically
- Regressions go undetected until manual testing

**Remediation**: Add PHPUnit tests for API endpoints; or prioritize TypeScript migration.

**Effort**: 1–2 weeks
**Priority**: Medium

---

### TD-T3: No End-to-End (E2E) Tests 🟡

**Description**: No E2E test suite exists for the Mini App UI or agent execution flows.

**Impact**:
- UI regressions go undetected
- Agent execution path cannot be validated end-to-end automatically

**Remediation**: Add Playwright tests for Mini App UI; add agent simulation integration tests.

**Effort**: 2–3 weeks
**Priority**: Medium

---

### TD-T4: Test Coverage Gaps in Newer Modules 🟡

**Description**: `tests/` has 81 directories vs 82 `src/` modules. Several recently added modules may have incomplete test coverage.

**Impact**:
- New modules may have untested edge cases
- Coverage gaps grow with each new module added

**Remediation**: Identify missing test files; add minimum test scaffolding for all modules.

**Effort**: 1 week
**Priority**: Medium

---

## 4. Documentation Debt

### TD-D1: No Developer Onboarding Guide 🟠

**Description**: No single document explains how a new contributor should set up, understand, and start contributing to the project.

**Impact**:
- New contributors spend hours figuring out the setup
- Friction increases with project complexity

**Remediation**: Create `docs/developer-onboarding.md` (see [developer-onboarding.md](developer-onboarding.md)).

**Effort**: 3 hours
**Priority**: High — low effort, high impact

---

### TD-D2: Flat `docs/` Directory with 52 Files 🟡

**Description**: All 52 documentation files are at the root of `docs/` with no subdirectory organization.

**Impact**:
- Hard to navigate
- No clear entry point for different personas (developer, operator, investor)

**Remediation**: Organize into `docs/architecture/`, `docs/guides/`, `docs/modules/`, `docs/roadmap/`.

**Effort**: 3 hours (file moves + cross-reference updates)
**Priority**: Medium

---

### TD-D3: Documentation May Be Partially Outdated 🟡

**Description**: With 241+ issues and rapid iteration, some documentation files may describe behavior that no longer matches the current code.

**Impact**:
- Incorrect documentation is worse than no documentation
- New contributors may implement based on outdated specs

**Remediation**: Audit each doc against current code; mark outdated sections; schedule regular doc reviews.

**Effort**: 1 week
**Priority**: Medium

---

### TD-D4: README Architecture Section Does Not Reflect 82-Module Reality 🟡

**Description**: `README.md` lists only 10 core components in the architecture section. The repository actually contains 82 modules, but this is not communicated.

**Impact**:
- Misalignment of expectation vs reality for new contributors
- Makes project seem simpler than it is

**Remediation**: Update README architecture section to explain the module hierarchy.

**Effort**: 2 hours
**Priority**: Medium

---

## 5. Infrastructure Debt

### TD-I1: Duplicate GitHub Actions Definitions 🟢

**Description**: `deploy/github-actions/` contains workflow YAML files that appear to duplicate (or be earlier versions of) `.github/workflows/`.

**Impact**:
- Confusion about which is authoritative
- Risk of deploying stale workflow definitions

**Remediation**: Remove `deploy/github-actions/` or clearly label as "examples/reference copies."

**Effort**: 30 minutes
**Priority**: Low

---

### TD-I2: Multiple Script Locations 🟢

**Description**: Build/utility scripts are spread across `scripts/` (1 file) and `deploy/scripts/` (3 files).

**Impact**:
- Operators cannot find all scripts in one place

**Remediation**: Consolidate into `infrastructure/scripts/` or `scripts/`.

**Effort**: 30 minutes
**Priority**: Low

---

### TD-I3: `deploy/` Subdirectory Naming Inconsistency 🟢

**Description**: `deploy/` contains `aws/`, `kubernetes/`, `docker/`, `vercel/`, `global/`, `monitoring/` — each with different internal structures and different levels of documentation maturity.

**Impact**:
- New DevOps engineers face varying levels of documentation per platform

**Remediation**: Standardize: each subdirectory should have a `README.md`, `variables.example`, and consistent naming.

**Effort**: 1 day
**Priority**: Low

---

## 6. Security Debt

### TD-S1: PHP Installer Stores Credentials in Flat Files 🔴

**Description**: The PHP `installer/` writes database credentials and API keys to `.env` files during setup. This is standard practice but requires a clear security warning.

**Impact**:
- If `.env` files are not properly protected, credentials may leak
- No documentation of secret rotation procedures

**Remediation**:
1. Verify `.gitignore` excludes all `.env` files (currently included: `*.env`, `.env*`)
2. Add explicit security warning in installer README
3. Document secret rotation procedure in `docs/guides/security.md`

**Effort**: 2 hours
**Priority**: High

---

### TD-S2: No Security Policy (`SECURITY.md`) 🟡

**Description**: The repository does not have a `SECURITY.md` file defining the vulnerability disclosure policy.

**Impact**:
- Security researchers don't know how to report vulnerabilities
- GitHub security features (Dependabot alerts) may be unconfigured

**Remediation**: Create `SECURITY.md` with responsible disclosure policy and contact information.

**Effort**: 1 hour
**Priority**: Medium

---

## Debt Summary Table

| ID | Category | Description | Severity | Effort |
|----|----------|-------------|----------|--------|
| TD-A1 | Architecture | Binary artifacts in git | 🟠 High | 30 min |
| TD-A2 | Architecture | 82 flat `src/` modules | 🟠 High | 6–8 wks |
| TD-A3 | Architecture | Duplicate Mini App implementations | 🟠 High | 2h + months |
| TD-A4 | Architecture | Two website implementations | 🟡 Medium | 1 day |
| TD-A5 | Architecture | Research mixed with production | 🟠 High | 2 hours |
| TD-C1 | Code Quality | Monolithic vanilla JS files | 🟡 Medium | 2–3 wks |
| TD-C2 | Code Quality | No strict TypeScript by default | 🟡 Medium | 1–2 wks |
| TD-C3 | Code Quality | 1,720-line `src/index.ts` | 🟡 Medium | 4 hours |
| TD-C4 | Code Quality | 582-line `package.json` | 🟡 Medium | 4 hours |
| TD-C5 | Code Quality | PHP installer for TS project | 🟠 High | 2–3 wks |
| TD-T1 | Testing | No coverage threshold | 🟠 High | 2 hours |
| TD-T2 | Testing | No PHP backend tests | 🟡 Medium | 1–2 wks |
| TD-T3 | Testing | No E2E tests | 🟡 Medium | 2–3 wks |
| TD-T4 | Testing | Test coverage gaps | 🟡 Medium | 1 week |
| TD-D1 | Documentation | No onboarding guide | 🟠 High | 3 hours |
| TD-D2 | Documentation | Flat docs directory | 🟡 Medium | 3 hours |
| TD-D3 | Documentation | Potentially outdated docs | 🟡 Medium | 1 week |
| TD-D4 | Documentation | README doesn't reflect scale | 🟡 Medium | 2 hours |
| TD-I1 | Infrastructure | Duplicate CI definitions | 🟢 Low | 30 min |
| TD-I2 | Infrastructure | Multiple script locations | 🟢 Low | 30 min |
| TD-I3 | Infrastructure | Deploy subdir inconsistency | 🟢 Low | 1 day |
| TD-S1 | Security | Installer credential handling | 🔴 Critical | 2 hours |
| TD-S2 | Security | No SECURITY.md | 🟡 Medium | 1 hour |

---

## Recommended Resolution Order

### Sprint 1 (This Week)
1. TD-S1 — Installer credential security documentation
2. TD-A1 — Remove ZIP artifacts
3. TD-A5 — Move research modules to `research/`
4. TD-D1 — Create developer onboarding guide
5. TD-T1 — Add coverage threshold

### Sprint 2 (Next 2 Weeks)
6. TD-D2 — Organize docs directory
7. TD-D4 — Update README architecture section
8. TD-S2 — Add SECURITY.md
9. TD-I1, TD-I2 — Clean up duplicate CI + scripts

### Sprint 3 (MVP Milestone)
10. TD-A4 — Decide on canonical website
11. TD-C3 — Refactor `src/index.ts`
12. TD-C2 — Enable TypeScript strict mode
13. TD-A3 — Document canonical Mini App implementation
14. TD-T1 — Enforce coverage in CI

### Post-MVP
15. TD-A2 — Module consolidation (Horizon 2)
16. TD-C1 — Mini App JS refactor
17. TD-C5 — CLI installer
18. TD-T2, TD-T3 — PHP + E2E tests
19. TD-A3 (full) — PHP to TypeScript migration

---

*See also: [architecture-audit.md](architecture-audit.md), [restructuring-plan.md](restructuring-plan.md), [refactoring-roadmap.md](refactoring-roadmap.md)*
