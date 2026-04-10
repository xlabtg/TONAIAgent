/*!
 * StrategyExecutor — TONAIAgent Smart Contract
 *
 * On-chain executor that validates AI trading signals before dispatching
 * them to the agent wallet, enforces position limits, and records all
 * executed trades in an append-only audit trail.
 *
 * Design:
 *  - Each strategy is identified by a unique `strategyId` (uint64).
 *  - Signals are submitted by an off-chain AI orchestrator identified by
 *    the `authorizedOrchestrator` address.
 *  - Before executing, the contract verifies:
 *      a) strategy is active and within its expiry window,
 *      b) signal nonce is strictly monotonically increasing (replay protection),
 *      c) trade size does not exceed `maxPositionNano`,
 *      d) cumulative loss does not exceed `maxLossNano`,
 *      e) total executions have not exceeded `maxExecutions`.
 *  - Audit log entries are stored on-chain (keyed by `strategyId + seqno`)
 *    so that off-chain indexers can reconstruct the full execution history.
 *  - Emergency stop by owner halts all strategy executions.
 *
 * Tact language reference: https://tact-lang.org/
 * TON security best practices: https://docs.ton.org/contract-dev/security
 */

import "@stdlib/deploy";
import "@stdlib/ownable";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Strategy status values
const STATUS_PENDING: Int   = 0;
const STATUS_RUNNING: Int   = 1;
const STATUS_STOPPED: Int   = 2;
const STATUS_COMPLETED: Int = 3;
const STATUS_FAILED: Int    = 4;

/// Risk level values
const RISK_LOW: Int      = 0;
const RISK_MEDIUM: Int   = 1;
const RISK_HIGH: Int     = 2;
const RISK_CRITICAL: Int = 3;

/// Minimum TON reserve for storage rent
const MIN_TON_RESERVE: Int = ton("0.05");

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/// Register a new strategy.
message RegisterStrategy {
    strategyId: Int as uint64;
    agentWallet: Address;           // AgentWallet contract to call
    strategyType: String;           // e.g. "dca", "arb", "rebalance"
    riskLevel: Int as uint8;
    maxPositionNano: Int as coins;  // max single trade size
    maxLossNano: Int as coins;      // cumulative max loss before auto-stop
    maxExecutions: Int as uint32;   // 0 = unlimited
    expiresAt: Int as uint64;       // Unix timestamp, 0 = never
}

/// Start (activate) a registered strategy.
message StartStrategy {
    strategyId: Int as uint64;
}

/// Stop a running strategy.
message StopStrategy {
    strategyId: Int as uint64;
}

/// Submit an AI signal for execution.
message ExecuteSignal {
    strategyId: Int as uint64;
    signalNonce: Int as uint64;     // monotonically increasing per strategy
    to: Address;                    // trade destination (DEX, vault, etc.)
    amount: Int as coins;
    payload: Cell?;
    expectedPnlNano: Int as int64;  // positive = profit, negative = loss
}

/// Report the outcome of a previously executed signal.
message ReportOutcome {
    strategyId: Int as uint64;
    signalNonce: Int as uint64;
    actualPnlNano: Int as int64;
    gasUsedNano: Int as coins;
}

/// Update the authorised orchestrator address.
message SetOrchestrator {
    orchestrator: Address;
}

/// Emergency halt — stops all strategies.
message EmergencyHalt {}

// ---------------------------------------------------------------------------
// Data structures
// ---------------------------------------------------------------------------

/// On-chain strategy record.
struct StrategyRecord {
    strategyId: Int as uint64;
    agentWallet: Address;
    strategyType: String;
    riskLevel: Int as uint8;
    status: Int as uint8;

    // Limits
    maxPositionNano: Int as coins;
    maxLossNano: Int as coins;
    maxExecutions: Int as uint32;
    expiresAt: Int as uint64;

    // Runtime counters
    executionCount: Int as uint32;
    cumulativeLossNano: Int as coins;
    lastSignalNonce: Int as uint64;

    // Timestamps
    registeredAt: Int as uint64;
    startedAt: Int as uint64;
    stoppedAt: Int as uint64;
}

/// Immutable audit log entry written for every executed signal.
struct AuditEntry {
    strategyId: Int as uint64;
    seqno: Int as uint32;           // per-strategy sequence number
    signalNonce: Int as uint64;
    to: Address;
    amount: Int as coins;
    expectedPnlNano: Int as int64;
    actualPnlNano: Int as int64;
    gasUsedNano: Int as coins;
    executedAt: Int as uint64;
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

contract StrategyExecutor with Deployable, Ownable {

    // ---- persistent state ----
    owner: Address;
    authorizedOrchestrator: Address;

    // Strategy registry: strategyId -> StrategyRecord
    strategies: map<Int, StrategyRecord>;

    // Audit log: (strategyId * 2^32 + seqno) -> AuditEntry
    auditLog: map<Int, AuditEntry>;

    // Safety
    isHalted: Bool;
    totalStrategiesRegistered: Int as uint64;

    // ---- constructor ----
    init(owner: Address, orchestrator: Address) {
        self.owner = owner;
        self.authorizedOrchestrator = orchestrator;
        self.isHalted = false;
        self.totalStrategiesRegistered = 0;
    }

    // ---- register strategy ----
    receive(msg: RegisterStrategy) {
        require(
            sender() == self.owner || sender() == self.authorizedOrchestrator,
            "StrategyExecutor: unauthorized"
        );
        require(!self.isHalted, "StrategyExecutor: halted");
        require(
            self.strategies.get(msg.strategyId) == null,
            "StrategyExecutor: strategy already registered"
        );
        require(msg.maxPositionNano > 0, "StrategyExecutor: maxPositionNano must be > 0");
        require(msg.riskLevel <= RISK_CRITICAL, "StrategyExecutor: invalid risk level");

        self.strategies.set(msg.strategyId, StrategyRecord{
            strategyId: msg.strategyId,
            agentWallet: msg.agentWallet,
            strategyType: msg.strategyType,
            riskLevel: msg.riskLevel,
            status: STATUS_PENDING,
            maxPositionNano: msg.maxPositionNano,
            maxLossNano: msg.maxLossNano,
            maxExecutions: msg.maxExecutions,
            expiresAt: msg.expiresAt,
            executionCount: 0,
            cumulativeLossNano: 0,
            lastSignalNonce: 0,
            registeredAt: now(),
            startedAt: 0,
            stoppedAt: 0
        });

        self.totalStrategiesRegistered = self.totalStrategiesRegistered + 1;
    }

    // ---- start strategy ----
    receive(msg: StartStrategy) {
        require(
            sender() == self.owner || sender() == self.authorizedOrchestrator,
            "StrategyExecutor: unauthorized"
        );
        require(!self.isHalted, "StrategyExecutor: halted");

        let rec: StrategyRecord? = self.strategies.get(msg.strategyId);
        require(rec != null, "StrategyExecutor: strategy not found");
        let r: StrategyRecord = rec!!;
        require(r.status == STATUS_PENDING, "StrategyExecutor: strategy not in pending state");

        r.status = STATUS_RUNNING;
        r.startedAt = now();
        self.strategies.set(msg.strategyId, r);
    }

    // ---- stop strategy ----
    receive(msg: StopStrategy) {
        require(
            sender() == self.owner || sender() == self.authorizedOrchestrator,
            "StrategyExecutor: unauthorized"
        );

        let rec: StrategyRecord? = self.strategies.get(msg.strategyId);
        require(rec != null, "StrategyExecutor: strategy not found");
        let r: StrategyRecord = rec!!;

        r.status = STATUS_STOPPED;
        r.stoppedAt = now();
        self.strategies.set(msg.strategyId, r);
    }

    // ---- execute AI signal ----
    receive(msg: ExecuteSignal) {
        require(sender() == self.authorizedOrchestrator, "StrategyExecutor: unauthorized orchestrator");
        require(!self.isHalted, "StrategyExecutor: halted");

        let rec: StrategyRecord? = self.strategies.get(msg.strategyId);
        require(rec != null, "StrategyExecutor: strategy not found");
        let r: StrategyRecord = rec!!;

        // Validate strategy is active
        require(r.status == STATUS_RUNNING, "StrategyExecutor: strategy not running");

        // Validate expiry
        if (r.expiresAt > 0) {
            require(now() < r.expiresAt, "StrategyExecutor: strategy expired");
        }

        // Replay protection: nonce must be strictly increasing
        require(
            msg.signalNonce > r.lastSignalNonce,
            "StrategyExecutor: replayed or out-of-order signal"
        );

        // Position size limit
        require(
            msg.amount <= r.maxPositionNano,
            "StrategyExecutor: trade size exceeds maxPositionNano"
        );

        // Execution count limit
        if (r.maxExecutions > 0) {
            require(
                r.executionCount < r.maxExecutions,
                "StrategyExecutor: max executions reached"
            );
        }

        // Projected loss guard
        let projectedLoss: Int = msg.expectedPnlNano < 0 ? -msg.expectedPnlNano : 0;
        if (r.maxLossNano > 0) {
            require(
                r.cumulativeLossNano + projectedLoss <= r.maxLossNano,
                "StrategyExecutor: projected loss would exceed max loss"
            );
        }

        // Update state before external call (checks-effects-interactions)
        r.lastSignalNonce = msg.signalNonce;
        r.executionCount = r.executionCount + 1;
        if (projectedLoss > 0) {
            r.cumulativeLossNano = r.cumulativeLossNano + projectedLoss;
        }

        // Write audit entry (expected PnL; actual PnL filled in by ReportOutcome)
        let auditKey: Int = self.auditKey(msg.strategyId, r.executionCount);
        self.auditLog.set(auditKey, AuditEntry{
            strategyId: msg.strategyId,
            seqno: r.executionCount,
            signalNonce: msg.signalNonce,
            to: msg.to,
            amount: msg.amount,
            expectedPnlNano: msg.expectedPnlNano,
            actualPnlNano: 0,    // updated by ReportOutcome
            gasUsedNano: 0,
            executedAt: now()
        });

        // Auto-complete if max executions reached
        if (r.maxExecutions > 0 && r.executionCount >= r.maxExecutions) {
            r.status = STATUS_COMPLETED;
            r.stoppedAt = now();
        }

        self.strategies.set(msg.strategyId, r);

        // Forward the trade to the AgentWallet via an internal message.
        // The AgentWallet enforces its own spending limits as a second layer.
        send(SendParameters{
            to: r.agentWallet,
            value: msg.amount,
            mode: SendIgnoreErrors,
            body: msg.payload != null ? msg.payload!! : emptyCell()
        });
    }

    // ---- report outcome ----
    receive(msg: ReportOutcome) {
        require(sender() == self.authorizedOrchestrator, "StrategyExecutor: unauthorized");

        let rec: StrategyRecord? = self.strategies.get(msg.strategyId);
        require(rec != null, "StrategyExecutor: strategy not found");
        let r: StrategyRecord = rec!!;

        // Update actual cumulative loss if the outcome was worse than projected
        if (msg.actualPnlNano < 0) {
            let actualLoss: Int = -msg.actualPnlNano;
            if (actualLoss > r.cumulativeLossNano) {
                r.cumulativeLossNano = actualLoss;
            }
            // Auto-stop if real loss now exceeds max loss
            if (r.maxLossNano > 0 && r.cumulativeLossNano >= r.maxLossNano && r.status == STATUS_RUNNING) {
                r.status = STATUS_STOPPED;
                r.stoppedAt = now();
            }
        }
        self.strategies.set(msg.strategyId, r);

        // Patch the audit entry with real outcomes
        let auditKey: Int = self.auditKey(msg.strategyId, r.executionCount);
        let entry: AuditEntry? = self.auditLog.get(auditKey);
        if (entry != null) {
            let e: AuditEntry = entry!!;
            e.actualPnlNano = msg.actualPnlNano;
            e.gasUsedNano = msg.gasUsedNano;
            self.auditLog.set(auditKey, e);
        }
    }

    // ---- admin: set orchestrator ----
    receive(msg: SetOrchestrator) {
        self.requireOwner();
        self.authorizedOrchestrator = msg.orchestrator;
    }

    // ---- emergency halt ----
    receive(msg: EmergencyHalt) {
        self.requireOwner();
        self.isHalted = true;
    }

    // ---- views ----

    get fun strategy(strategyId: Int): StrategyRecord? {
        return self.strategies.get(strategyId);
    }

    get fun auditEntry(strategyId: Int, seqno: Int): AuditEntry? {
        return self.auditLog.get(self.auditKey(strategyId, seqno));
    }

    get fun halted(): Bool {
        return self.isHalted;
    }

    get fun totalStrategies(): Int {
        return self.totalStrategiesRegistered;
    }

    get fun orchestrator(): Address {
        return self.authorizedOrchestrator;
    }

    // ---- private helpers ----

    fun auditKey(strategyId: Int, seqno: Int): Int {
        // Pack strategyId in high 32 bits and seqno in low 32 bits
        return (strategyId << 32) | seqno;
    }
}
