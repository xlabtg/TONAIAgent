# Task: Create User-Facing Security Documentation and Safe Defaults

**Priority:** MEDIUM  
**Effort:** ~3 days  
**Related Issue:** #304

## Problem

No user-facing documentation exists for:
- How to safely configure the platform before going live
- What simulation mode vs. live mode means
- Risk disclosures and limitations
- Pre-mainnet checklist for users

## Acceptance Criteria

- [ ] Create `docs/user-security-guide.md` — step-by-step guide for users
- [ ] Add prominent simulation mode indicator in Telegram Mini App UI
- [ ] Create "pre-launch checklist" that users must acknowledge before enabling live trading
- [ ] Add risk warnings to agent creation flow
- [ ] Document what data the platform collects and how it's protected
- [ ] Create `docs/mainnet-readiness-checklist.md` — checklist users must complete

## User Security Guide Outline

### Before Going Live

1. **Understand simulation mode** — all agents run in simulation by default
2. **Start small** — allocate 1-5% of your portfolio initially
3. **Verify your wallet address** — double-check before connecting
4. **Enable 2FA on Telegram** — your Telegram account IS your authentication
5. **Set conservative risk limits** — use `low` risk level for first 30 days
6. **Monitor your agent** — check daily for first week

### Risk Disclosures

- AI agents can and do lose money
- Past performance in simulation does not guarantee live performance
- Crypto markets are volatile — only invest what you can afford to lose
- Platform is not regulated in most jurisdictions
- Smart contract bugs could result in loss of funds

### Simulation vs. Live Mode

| Feature | Simulation | Live Trading |
|---------|-----------|-------------|
| Real funds used | No | Yes |
| Real blockchain transactions | No | Yes |
| PnL | Paper only | Real |
| Risk | None | Full |

## Files to Create

- `docs/user-security-guide.md` — comprehensive user security guide
- `docs/mainnet-readiness-checklist.md` — pre-launch checklist
- `docs/risk-disclosures.md` — legal risk disclosures
- `apps/telegram-miniapp/` — add simulation mode indicator to UI

## UI Changes

Add to agent dashboard:
```
⚠️ SIMULATION MODE — No real funds at risk
[Switch to Live Trading] ← requires confirmation modal
```

Confirmation modal for switching to live:
```
You are about to enable LIVE TRADING.
Real funds will be used. This cannot be undone per session.

[ ] I understand I may lose money
[ ] I have verified my wallet address  
[ ] I have set appropriate risk limits

[Cancel] [Enable Live Trading]
```
