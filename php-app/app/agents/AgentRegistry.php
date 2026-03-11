<?php
/**
 * TONAIAgent - Agent Registry
 *
 * Maintains the collection of known agents and their current states.
 * Uses the database when available, falls back to an in-memory demo store.
 *
 * Agent states: running, stopped, paused, error
 *
 * Implements Issue #185: Agent Control API
 */

if (basename($_SERVER['PHP_SELF'] ?? '') === 'AgentRegistry.php') {
    http_response_code(403);
    exit('Direct access forbidden');
}

class AgentRegistry
{
    private ?object $db;

    /** In-memory demo agents (used when DB is unavailable) */
    private static array $demoAgents = [];
    private static bool  $demoSeeded = false;

    public function __construct(?object $db = null)
    {
        $this->db = $db;
        if ($this->db === null && !self::$demoSeeded) {
            $this->seedDemoAgents();
        }
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Return all registered agents as lightweight summary arrays.
     *
     * @return array<int, array{id:string, name:string, status:string, strategy:string, owner_id:string, created_at:string, updated_at:string}>
     */
    public function findAll(): array
    {
        if ($this->db !== null) {
            return $this->findAllFromDb();
        }
        return array_values(array_map(
            fn($a) => $this->toSummary($a),
            self::$demoAgents
        ));
    }

    /**
     * Return the full record for a single agent or null if not found.
     *
     * @return array<string, mixed>|null
     */
    public function findById(string $agentId): ?array
    {
        if ($this->db !== null) {
            return $this->findByIdFromDb($agentId);
        }
        return isset(self::$demoAgents[$agentId])
            ? self::$demoAgents[$agentId]
            : null;
    }

    /**
     * Persist a status change for an agent.
     * Returns true on success, false when the agent was not found.
     */
    public function updateStatus(string $agentId, string $status, ?string $errorMessage = null): bool
    {
        if ($this->db !== null) {
            return $this->updateStatusInDb($agentId, $status, $errorMessage);
        }

        if (!isset(self::$demoAgents[$agentId])) {
            return false;
        }

        $agent                      = &self::$demoAgents[$agentId];
        $agent['status']            = $status;
        $agent['updated_at']        = (new DateTime())->format(DateTime::ATOM);
        $agent['error_message']     = $errorMessage;

        if ($status === 'running') {
            $agent['started_at'] = (new DateTime())->format(DateTime::ATOM);
        } elseif ($status === 'stopped') {
            $agent['started_at'] = null;
        }

        return true;
    }

    // -------------------------------------------------------------------------
    // Database-backed implementations
    // -------------------------------------------------------------------------

    private function findAllFromDb(): array
    {
        try {
            $pdo  = $this->db->getConnection();
            $stmt = $pdo->query(
                'SELECT id, name, status, strategy, owner_id, created_at, updated_at
                   FROM agents
                  ORDER BY created_at DESC'
            );
            return $stmt->fetchAll(\PDO::FETCH_ASSOC) ?: [];
        } catch (\Throwable $e) {
            error_log('[AgentRegistry] findAllFromDb error: ' . $e->getMessage());
            return [];
        }
    }

    private function findByIdFromDb(string $agentId): ?array
    {
        try {
            $pdo  = $this->db->getConnection();
            $stmt = $pdo->prepare(
                'SELECT id, name, status, strategy, owner_id,
                        started_at, last_executed_at, trades_executed,
                        error_message, created_at, updated_at
                   FROM agents
                  WHERE id = :id
                  LIMIT 1'
            );
            $stmt->execute([':id' => $agentId]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            return $row ?: null;
        } catch (\Throwable $e) {
            error_log('[AgentRegistry] findByIdFromDb error: ' . $e->getMessage());
            return null;
        }
    }

    private function updateStatusInDb(string $agentId, string $status, ?string $errorMessage): bool
    {
        try {
            $pdo   = $this->db->getConnection();
            $now   = (new DateTime())->format('Y-m-d H:i:s');
            $extra = '';

            if ($status === 'running') {
                $extra = ', started_at = :started_at';
            } elseif ($status === 'stopped') {
                $extra = ', started_at = NULL';
            }

            $sql  = "UPDATE agents
                        SET status = :status, error_message = :error, updated_at = :now{$extra}
                      WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $params = [
                ':status' => $status,
                ':error'  => $errorMessage,
                ':now'    => $now,
                ':id'     => $agentId,
            ];
            if ($status === 'running') {
                $params[':started_at'] = $now;
            }

            $stmt->execute($params);
            return $stmt->rowCount() > 0;
        } catch (\Throwable $e) {
            error_log('[AgentRegistry] updateStatusInDb error: ' . $e->getMessage());
            return false;
        }
    }

    // -------------------------------------------------------------------------
    // Demo Data
    // -------------------------------------------------------------------------

    private function seedDemoAgents(): void
    {
        $now    = new DateTime();
        $minus1h = (clone $now)->modify('-1 hour')->format(DateTime::ATOM);
        $minus3h = (clone $now)->modify('-3 hours')->format(DateTime::ATOM);
        $minus1d = (clone $now)->modify('-1 day')->format(DateTime::ATOM);
        $nowStr  = $now->format(DateTime::ATOM);

        self::$demoAgents = [
            'agent_001' => [
                'id'               => 'agent_001',
                'name'             => 'TON Trend Trader',
                'status'           => 'running',
                'strategy'         => 'trading',
                'owner_id'         => 'demo_user',
                'started_at'       => $minus3h,
                'last_executed_at' => $minus1h,
                'trades_executed'  => 42,
                'error_message'    => null,
                'created_at'       => $minus1d,
                'updated_at'       => $minus1h,
            ],
            'agent_002' => [
                'id'               => 'agent_002',
                'name'             => 'Yield Optimizer',
                'status'           => 'stopped',
                'strategy'         => 'yield',
                'owner_id'         => 'demo_user',
                'started_at'       => null,
                'last_executed_at' => $minus1d,
                'trades_executed'  => 15,
                'error_message'    => null,
                'created_at'       => $minus1d,
                'updated_at'       => $minus1d,
            ],
            'agent_003' => [
                'id'               => 'agent_003',
                'name'             => 'Arbitrage Scout',
                'status'           => 'paused',
                'strategy'         => 'arbitrage',
                'owner_id'         => 'demo_user',
                'started_at'       => $minus3h,
                'last_executed_at' => $minus3h,
                'trades_executed'  => 8,
                'error_message'    => null,
                'created_at'       => $minus1d,
                'updated_at'       => $minus3h,
            ],
        ];

        self::$demoSeeded = true;
    }

    // -------------------------------------------------------------------------
    // Projection Helpers
    // -------------------------------------------------------------------------

    /** Project a full agent record to a lightweight summary. */
    private function toSummary(array $agent): array
    {
        return [
            'id'         => $agent['id'],
            'name'       => $agent['name'],
            'status'     => $agent['status'],
            'strategy'   => $agent['strategy'],
            'owner_id'   => $agent['owner_id'],
            'created_at' => $agent['created_at'],
            'updated_at' => $agent['updated_at'],
        ];
    }
}
