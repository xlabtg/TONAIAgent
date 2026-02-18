# TONAIAgent - High-Level System Architecture

## Overview

TONAIAgent is an autonomous AI agents platform built on TON blockchain, with AI powered by Groq and user interaction through Telegram (Bot + Mini App). This architecture enables autonomous financial agents, secure execution, AI-driven decision making, scalable DeFi automation, and modular extensible design.

The system is designed to support millions of users and agents operating 24/7.

---

## Table of Contents

1. [High-Level System Diagram](#high-level-system-diagram)
2. [Core Platform Components](#core-platform-components)
3. [Data Flow](#data-flow)
4. [Security Model](#security-model)
5. [AI Routing Architecture](#ai-routing-architecture)
6. [Agent Lifecycle Management](#agent-lifecycle-management)
7. [Observability and Monitoring](#observability-and-monitoring)
8. [Admin and Control Layer](#admin-and-control-layer)
9. [Technical Decisions and Trade-offs](#technical-decisions-and-trade-offs)

---

## High-Level System Diagram

```mermaid
flowchart TB
    subgraph UserLayer["User Interaction Layer"]
        TG_BOT[Telegram Bot]
        TG_MINI[Telegram Mini App]
        NOTIF[Notification Service]
    end

    subgraph BackendCore["Backend Core"]
        API[API Gateway]
        ORCH[Agent Orchestrator]
        STRATEGY[Strategy Execution Engine]
        PORTFOLIO[Portfolio Manager]
        STATE[State Manager]
        EVENTS[Event Bus]
    end

    subgraph AILayer["AI Layer"]
        ROUTER[AI Router]
        INTENT[Intent Parser]
        DECISION[Decision Engine]
        RISK_AI[Risk Evaluator]
        MODEL_SEL[Model Selector]
        subgraph GroqModels["Groq Models"]
            LLM_GENERAL[General LLM]
            LLM_TOOL[Tool Use Model]
            LLM_ANALYSIS[Analysis Model]
        end
    end

    subgraph BlockchainLayer["Blockchain Layer - TON"]
        WALLET_ABS[Wallet Abstraction]
        SC_AGENT[Agent Smart Contracts]
        SC_VAULT[Vault Contracts]
        TX_BUILDER[Transaction Builder]
        TX_SIGNER[Transaction Signer]
    end

    subgraph SecurityLayer["Security Layer"]
        KMS[Key Management Service]
        RISK_LIMITS[Risk Limits Engine]
        EMERGENCY[Emergency Stop]
        TX_VALIDATOR[Transaction Validator]
        SANDBOX[Execution Sandbox]
    end

    subgraph DataLayer["Data Layer"]
        DB_PRIMARY[(Primary DB)]
        CACHE[(Redis Cache)]
        QUEUE[(Message Queue)]
        BLOB[(Blob Storage)]
    end

    subgraph AdminLayer["Admin Panel"]
        ADMIN_UI[Admin Dashboard]
        MONITOR[System Monitor]
        USER_MGMT[User Management]
        COMPLIANCE[Compliance Tools]
    end

    %% User Layer connections
    TG_BOT --> API
    TG_MINI --> API
    NOTIF <--> EVENTS

    %% Backend Core connections
    API --> ORCH
    ORCH --> STRATEGY
    ORCH --> PORTFOLIO
    ORCH --> STATE
    STRATEGY --> EVENTS
    PORTFOLIO --> EVENTS
    STATE <--> CACHE
    STATE <--> DB_PRIMARY

    %% AI Layer connections
    ORCH --> ROUTER
    ROUTER --> MODEL_SEL
    MODEL_SEL --> LLM_GENERAL
    MODEL_SEL --> LLM_TOOL
    MODEL_SEL --> LLM_ANALYSIS
    ROUTER --> INTENT
    INTENT --> DECISION
    DECISION --> RISK_AI

    %% Blockchain Layer connections
    STRATEGY --> TX_BUILDER
    TX_BUILDER --> TX_SIGNER
    TX_SIGNER --> WALLET_ABS
    WALLET_ABS --> SC_AGENT
    WALLET_ABS --> SC_VAULT

    %% Security Layer connections
    KMS --> TX_SIGNER
    RISK_LIMITS --> STRATEGY
    TX_VALIDATOR --> TX_BUILDER
    EMERGENCY --> ORCH
    SANDBOX --> DECISION

    %% Admin Layer connections
    ADMIN_UI --> MONITOR
    ADMIN_UI --> USER_MGMT
    ADMIN_UI --> COMPLIANCE
    MONITOR <--> EVENTS
    USER_MGMT --> STATE
    COMPLIANCE --> RISK_LIMITS
```

---

## Core Platform Components

### 1. User Interaction Layer

The user-facing layer provides all touchpoints for user interaction.

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Telegram Bot** | Primary interface for commands, agent management, and notifications | Node.js + grammy/telegraf |
| **Telegram Mini App** | Rich UI for portfolio viewing, strategy configuration, and analytics | React/Vue + Telegram WebApp SDK |
| **Notification Service** | Real-time alerts for trades, risks, and system events | WebSocket + Push notifications |

**Key Characteristics:**
- Zero signup friction (leverages Telegram authentication)
- Session-driven interfaces with ephemeral frontend state
- All business logic validated server-side
- Cryptographic validation of Telegram `initData`

### 2. Backend Core

The central orchestration layer managing agent operations and business logic.

| Component | Purpose | Technology |
|-----------|---------|------------|
| **API Gateway** | Request routing, rate limiting, authentication | Kong/Nginx + custom middleware |
| **Agent Orchestrator** | Coordinates agent lifecycle and operations | Node.js/Go microservice |
| **Strategy Execution Engine** | Executes trading strategies and DeFi operations | Go (high performance) |
| **Portfolio Manager** | Tracks holdings, P&L, and positions | Python (analytics) |
| **State Manager** | Maintains agent and user state | Node.js + Redis |
| **Event Bus** | Async communication between services | Apache Kafka / RabbitMQ |

**Design Principles:**
- Event-driven architecture for loose coupling
- Horizontal scalability via stateless services
- Idempotent operations with replay protection
- Circuit breakers for fault tolerance

### 3. AI Layer

The intelligence layer powered by Groq's ultra-fast inference.

| Component | Purpose | Technology |
|-----------|---------|------------|
| **AI Router** | Routes requests to appropriate models | Custom routing service |
| **Intent Parser** | Understands user commands and intents | Groq LLM |
| **Decision Engine** | Makes trading and strategic decisions | Groq LLM + custom logic |
| **Risk Evaluator** | Assesses risk of proposed actions | Groq LLM + rules engine |
| **Model Selector** | Dynamic model selection based on task | Rule-based + ML |

**Groq Model Routing Strategy:**

```mermaid
flowchart LR
    REQ[Request] --> CLASSIFY{Classify Task}
    CLASSIFY -->|General Query| GENERAL[Llama-3 70B]
    CLASSIFY -->|Tool/API Call| TOOL[Llama-3-Groq Tool Use]
    CLASSIFY -->|Market Analysis| ANALYSIS[Specialized Analysis Model]
    CLASSIFY -->|Risk Assessment| RISK[Risk-tuned Model]
```

### 4. Blockchain Layer (TON)

The on-chain execution layer leveraging TON's high-performance infrastructure.

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Wallet Abstraction** | Manages user wallets securely | TON SDK + custom abstraction |
| **Agent Smart Contracts** | On-chain agent logic and permissions | FunC/Tact |
| **Vault Contracts** | Secure asset custody | FunC/Tact |
| **Transaction Builder** | Constructs valid TON transactions | TON SDK |
| **Transaction Signer** | Signs transactions securely | Isolated signing service |

**TON Architecture Benefits:**
- Multi-chain architecture with dynamic sharding
- Millions of TPS scalability potential
- Low transaction fees
- Native Telegram integration

### 5. Security Layer

Defense-in-depth security protecting users, assets, and the platform.

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Key Management Service** | Secure key storage and operations | HSM / MPC / Secure Enclave |
| **Risk Limits Engine** | Enforces per-agent and global limits | Rules engine |
| **Emergency Stop** | Circuit breaker for critical situations | Distributed consensus |
| **Transaction Validator** | Validates all transactions pre-signing | Custom validator |
| **Execution Sandbox** | Isolates AI model execution | Container isolation |

### 6. Data Layer

Persistent storage and caching infrastructure.

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Primary Database** | Persistent state and history | PostgreSQL (sharded) |
| **Cache** | Fast state access and sessions | Redis Cluster |
| **Message Queue** | Async job processing | Kafka / RabbitMQ |
| **Blob Storage** | Large objects, logs, analytics | S3-compatible |

---

## Data Flow

### Agent Creation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant TG as Telegram
    participant API as API Gateway
    participant ORCH as Orchestrator
    participant KMS as Key Management
    participant TON as TON Blockchain
    participant DB as Database

    U->>TG: Create Agent Command
    TG->>API: POST /agents/create
    API->>API: Validate initData
    API->>ORCH: Create Agent Request
    ORCH->>KMS: Generate Wallet Keys
    KMS-->>ORCH: Encrypted Keys
    ORCH->>TON: Deploy Agent Contract
    TON-->>ORCH: Contract Address
    ORCH->>DB: Store Agent State
    DB-->>ORCH: Confirmed
    ORCH-->>API: Agent Created
    API-->>TG: Success Response
    TG-->>U: Agent Ready Notification
```

### Strategy Execution Flow

```mermaid
sequenceDiagram
    participant AGENT as Agent
    participant ORCH as Orchestrator
    participant AI as AI Layer
    participant RISK as Risk Engine
    participant STRAT as Strategy Engine
    participant TON as TON Blockchain
    participant NOTIF as Notifications

    AGENT->>ORCH: Execute Strategy
    ORCH->>AI: Analyze Market
    AI-->>ORCH: Analysis + Recommendation
    ORCH->>RISK: Validate Action
    alt Risk Approved
        RISK-->>ORCH: Approved
        ORCH->>STRAT: Execute Trade
        STRAT->>TON: Submit Transaction
        TON-->>STRAT: Confirmation
        STRAT->>NOTIF: Trade Executed
        NOTIF-->>AGENT: Success Alert
    else Risk Rejected
        RISK-->>ORCH: Rejected + Reason
        ORCH->>NOTIF: Risk Alert
        NOTIF-->>AGENT: Action Blocked
    end
```

### AI Decision Flow

```mermaid
sequenceDiagram
    participant REQ as Request
    participant ROUTER as AI Router
    participant SELECT as Model Selector
    participant GROQ as Groq API
    participant SANDBOX as Sandbox
    participant CACHE as Cache

    REQ->>ROUTER: Process Request
    ROUTER->>CACHE: Check Cache
    alt Cache Hit
        CACHE-->>ROUTER: Cached Response
    else Cache Miss
        ROUTER->>SELECT: Select Model
        SELECT-->>ROUTER: Model ID
        ROUTER->>SANDBOX: Prepare Context
        SANDBOX->>GROQ: Inference Request
        GROQ-->>SANDBOX: Response
        SANDBOX-->>ROUTER: Sanitized Response
        ROUTER->>CACHE: Store Result
    end
    ROUTER-->>REQ: Final Response
```

---

## Security Model

### Security Boundaries

```mermaid
flowchart TB
    subgraph PublicZone["Public Zone"]
        USER[Users]
        TG[Telegram]
    end

    subgraph DMZ["DMZ"]
        WAF[Web Application Firewall]
        LB[Load Balancer]
        API[API Gateway]
    end

    subgraph TrustedZone["Trusted Zone"]
        BACKEND[Backend Services]
        AI[AI Services]
    end

    subgraph SecureZone["Secure Zone - Isolated"]
        KMS[Key Management]
        SIGNER[Transaction Signer]
        HSM[HSM/Secure Enclave]
    end

    subgraph DataZone["Data Zone"]
        DB[(Databases)]
        CACHE[(Cache)]
    end

    USER --> TG
    TG --> WAF
    WAF --> LB
    LB --> API
    API --> BACKEND
    BACKEND --> AI
    BACKEND --> KMS
    KMS --> HSM
    SIGNER --> HSM
    BACKEND --> DB
    BACKEND --> CACHE
```

### Security Principles

| Principle | Implementation |
|-----------|----------------|
| **AI Never Touches Keys** | Complete isolation between AI layer and key management |
| **Defense in Depth** | Multiple security layers with independent controls |
| **Least Privilege** | Minimal permissions per component |
| **Zero Trust** | All requests authenticated and authorized |
| **Secure by Default** | Conservative defaults, explicit opt-in for risky operations |

### Key Security Controls

1. **Authentication & Authorization**
   - Telegram cryptographic validation
   - JWT with short expiry
   - Role-based access control (RBAC)
   - Per-agent permission scopes

2. **Key Management**
   - MPC (Multi-Party Computation) for distributed key custody
   - HSM for high-security key operations
   - Key derivation for per-agent wallets
   - No plaintext keys in memory

3. **Risk Controls**
   - Per-transaction limits
   - Per-agent daily limits
   - Global platform limits
   - Velocity checks (unusual activity detection)
   - Whitelist-only destinations (optional)

4. **Emergency Response**
   - Global emergency stop
   - Per-agent pause capability
   - Automatic circuit breakers
   - Manual override by admins

---

## AI Routing Architecture

### Model Selection Strategy

```mermaid
flowchart TB
    INPUT[Input Request] --> CLASSIFY[Classify Intent]

    CLASSIFY --> TYPE{Request Type}

    TYPE -->|User Query| GENERAL_PATH
    TYPE -->|Tool Invocation| TOOL_PATH
    TYPE -->|Market Analysis| ANALYSIS_PATH
    TYPE -->|Risk Assessment| RISK_PATH

    subgraph GENERAL_PATH[General Query Path]
        G1[Llama-3 70B]
        G2[Response Formatting]
    end

    subgraph TOOL_PATH[Tool Use Path]
        T1[Llama-3-Groq Tool Use]
        T2[Function Execution]
        T3[Result Processing]
    end

    subgraph ANALYSIS_PATH[Analysis Path]
        A1[Market Data Enrichment]
        A2[Analysis Model]
        A3[Confidence Scoring]
    end

    subgraph RISK_PATH[Risk Assessment Path]
        R1[Context Assembly]
        R2[Risk Model]
        R3[Limit Checking]
    end

    GENERAL_PATH --> OUTPUT
    TOOL_PATH --> OUTPUT
    ANALYSIS_PATH --> OUTPUT
    RISK_PATH --> OUTPUT

    OUTPUT[Response] --> CACHE[Cache Result]
```

### Cost Optimization

| Strategy | Description |
|----------|-------------|
| **Tiered Models** | Use smaller models for simple tasks, larger for complex |
| **Caching** | Cache common queries and analysis |
| **Batching** | Batch similar requests when latency allows |
| **Rate Limiting** | Per-user AI request limits |
| **Token Budgets** | Per-agent token consumption limits |

### Latency Optimization

- Groq's LPU provides sub-second inference (<0.13s first token)
- Connection pooling to Groq API
- Regional deployment for low-latency access
- Streaming responses for long outputs

---

## Agent Lifecycle Management

### Agent States

```mermaid
stateDiagram-v2
    [*] --> Creating: User initiates
    Creating --> Initializing: Keys generated
    Initializing --> Active: Contract deployed
    Active --> Paused: User/System pause
    Paused --> Active: Resume
    Active --> Executing: Strategy running
    Executing --> Active: Execution complete
    Active --> Terminating: User requests
    Paused --> Terminating: Cleanup
    Terminating --> Terminated: Assets withdrawn
    Terminated --> [*]

    Active --> Emergency: Risk triggered
    Emergency --> Paused: Stabilized
    Emergency --> Terminating: Unrecoverable
```

### Agent State Transitions

| From State | To State | Trigger | Actions |
|------------|----------|---------|---------|
| Creating | Initializing | Keys ready | Generate wallet, setup permissions |
| Initializing | Active | Contract deployed | Notify user, enable operations |
| Active | Paused | User/system request | Stop executions, hold assets |
| Active | Executing | Strategy triggered | Lock state, begin execution |
| Executing | Active | Execution complete | Update portfolio, log results |
| Active | Emergency | Risk breach | Halt all operations, alert user |
| Emergency | Paused | Admin review | Assess damage, plan recovery |
| Active | Terminating | User request | Initiate asset withdrawal |
| Terminating | Terminated | Assets cleared | Archive state, cleanup resources |

### Agent Configuration

```yaml
agent:
  id: "agent_xxx"
  owner: "telegram_user_id"
  created_at: "2026-01-15T10:30:00Z"

  wallet:
    address: "EQ..."
    type: "abstracted"

  permissions:
    max_trade_size: 1000  # TON
    daily_limit: 5000     # TON
    allowed_tokens: ["TON", "USDT", "SCALE"]
    allowed_protocols: ["dedust", "stonfi"]

  strategy:
    type: "dca"
    params:
      amount: 100
      frequency: "daily"
      token: "TON"

  risk_limits:
    max_slippage: 0.5     # percent
    stop_loss: 10         # percent
    max_gas_price: 1      # TON
```

---

## Observability and Monitoring

### Monitoring Architecture

```mermaid
flowchart TB
    subgraph Services["Platform Services"]
        S1[API Gateway]
        S2[Orchestrator]
        S3[Strategy Engine]
        S4[AI Router]
    end

    subgraph Collection["Collection Layer"]
        METRICS[Metrics Collector]
        LOGS[Log Aggregator]
        TRACES[Trace Collector]
    end

    subgraph Storage["Storage"]
        PROM[(Prometheus)]
        ELASTIC[(Elasticsearch)]
        JAEGER[(Jaeger)]
    end

    subgraph Visualization["Visualization"]
        GRAFANA[Grafana Dashboards]
        KIBANA[Kibana]
        ALERTS[Alert Manager]
    end

    S1 --> METRICS
    S1 --> LOGS
    S1 --> TRACES
    S2 --> METRICS
    S2 --> LOGS
    S2 --> TRACES
    S3 --> METRICS
    S3 --> LOGS
    S3 --> TRACES
    S4 --> METRICS
    S4 --> LOGS
    S4 --> TRACES

    METRICS --> PROM
    LOGS --> ELASTIC
    TRACES --> JAEGER

    PROM --> GRAFANA
    ELASTIC --> KIBANA
    PROM --> ALERTS
    JAEGER --> GRAFANA
```

### Key Metrics

| Category | Metrics |
|----------|---------|
| **Business** | Active agents, daily transactions, total volume, revenue |
| **Performance** | Latency (p50, p95, p99), throughput, error rates |
| **AI** | Model latency, token usage, cache hit rate, cost per request |
| **Blockchain** | Transaction success rate, gas usage, confirmation time |
| **Security** | Failed auth attempts, risk events, emergency stops |

### Alerting Rules

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Error Rate | >5% errors in 5 min | Critical | Page on-call |
| AI Latency Spike | p99 > 2s | Warning | Investigate |
| Low Success Rate | Transaction success <95% | Critical | Check TON network |
| Risk Limit Breach | Any breach | Critical | Auto-pause agent |
| Unusual Activity | 3x normal volume | Warning | Review manually |

---

## Admin and Control Layer

### Admin Dashboard Features

| Feature | Description |
|---------|-------------|
| **System Overview** | Real-time platform health and metrics |
| **User Management** | View, suspend, or modify user accounts |
| **Agent Control** | Monitor and manage individual agents |
| **Risk Management** | Configure limits, review breaches |
| **Compliance** | Audit logs, reporting, KYC status |
| **Emergency Controls** | Global stop, agent pause, rate limiting |

### Access Control

```mermaid
flowchart TB
    subgraph Roles["Admin Roles"]
        SUPER[Super Admin]
        OPS[Operations]
        SUPPORT[Support]
        ANALYST[Analyst]
    end

    subgraph Permissions["Permissions"]
        P1[View All Data]
        P2[Modify Users]
        P3[Control Agents]
        P4[Risk Config]
        P5[Emergency Stop]
        P6[View Reports]
    end

    SUPER --> P1
    SUPER --> P2
    SUPER --> P3
    SUPER --> P4
    SUPER --> P5
    SUPER --> P6

    OPS --> P1
    OPS --> P3
    OPS --> P5

    SUPPORT --> P1
    SUPPORT --> P2

    ANALYST --> P1
    ANALYST --> P6
```

---

## Technical Decisions and Trade-offs

### Decision 1: MPC vs HSM for Key Management

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **MPC** | Distributed trust, no single point of failure | Complex implementation, latency | **Chosen for user wallets** |
| **HSM** | Proven security, fast operations | Single vendor dependency, cost | **Chosen for platform keys** |

**Rationale:** MPC provides better trust distribution for user funds, while HSM offers simplicity for platform operations.

### Decision 2: Event-Driven vs Request-Response

| Aspect | Event-Driven | Request-Response |
|--------|--------------|------------------|
| **Coupling** | Loose | Tight |
| **Scalability** | Excellent | Good |
| **Complexity** | Higher | Lower |
| **Latency** | Variable | Predictable |

**Decision:** Hybrid approach - Event-driven for async operations (trades, notifications), request-response for user-facing APIs.

### Decision 3: Groq Model Selection

| Model | Use Case | Latency | Cost |
|-------|----------|---------|------|
| **Llama-3 70B** | General queries, explanations | ~0.2s | Medium |
| **Llama-3-Groq Tool Use** | API calls, function execution | ~0.15s | Medium |
| **Llama-3 8B** | Simple classification | ~0.05s | Low |

**Decision:** Dynamic routing based on task complexity to optimize cost and latency.

### Decision 4: Database Sharding Strategy

**Approach:** Shard by user/agent ID for:
- Even distribution
- Locality of agent data
- Simple routing logic

### Future Considerations

1. **Multi-region deployment** for global latency optimization
2. **Custom fine-tuned models** for domain-specific tasks
3. **Cross-chain support** beyond TON
4. **Advanced strategy templates** marketplace
5. **Social/copy trading** features

---

## Appendix

### Technology Stack Summary

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React, Telegram WebApp SDK, TypeScript |
| **Backend** | Node.js, Go, Python |
| **AI** | Groq API, Llama-3 models |
| **Blockchain** | TON, FunC/Tact smart contracts |
| **Data** | PostgreSQL, Redis, Kafka |
| **Infrastructure** | Kubernetes, Docker |
| **Monitoring** | Prometheus, Grafana, Elasticsearch |
| **Security** | MPC, HSM, WAF |

### References

- [TON Blockchain Documentation](https://docs.ton.org)
- [Groq API Documentation](https://console.groq.com/docs/overview)
- [Telegram Mini Apps Guide](https://core.telegram.org/bots/webapps)
- [Telegram Bot API](https://core.telegram.org/bots/api)

---

*Document Version: 1.0*
*Last Updated: 2026-02-18*
*Author: AI Architecture Assistant*
