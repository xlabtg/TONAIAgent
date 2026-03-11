# TON AI Agent — Development Guidelines

> **Architecture Freeze Notice**: As of Issue #178, the MVP architecture is frozen. All development must align with the [MVP Architecture](./mvp-architecture.md). Non-MVP features are postponed to future milestones.

---

## Guiding Principles

1. **MVP First** — Every piece of work must map to a core MVP component. If it doesn't appear in the [MVP Architecture](./mvp-architecture.md), it belongs in a future issue.
2. **Simple and Stable** — Prefer simple, working code over clever or complex solutions.
3. **Deployable** — Every change must be deployable on standard PHP + MySQL hosting via the installer.
4. **Telegram-Native** — The primary user interface is the Telegram Mini App. Design all user-facing features for mobile Telegram usage.

---

## MVP Architecture Alignment

Before starting any work, verify that your task aligns with one of the eight core MVP components:

| Component | Scope |
|-----------|-------|
| Telegram Bot | Bot commands, webhook, notifications |
| Telegram Mini App | Dashboard, Create Agent, Strategy Marketplace, Analytics screens |
| Backend API | `/agents/*` endpoints, Telegram webhook handler |
| Agent Manager | Lifecycle state machine, scheduling, persistence |
| Strategy Engine v1 | Trend Following, Basic Arbitrage, AI Signal Strategy |
| Trading Simulator | CoinGecko/Binance data fetching, simulated trade execution |
| Portfolio Analytics | PnL, portfolio value, charts |
| Installer System | One-click deployment wizard |

If your task falls outside these components, it should be scoped to a future milestone issue.

---

## Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | PHP 8.0+ | Core application logic |
| Database | MySQL 8.0+ / MariaDB 10.3+ | Schema managed via `database/schema.sql` |
| Frontend | HTML/CSS/JS (Telegram Mini App) | No build step required for MVP |
| Bot | Telegram Bot API | Webhook-based, no polling |
| AI Provider | Groq (primary), OpenAI/Anthropic (fallback) | Server-side only |
| Hosting | Standard PHP web hosting | Apache/Nginx, shared or VPS |

---

## Branch and Commit Guidelines

- Work only on the issue-specific branch (e.g., `issue-178-be995a098eae`)
- Write clear, descriptive commit messages
- Follow the format: `type(scope): description`
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
  - Examples: `feat(agents): add PAUSED state to lifecycle`, `docs(readme): update MVP Architecture section`
- Each atomic, useful change should be its own commit
- Do not push directly to `main`

---

## Coding Standards

### PHP

- PHP 8.0+ syntax (match expressions, named arguments, enums)
- PSR-12 coding style
- All database queries use PDO prepared statements
- All user input is sanitized before use
- Sensitive config values in `.env`, never committed
- Errors logged to `storage/logs/` — do not expose to users

### JavaScript (Mini App)

- Vanilla JS for the Mini App (no framework required for MVP)
- Use the Telegram WebApp API for all UI interactions (`window.Telegram.WebApp`)
- Verify `initData` signature on every API call
- No API keys in frontend JavaScript — all AI calls go through the PHP backend

### Database

- All schema changes in `database/schema.sql` (or versioned migration files)
- Use `utf8mb4` charset for all tables
- Index foreign keys and frequently queried columns

---

## Security Requirements

All contributions must follow these security rules:

1. **Authentication**: Every API endpoint (except `/health` and `/api/webhook/telegram`) requires valid Telegram WebApp `initData` or a session token
2. **Input Validation**: Validate and sanitize all input — strings, numbers, strategy names, agent IDs
3. **SQL Injection Prevention**: Use PDO prepared statements exclusively — no string interpolation in queries
4. **CSRF Protection**: Include CSRF tokens in all state-changing form submissions
5. **Rate Limiting**: Apply rate limiting to all API endpoints
6. **HTTPS**: The application requires HTTPS — document this as a hard requirement
7. **Telegram Signature**: Verify Telegram `initData` HMAC signature on all Mini App API calls
8. **No Secrets in Code**: All credentials in `.env` — never committed to the repository

---

## Testing

- Write unit tests for core business logic (Agent Manager state transitions, Strategy Engine outputs, Analytics calculations)
- Integration tests for API endpoints
- Test simulation mode separately from any future live mode
- Run tests before pushing: `npm test` (TypeScript modules) or the PHP test suite

---

## Pull Request Requirements

Before opening a pull request:

1. Confirm the change maps to an MVP component in the [MVP Architecture](./mvp-architecture.md)
2. Ensure `git status` shows a clean working tree with no uncommitted changes
3. Merge latest `main` into your branch and resolve all conflicts
4. Run all local CI checks (linting, type checking, tests)
5. Include a clear description of what changed and why
6. Link the PR to the relevant issue (`Fixes #NNN`)

---

## Issue Labeling and Scope

When creating issues for MVP work, follow these guidelines:

- Label by component: `telegram-bot`, `mini-app`, `backend-api`, `agent-manager`, `strategy-engine`, `simulator`, `analytics`, `installer`
- Label by type: `feat`, `bug`, `docs`, `chore`
- Issues must fit within one of the eight MVP components — if not, label as `phase-2` or `future`
- Include acceptance criteria in the issue body

---

## Out-of-Scope Work

The following are explicitly **out of scope** and must not be included in MVP issues or PRs:

- DAO governance
- Hedge fund infrastructure
- Global liquidity networks
- Cross-chain liquidity
- Clearing house systems
- Institutional compliance layers
- Multi-chain / Omnichain support

If work on these topics is valuable, open a separate issue labeled `phase-2` or `phase-3` and do not include it in MVP-scoped PRs.

---

## Related Documents

- [MVP Architecture](./mvp-architecture.md)
- [MVP Feature Checklist](./mvp-checklist.md)
- [MVP Module List](./mvp-modules.md)
