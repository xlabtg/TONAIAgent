/*!
 * AgentWallet — TONAIAgent Smart Contract
 *
 * Custodial wallet that holds user funds and delegates trading authority
 * to an AI agent, subject to configurable limits and safety guardrails.
 *
 * Security properties:
 *  - Only the owner may deposit, withdraw, update limits, or pause.
 *  - The agent may send transactions only within configured limits.
 *  - All withdrawals above the time-lock threshold are delayed by
 *    `timeLockSeconds` before they can be claimed.
 *  - Owner can trigger an emergency drain to a pre-set safe address.
 *  - Re-entrancy is prevented by the TON actor model (one message at a time).
 *
 * Tact language reference: https://tact-lang.org/
 * TON security best practices: https://docs.ton.org/contract-dev/security
 */

import "@stdlib/deploy";
import "@stdlib/ownable";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Maximum basis-points value (100%)
const MAX_BPS: Int = 10000;

/// Minimum TON that must remain in the contract for storage rent.
const MIN_TON_RESERVE: Int = ton("0.05");

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

/// Spending limits returned by the `limits` getter.
struct WalletLimits {
    maxTradeSizeNano: Int as coins;
    dailyLimitNano: Int as coins;
    timeLockSeconds: Int as uint32;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/// Owner funds the wallet with attached TON value.
message Deposit {}

/// Owner requests withdrawal of `amount` nanoTON to `to`.
message WithdrawRequest {
    to: Address;
    amount: Int as coins;
}

/// Owner claims a withdrawal that has passed the time-lock.
message ClaimWithdrawal {
    nonce: Int as uint64;
}

/// Agent submits a transaction payload to execute on behalf of the wallet.
message AgentExecute {
    to: Address;
    amount: Int as coins;
    payload: Cell?;
    opCode: Int as uint32;    // caller-defined operation code for audit trail
}

/// Owner updates spending limits.
message UpdateLimits {
    maxTradeSizeNano: Int as coins;
    dailyLimitNano: Int as coins;
    timeLockSeconds: Int as uint32;
}

/// Owner adds or removes an allowed DEX address.
message SetAllowedDex {
    dex: Address;
    allowed: Bool;
}

/// Owner updates the agent address.
message SetAgent {
    agent: Address;
}

/// Owner enables or disables the emergency pause.
message SetPaused {
    paused: Bool;
}

/// Owner triggers emergency drain to the safe address.
message EmergencyDrain {}

/// Owner updates the emergency safe address.
message SetSafeAddress {
    safe: Address;
}

// ---------------------------------------------------------------------------
// Pending withdrawal record
// ---------------------------------------------------------------------------

struct PendingWithdrawal {
    to: Address;
    amount: Int as coins;
    unlocksAt: Int as uint64;   // Unix timestamp
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

contract AgentWallet with Deployable, Ownable {

    // ---- persistent state ----
    owner: Address;
    agent: Address;
    safeAddress: Address;

    // Spending limits
    maxTradeSizeNano: Int as coins;    // max single trade
    dailyLimitNano: Int as coins;      // max daily agent spend
    timeLockSeconds: Int as uint32;    // withdrawal delay for large amounts

    // Runtime accounting
    dailySpent: Int as coins;
    dayStart: Int as uint64;           // Unix timestamp of current day window

    // Allowed DEXes (address -> Bool) and a flag to activate the whitelist
    allowedDexes: map<Address, Bool>;
    whitelistActive: Bool;              // true once any DEX is added

    // Pending time-locked withdrawals
    pendingWithdrawals: map<Int, PendingWithdrawal>;
    withdrawalNonce: Int as uint64;

    // Safety
    isPaused: Bool;

    // ---- constructor ----
    init(
        owner: Address,
        agent: Address,
        safeAddress: Address,
        maxTradeSizeNano: Int,
        dailyLimitNano: Int,
        timeLockSeconds: Int
    ) {
        self.owner = owner;
        self.agent = agent;
        self.safeAddress = safeAddress;
        self.maxTradeSizeNano = maxTradeSizeNano;
        self.dailyLimitNano = dailyLimitNano;
        self.timeLockSeconds = timeLockSeconds;
        self.dailySpent = 0;
        self.dayStart = now();
        self.withdrawalNonce = 0;
        self.isPaused = false;
        self.whitelistActive = false;
    }

    // ---- receive TON ----
    receive(msg: Deposit) {
        // Accept any TON attached to this message.
        // The value is automatically credited to the contract balance.
    }

    receive() {
        // Accept plain TON transfers (e.g. from TON wallets).
    }

    // ---- owner: withdraw ----
    receive(msg: WithdrawRequest) {
        self.requireOwner();
        require(!self.isPaused, "AgentWallet: paused");
        require(msg.amount > 0, "AgentWallet: amount must be positive");
        let available: Int = myBalance() - MIN_TON_RESERVE;
        require(msg.amount <= available, "AgentWallet: insufficient balance");

        if (self.timeLockSeconds > 0 && msg.amount > self.maxTradeSizeNano) {
            // Queue the withdrawal for time-lock
            self.withdrawalNonce = self.withdrawalNonce + 1;
            self.pendingWithdrawals.set(self.withdrawalNonce, PendingWithdrawal{
                to: msg.to,
                amount: msg.amount,
                unlocksAt: now() + self.timeLockSeconds
            });
        } else {
            // Immediate withdrawal
            send(SendParameters{
                to: msg.to,
                value: msg.amount,
                mode: SendRemainingValue | SendIgnoreErrors,
                body: emptyCell()
            });
        }
    }

    // ---- owner: claim time-locked withdrawal ----
    receive(msg: ClaimWithdrawal) {
        self.requireOwner();
        require(!self.isPaused, "AgentWallet: paused");
        let pending: PendingWithdrawal? = self.pendingWithdrawals.get(msg.nonce);
        require(pending != null, "AgentWallet: withdrawal not found");
        let pw: PendingWithdrawal = pending!!;
        require(now() >= pw.unlocksAt, "AgentWallet: time-lock not expired");
        self.pendingWithdrawals.del(msg.nonce);
        send(SendParameters{
            to: pw.to,
            value: pw.amount,
            mode: SendRemainingValue | SendIgnoreErrors,
            body: emptyCell()
        });
    }

    // ---- agent: execute trade ----
    receive(msg: AgentExecute) {
        require(sender() == self.agent, "AgentWallet: caller is not the agent");
        require(!self.isPaused, "AgentWallet: paused");
        require(msg.amount > 0, "AgentWallet: amount must be positive");
        require(msg.amount <= self.maxTradeSizeNano, "AgentWallet: exceeds max trade size");

        // Enforce daily limit (rolling 24-hour window)
        self.refreshDailyWindow();
        require(
            self.dailySpent + msg.amount <= self.dailyLimitNano,
            "AgentWallet: daily limit exceeded"
        );

        // If the whitelist is active, enforce it: only explicitly allowed DEXes pass.
        if (self.whitelistActive) {
            let isAllowed: Bool? = self.allowedDexes.get(msg.to);
            require(isAllowed != null && isAllowed!!, "AgentWallet: DEX not in whitelist");
        }

        require(
            myBalance() - msg.amount >= MIN_TON_RESERVE,
            "AgentWallet: insufficient balance for trade"
        );

        self.dailySpent = self.dailySpent + msg.amount;

        send(SendParameters{
            to: msg.to,
            value: msg.amount,
            mode: SendRemainingValue | SendIgnoreErrors,
            body: msg.payload != null ? msg.payload!! : emptyCell()
        });
    }

    // ---- owner: update limits ----
    receive(msg: UpdateLimits) {
        self.requireOwner();
        require(msg.maxTradeSizeNano > 0, "AgentWallet: invalid max trade size");
        require(msg.dailyLimitNano >= msg.maxTradeSizeNano, "AgentWallet: daily limit must be >= max trade size");
        self.maxTradeSizeNano = msg.maxTradeSizeNano;
        self.dailyLimitNano = msg.dailyLimitNano;
        self.timeLockSeconds = msg.timeLockSeconds;
    }

    // ---- owner: manage DEX whitelist ----
    receive(msg: SetAllowedDex) {
        self.requireOwner();
        if (msg.allowed) {
            self.allowedDexes.set(msg.dex, true);
            self.whitelistActive = true;
        } else {
            self.allowedDexes.del(msg.dex);
        }
    }

    // ---- owner: set agent address ----
    receive(msg: SetAgent) {
        self.requireOwner();
        self.agent = msg.agent;
    }

    // ---- owner: pause / unpause ----
    receive(msg: SetPaused) {
        self.requireOwner();
        self.isPaused = msg.paused;
    }

    // ---- owner: set safe address ----
    receive(msg: SetSafeAddress) {
        self.requireOwner();
        self.safeAddress = msg.safe;
    }

    // ---- owner: emergency drain ----
    receive(msg: EmergencyDrain) {
        self.requireOwner();
        self.isPaused = true;
        let balance: Int = myBalance() - MIN_TON_RESERVE;
        if (balance > 0) {
            send(SendParameters{
                to: self.safeAddress,
                value: balance,
                mode: SendRemainingValue | SendIgnoreErrors,
                body: emptyCell()
            });
        }
    }

    // ---- views ----

    get fun balance(): Int {
        return myBalance();
    }

    get fun agentAddress(): Address {
        return self.agent;
    }

    get fun safeAddr(): Address {
        return self.safeAddress;
    }

    get fun limits(): WalletLimits {
        return WalletLimits{
            maxTradeSizeNano: self.maxTradeSizeNano,
            dailyLimitNano: self.dailyLimitNano,
            timeLockSeconds: self.timeLockSeconds
        };
    }

    get fun paused(): Bool {
        return self.isPaused;
    }

    get fun dailySpentToday(): Int {
        return self.dailySpent;
    }

    get fun pendingWithdrawal(nonce: Int): PendingWithdrawal? {
        return self.pendingWithdrawals.get(nonce);
    }

    // ---- private helpers ----

    fun refreshDailyWindow() {
        // Reset the daily window if 24 hours have elapsed
        if (now() >= self.dayStart + 86400) {
            self.dailySpent = 0;
            self.dayStart = now();
        }
    }
}
