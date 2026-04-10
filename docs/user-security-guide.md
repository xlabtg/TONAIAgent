# User Security Guide

> **Before you go live with real funds, read this guide carefully.**

## Table of Contents

1. [Understanding Simulation Mode vs. Live Trading](#simulation-vs-live)
2. [Before Going Live — Step-by-Step Checklist](#before-going-live)
3. [Risk Disclosures Summary](#risk-disclosures)
4. [How Your Data Is Protected](#data-protection)
5. [Safe Configuration Practices](#safe-configuration)
6. [Ongoing Monitoring](#ongoing-monitoring)
7. [Emergency Procedures](#emergency-procedures)

---

## 1. Understanding Simulation Mode vs. Live Trading {#simulation-vs-live}

All agents run in **simulation mode by default**. No real funds are ever used in simulation.

| Feature                      | Simulation Mode      | Live Trading         |
|------------------------------|----------------------|----------------------|
| Real funds used              | **No**               | **Yes**              |
| Real blockchain transactions | **No**               | **Yes**              |
| P&L shown                    | Paper only           | Real money           |
| Risk of loss                 | None                 | Full                 |
| Requires wallet connection   | No                   | Yes                  |
| Can be undone                | Always               | Transactions are final |

> **Tip:** Run your agent in simulation for at least 14 days before enabling live trading. This lets you verify the strategy behaves as expected without financial risk.

---

## 2. Before Going Live — Step-by-Step Checklist {#before-going-live}

Work through each item in order. Do not enable live trading until all boxes are checked.

### Step 1 — Understand Simulation Mode
- [ ] I have read the simulation vs. live trading table above.
- [ ] My agent has been running in simulation for at least 7 days.
- [ ] I have reviewed the simulation P&L and trade history.

### Step 2 — Start Small
- [ ] I will allocate no more than 1–5% of my portfolio to this agent initially.
- [ ] I understand that past simulation performance does not guarantee live performance.

### Step 3 — Verify Your Wallet Address
- [ ] I have double-checked my TON wallet address before connecting.
- [ ] I have confirmed I control the private key for this wallet.
- [ ] I have verified the wallet address by sending a small test transaction first.

### Step 4 — Secure Your Telegram Account
- [ ] I have enabled **Two-Factor Authentication (2FA)** on my Telegram account.
  *(Settings → Privacy and Security → Two-Step Verification)*
- [ ] I understand that my Telegram account IS my authentication — whoever controls it controls my agents.
- [ ] I have stored my Telegram 2FA recovery code in a safe place.

### Step 5 — Set Conservative Risk Limits
- [ ] I have selected the `low` risk level for my first 30 days of live trading.
- [ ] I have set a maximum drawdown limit I am comfortable with.
- [ ] I understand what each risk level means:
  - **Low** — smaller position sizes, stop-losses at 2–3%
  - **Medium** — standard position sizes, stop-losses at 5–8%
  - **High** — larger positions, wider stop-losses, higher potential loss

### Step 6 — Plan Your Monitoring
- [ ] I will check my agent dashboard daily during the first week.
- [ ] I know how to pause or stop my agent immediately if needed.
- [ ] I have set up Telegram notifications for trade alerts.

---

## 3. Risk Disclosures Summary {#risk-disclosures}

> For the full legal risk disclosure, see [risk-disclosures.md](./risk-disclosures.md).

**Key risks to understand before trading:**

- **AI agents can and do lose money.** Algorithmic strategies are not guaranteed to be profitable.
- **Past simulation performance does not predict live results.** Real market conditions differ from simulation.
- **Crypto markets are highly volatile.** Prices can move 10–50% or more in a single day.
- **Only invest what you can afford to lose entirely.** Never trade with funds you cannot lose.
- **Smart contract bugs are a real risk.** Even audited contracts can contain vulnerabilities.
- **The platform is not regulated** in most jurisdictions. There is no investor protection.
- **Your Telegram account is your security.** If it is compromised, your funds are at risk.

---

## 4. How Your Data Is Protected {#data-protection}

### What We Collect
- **Telegram user ID and username** — used for authentication and notifications.
- **Telegram `initData`** — passed with every API request to verify your identity.
- **Agent configuration** — strategy settings, risk level, capital allocation.
- **Trade history** — records of all simulated and live trades executed by your agents.

### What We Do NOT Collect
- Your private keys or seed phrases (we never ask for these).
- Your full wallet balance (only balances allocated to agents are visible).
- Personal identification documents.

### How Data Is Stored
- All data is encrypted at rest using AES-256.
- API communication uses TLS 1.2 or higher.
- Telegram authentication tokens are validated server-side and never stored long-term.

### Your Rights
- You can request deletion of your account and all associated data at any time via the Telegram bot.
- You can export your trade history at any time from the dashboard.

---

## 5. Safe Configuration Practices {#safe-configuration}

### Recommended Initial Settings

| Setting           | Recommended Value for First 30 Days |
|-------------------|--------------------------------------|
| Risk Level        | `low`                                |
| Capital Allocated | 1–5% of portfolio                   |
| Max Drawdown      | 5%                                   |
| Trading Mode      | Simulation (default)                 |

### Wallet Security
- Use a **dedicated wallet** for agent trading — do not use your main savings wallet.
- Never share your wallet's private key or seed phrase with anyone, including support staff.
- Revoke agent permissions from your wallet if you stop using the platform.

### Agent Configuration
- Review your agent's open positions before switching from simulation to live.
- Start with a single strategy before running multiple agents simultaneously.
- Keep your initial capital allocation under $500 until you have at least 30 days of live history.

---

## 6. Ongoing Monitoring {#ongoing-monitoring}

### Daily (First Week)
- Check the agent dashboard for unexpected trades or position sizes.
- Verify that your portfolio value is within expected ranges.
- Review any Telegram notifications you received.

### Weekly (After First Month)
- Review your cumulative P&L against your simulation baseline.
- Adjust risk limits if your strategy is underperforming.
- Check that your wallet address and permissions are still correct.

### Signs of a Problem
Stop your agent immediately and contact support if you notice:
- Trades larger than your configured position size.
- Portfolio drawdown exceeding your set limit.
- Trades in assets you did not configure.
- Notifications about transactions you did not initiate.

---

## 7. Emergency Procedures {#emergency-procedures}

### How to Stop Your Agent Immediately
1. Open the Telegram Mini App.
2. Navigate to **Agents**.
3. Tap on your agent.
4. Tap **Stop Agent Permanently** in the Danger Zone.

### If You Suspect Your Account Is Compromised
1. Immediately revoke agent permissions from your wallet.
2. Enable 2FA on Telegram if not already done.
3. Terminate all active Telegram sessions: *Settings → Privacy and Security → Active Sessions → Terminate All Other Sessions*.
4. Report the incident to the platform support team via the Telegram bot.

### If You See Unexpected Transactions
1. Stop all agents immediately (see above).
2. Document the transaction hashes.
3. Contact platform support with the transaction details.
4. Report to your local financial authority if significant funds are involved.

---

*Last updated: 2026-04-10*  
*See also: [Mainnet Readiness Checklist](./mainnet-readiness-checklist.md) | [Risk Disclosures](./risk-disclosures.md)*
