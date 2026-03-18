<?php
/**
 * TONAIAgent - Agent Lifecycle Manager
 *
 * Manages agent lifecycle operations: start, stop, restart.
 * Validates state transitions before applying them.
 *
 * Valid transitions:
 *   stopped -> running  (start)
 *   paused  -> running  (start)
 *   error   -> running  (start — clears error state)
 *   running -> stopped  (stop)
 *   paused  -> stopped  (stop)
 *   error   -> stopped  (stop)
 *   *       -> running  (restart: unconditional)
 *
 * Implements Issue #185: Agent Control API
 */

require_once __DIR__ . '/AgentRegistry.php';

if (basename($_SERVER['PHP_SELF'] ?? '') === 'AgentManager.php') {
    http_response_code(403);
    exit('Direct access forbidden');
}

class AgentManager
{
    private AgentRegistry $registry;

    /** Valid states an agent can be started from */
    private const STARTABLE_STATES = ['stopped', 'paused', 'error'];

    /** Valid states an agent can be stopped from */
    private const STOPPABLE_STATES = ['running', 'paused', 'error'];

    public function __construct(AgentRegistry $registry)
    {
        $this->registry = $registry;
    }

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    /**
     * List all agents as lightweight summaries.
     *
     * @return array{agents: array<int, array<string,mixed>>, total: int}
     */
    public function listAgents(): array
    {
        $agents = $this->registry->findAll();
        return ['agents' => $agents, 'total' => count($agents)];
    }

    /**
     * Get the full status of a single agent.
     *
     * @return array<string, mixed>
     * @throws RuntimeException When agent is not found
     */
    public function getAgentStatus(string $agentId): array
    {
        $agent = $this->registry->findById($agentId);
        if ($agent === null) {
            throw new RuntimeException("Agent '{$agentId}' not found", 404);
        }
        return $this->buildStatusResponse($agent);
    }

    // -------------------------------------------------------------------------
    // Lifecycle Operations
    // -------------------------------------------------------------------------

    /**
     * Start a stopped / paused / error agent.
     *
     * @return array{agent_id: string, status: string, message: string}
     * @throws RuntimeException On validation failure or agent not found
     */
    public function startAgent(string $agentId): array
    {
        $agent = $this->requireAgent($agentId);

        if ($agent['status'] === 'running') {
            throw new RuntimeException(
                "Agent '{$agentId}' is already running",
                409
            );
        }

        if (!in_array($agent['status'], self::STARTABLE_STATES, true)) {
            throw new RuntimeException(
                "Cannot start agent '{$agentId}' from state '{$agent['status']}'",
                409
            );
        }

        $this->registry->updateStatus($agentId, 'running');

        return [
            'agent_id' => $agentId,
            'status'   => 'running',
            'message'  => "Agent '{$agent['name']}' started successfully",
        ];
    }

    /**
     * Stop a running / paused / error agent.
     *
     * @return array{agent_id: string, status: string, message: string}
     * @throws RuntimeException On validation failure or agent not found
     */
    public function stopAgent(string $agentId): array
    {
        $agent = $this->requireAgent($agentId);

        if ($agent['status'] === 'stopped') {
            throw new RuntimeException(
                "Agent '{$agentId}' is already stopped",
                409
            );
        }

        if (!in_array($agent['status'], self::STOPPABLE_STATES, true)) {
            throw new RuntimeException(
                "Cannot stop agent '{$agentId}' from state '{$agent['status']}'",
                409
            );
        }

        $this->registry->updateStatus($agentId, 'stopped');

        return [
            'agent_id' => $agentId,
            'status'   => 'stopped',
            'message'  => "Agent '{$agent['name']}' stopped successfully",
        ];
    }

    /**
     * Restart an agent unconditionally (stop-then-start in a single operation).
     *
     * @return array{agent_id: string, status: string, message: string}
     * @throws RuntimeException When agent is not found
     */
    public function restartAgent(string $agentId): array
    {
        $agent = $this->requireAgent($agentId);

        $this->registry->updateStatus($agentId, 'running');

        return [
            'agent_id' => $agentId,
            'status'   => 'running',
            'message'  => "Agent '{$agent['name']}' restarted successfully",
        ];
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    /**
     * Fetch an agent record or throw 404.
     *
     * @return array<string, mixed>
     */
    private function requireAgent(string $agentId): array
    {
        $agent = $this->registry->findById($agentId);
        if ($agent === null) {
            throw new RuntimeException("Agent '{$agentId}' not found", 404);
        }
        return $agent;
    }

    /**
     * Build the full status response for the GET /api/agents/{id} endpoint.
     *
     * @param  array<string, mixed> $agent
     * @return array<string, mixed>
     */
    private function buildStatusResponse(array $agent): array
    {
        $uptimeSeconds = null;
        if ($agent['status'] === 'running' && !empty($agent['started_at'])) {
            $started       = new DateTime($agent['started_at']);
            $uptimeSeconds = (new DateTime())->getTimestamp() - $started->getTimestamp();
        }

        return [
            'id'               => $agent['id'],
            'name'             => $agent['name'],
            'status'           => $agent['status'],
            'strategy'         => $agent['strategy'],
            'owner_id'         => $agent['owner_id'],
            'uptime_seconds'   => $uptimeSeconds,
            'trades_executed'  => (int)($agent['trades_executed'] ?? 0),
            'last_executed_at' => $agent['last_executed_at'] ?? null,
            'error_message'    => $agent['error_message'] ?? null,
            'created_at'       => $agent['created_at'],
            'updated_at'       => $agent['updated_at'],
        ];
    }
}
