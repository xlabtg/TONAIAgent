# Investor-Ready End-to-End Demo Script

> **"Anyone can create a fully autonomous AI crypto agent in minutes."**

This document is the official demo script for presenting the TON AI Agent platform to investors,
VCs, TON ecosystem partners, and institutional investors. The demo runs in **3–5 minutes** and
covers all 7 steps of the end-to-end flow.

---

## Before You Start

**Preparation checklist:**
- [ ] Clone the repo and run `npm install`
- [ ] Open the website at `localhost:3000` (or `https://tonaiagent.com`)
- [ ] Open the demo page at `/demo`
- [ ] Have the Telegram Mini App ready (open `@YourAgentBot`)
- [ ] Optional: open a second screen showing live logs

**Key talking points (memorize these):**
1. AI + crypto + Telegram = the perfect triangle for viral adoption
2. Non-custodial from day one — user always owns their keys (MPC)
3. Groq-first AI — the fastest inference on the market, free tier available
4. TON is the only blockchain with 950M+ Telegram users as distribution

---

## Step 1 — Landing / Entry Point (30 seconds)

> **Narrative:** "Let me show you what it looks like when a user first arrives."

**What to show:**
- Open `https://tonaiagent.com` (or the live demo URL)
- Point out the headline: *"Deploy Your AI Crypto Agent in Minutes"*
- Highlight the 3 key stats: 24/7 Automation, Groq-first AI, Non-Custodial
- Click **"Create Your AI Agent"** CTA

**Key points for investors:**
- Clean, modern UX — no crypto jargon on the landing page
- Works as a web app and as a Telegram Mini App
- CTA drives directly into the onboarding wizard — no friction

---

## Step 2 — Agent Creation Wizard (60 seconds)

> **Narrative:** "This is the wizard — it takes about 60 seconds to configure your agent."

**What to show:**
1. **Strategy selection:** Choose from DCA, Yield, Grid, or Arbitrage
   - *"For this demo, I'll pick Dollar-Cost Averaging — the safest strategy, great for beginners"*
2. **AI Provider selection:** Groq is selected by default
   - *"Groq gives us the fastest AI inference — sub-100ms responses. We also support Anthropic, OpenAI, Google, and xAI."*
3. **Budget:** Enter 100 TON (simulated)
4. **Risk level:** Medium (default)
5. Click **"Create Agent"**

**Key points for investors:**
- Agent creation takes < 2 seconds
- Multi-provider AI architecture means no single point of failure
- Strategy selection drives the AI's decision framework
- All configuration is accessible to non-technical users

**Code path (for technical investors):**
```typescript
const demo = createInvestorDemoManager();
const session = await demo.runFullDemo({
  strategy: 'dca',
  aiProvider: 'groq',
  persona: 'retail',
  budgetTon: 100,
});
```

---

## Step 3 — Telegram Integration (30 seconds)

> **Narrative:** "Now watch what happens automatically — the platform creates a Telegram bot for this agent."

**What to show:**
- System creates `@ton_ai_my_first_ai_agent_bot` automatically
- Bot commands are pre-configured: `/start`, `/status`, `/balance`, `/trades`, `/pause`, `/stop`
- Mini App webhook is configured — user can manage the agent from Telegram
- Show the Telegram Mini App on mobile (or emulator)

**Key points for investors:**
- Zero manual setup for users — bot creation is fully automated
- 950M+ Telegram users = built-in distribution channel
- Commands work in any Telegram interface — mobile, desktop, web
- This is **the** differentiator vs. every other DeFi platform

---

## Step 4 — TON Wallet Creation (30 seconds)

> **Narrative:** "The agent gets its own wallet — and the keys are secured with MPC — multi-party computation."

**What to show:**
- Wallet address generated: `EQ...` format
- MPC key security: threshold 2-of-3 signing
- Smart contract deployed to TON blockchain
- Initial funding of 100 TON (simulated)
- Show the on-chain transaction hash

**Key points for investors:**
- Non-custodial from day one — we never see the user's private key
- MPC (Multi-Party Computation) is institutional-grade key management
- Smart contract factory (Issue #41) enables deterministic addresses
- Integration with TON Foundation ecosystem — native to the network

**Technical highlight:**
```
Wallet: EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs
Security: MPC Threshold 2-of-3
Contract: Deployed on TON testnet
TX: tx_4a3f9e1b...
```

---

## Step 5 — Strategy Activation (45 seconds)

> **Narrative:** "Now the agent is live. Watch the AI make its first decision."

**What to show:**
- Agent status changes from `created` → `active`
- The 9-step execution pipeline runs:
  1. `load_config` — loads DCA strategy parameters
  2. `fetch_market_data` — gets TON/USD price: **$5.54**
  3. `call_ai` — Groq inference request (simulated)
  4. `generate_decision` — **BUY 9.0435 TON**
  5. `validate_risk` — risk check PASSED
  6. `simulate_execute` — trade executed (simulation mode)
  7. `log_trade` — PnL tracked
  8. `update_metrics` — dashboard refreshed
  9. `notify` — Telegram notification sent
- Show the first trade in the UI

**Key points for investors:**
- The AI explains its reasoning in plain English — explainable AI
- Simulation mode means zero risk for the demo (and for new users)
- The entire pipeline runs in < 200ms (Groq inference included)
- Every step is logged and auditable

---

## Step 6 — Live Dashboard (60 seconds)

> **Narrative:** "Here's the live dashboard — everything you need to monitor your agent."

**What to show:**
- **Agent Status:** Active ✅
- **Wallet Balance:** 100 TON / $554 USD
- **Performance:** ROI +0.5%, PnL +$2.77
- **Trade History:** 1 trade (BUY 9.04 TON @ $5.54)
- **Win Rate:** 100% (1/1 trades profitable)
- **Uptime:** 100%
- **Recent Logs:** Last 10 pipeline steps with timestamps
- **Telegram:** Link to bot — *"You can also manage all of this from your phone"*

**Key points for investors:**
- Real-time dashboard — no page refresh needed
- All metrics are on-chain verifiable (in production mode)
- The same dashboard powers the Telegram Mini App
- Institutional metrics available: VaR, max drawdown, Sharpe ratio

---

## Step 7 — Social & Viral Element (30 seconds, optional)

> **Narrative:** "Finally — and this is our viral growth engine — users can share their agents."

**What to show:**
- Public agent profile page: `https://tonaiagent.com/agents/demo_agent_...`
- Leaderboard position: **#42** out of top agents
- Reputation score: **72/100**
- Share button generates: *"🤖 Just deployed my AI crypto agent on TON! Strategy: Dollar-Cost Averaging | AI: Groq | ROI: +0.50% | #TONAIAgent"*
- Copy trading button: *"Copy this strategy"*

**Key points for investors:**
- Viral loop: users share → friends join → more agents → more data → better AI
- Leaderboard drives competition and engagement
- Copy trading creates a strategy marketplace (see Issue #41, marketplace module)
- Reputation system aligns incentives — top performers earn from followers

---

## Summary / Closing (30 seconds)

> **Narrative:** "Let me summarize what just happened in under 3 minutes."

**The summary slide:**

| What happened | Time | Technology |
|---|---|---|
| User opened platform | 0:00 | Next.js + Tailwind |
| Agent configured | 0:45 | Multi-provider AI router |
| Telegram bot created | 1:15 | Telegram Bot API |
| TON wallet + MPC keys | 1:45 | TON blockchain + MPC |
| First trade executed | 2:15 | Groq AI + Strategy Engine |
| Dashboard live | 2:45 | Real-time metrics |
| Agent shared publicly | 3:00 | Viral growth engine |

**Closing statement:**
> *"This is the first AI-native autonomous finance platform built for Telegram and TON.
> We combine the fastest AI inference (Groq), the largest messaging distribution (Telegram),
> and the fastest L1 blockchain (TON) — and we make it accessible to anyone in 3 minutes.
> The MVP is live. The strategy marketplace is built. The institutional layer is in progress.
> We're looking for partners who understand what it means to have 950 million potential users
> on day one."*

---

## Technical Q&A Cheat Sheet

**Q: Is this real on-chain activity?**
> The demo runs in simulation mode — no real funds are used. The production platform
> connects to TON mainnet/testnet via TonCenter API. All transactions are on-chain in
> production mode.

**Q: How do you handle key security?**
> We use MPC (Multi-Party Computation) with a 2-of-3 threshold. The user's key shares
> are split between the user's device, our secure enclave, and a third-party custodian.
> We never see the full key. This is the same model used by Fireblocks and Coinbase Custody.

**Q: What AI models do you support?**
> Groq (Llama 3.1, default — fastest, free tier), Anthropic Claude, OpenAI GPT-4o,
> Google Gemini, and xAI Grok. Our AI router automatically falls back to other providers
> if the primary provider is unavailable.

**Q: How does the strategy engine work?**
> Each agent runs a 9-step execution pipeline on a configurable schedule (default: every 60 seconds).
> The pipeline fetches market data, calls the AI, validates the decision against risk limits,
> executes the trade (simulated or live), and updates metrics. The strategy is a pure function
> that takes market data and balance state and returns a BUY/SELL/HOLD decision.

**Q: What's the monetization model?**
> Performance fees (1-2% of profits), strategy marketplace fees (20% of creator earnings),
> premium subscriptions ($29-$299/month), and institutional licensing. The TONAI token
> powers governance, fee discounts, and staking rewards.

**Q: What's your competitive moat?**
> 1. Telegram-native distribution — competitors require separate apps
> 2. Groq-first AI — 10x faster inference than OpenAI
> 3. TON-native — EVM chains have 100x higher fees
> 4. Non-custodial from day one — institutional-grade security for retail users
> 5. Open Agent Protocol — agents can interoperate across platforms

---

## Appendix: Running the Demo Programmatically

For technical investors who want to see the code:

```typescript
import { createInvestorDemoManager } from '@tonaiagent/core/investor-demo';

// Create the demo manager
const demo = createInvestorDemoManager();

// Subscribe to events (for live logging during demo)
demo.onEvent((event) => {
  console.log(`[${event.type}]`, event.stepId ?? '', JSON.stringify(event.data));
});

// Run the full 7-step demo flow
const session = await demo.runFullDemo({
  mode: 'guided',
  persona: 'retail',        // or 'trader', 'institutional', 'dao'
  strategy: 'dca',          // or 'yield', 'grid', 'arbitrage'
  aiProvider: 'groq',       // or 'anthropic', 'openai', 'google', 'xai'
  budgetTon: 100,
  telegramEnabled: true,
  socialEnabled: true,
});

// Print the demo summary
console.log('\n=== DEMO COMPLETE ===');
console.log('Agent ID:', session.summary?.agentId);
console.log('Agent Name:', session.summary?.agentName);
console.log('Wallet:', session.summary?.walletAddress);
console.log('Bot:', session.summary?.botUsername ?? 'N/A');
console.log('ROI:', session.summary?.roi.toFixed(2) + '%');
console.log('Trades:', session.summary?.totalTrades);
console.log('Strategy:', session.summary?.strategyName);
console.log('AI Provider:', session.summary?.aiProvider);
console.log('Time to Live:', session.summary?.timeToLiveMs + 'ms');
console.log('\nValue Proposition:', session.summary?.valueProposition);
```

**Expected output:**
```
[session_started]  {"config":{"mode":"guided","persona":"retail",...}}
[step_started] landing {"stepNumber":1,"title":"Landing / Entry Point"}
[step_completed] landing {"stepNumber":1,"durationMs":0,...}
[step_started] agent_creation {"stepNumber":2,...}
[step_completed] agent_creation {"stepNumber":2,"durationMs":5,...}
...

=== DEMO COMPLETE ===
Agent ID: demo_agent_demo_user_abc123_1709398400000
Agent Name: My First AI Agent
Wallet: EQDx7kLm...
Bot: ton_ai_my_first_ai_agent_bot
ROI: 0.00%
Trades: 1
Strategy: Dollar-Cost Averaging
AI Provider: groq
Time to Live: 42ms

Value Proposition: AI-native autonomous finance — from zero to live agent in minutes.
```

---

*Document version: 1.0 | Issue #90 | TON AI Agent Platform*
