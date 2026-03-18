<?php
/**
 * TONAIAgent - Agent Controller
 *
 * REST API controller for agent lifecycle management.
 *
 * Endpoints (Issue #185):
 *   GET  /api/agents              — List all agents
 *   GET  /api/agents/{id}         — Get agent status (id, status, strategy, uptime, trades)
 *   POST /api/agents/{id}/start   — Start a stopped agent
 *   POST /api/agents/{id}/stop    — Stop an active agent
 *   POST /api/agents/{id}/restart — Restart an agent
 */

require_once __DIR__ . '/../agents/AgentManager.php';

class AgentController
{
    private AgentManager $manager;

    public function __construct(AgentManager $manager)
    {
        $this->manager = $manager;
    }

    // -------------------------------------------------------------------------
    // Endpoint Handlers
    // -------------------------------------------------------------------------

    /**
     * GET /api/agents
     *
     * Returns a paginated list of all agents.
     */
    public function listAgents(): array
    {
        $result = $this->manager->listAgents();
        return [
            'agents' => $result['agents'],
            'total'  => $result['total'],
        ];
    }

    /**
     * GET /api/agents/{id}
     *
     * Returns the full status of a single agent.
     *
     * @throws RuntimeException 404 when agent not found
     */
    public function getAgent(string $agentId): array
    {
        $agentId = $this->sanitizeId($agentId);
        return $this->manager->getAgentStatus($agentId);
    }

    /**
     * POST /api/agents/{id}/start
     *
     * Starts a stopped agent. Returns 409 if already running.
     *
     * @throws RuntimeException 404/409 on failure
     */
    public function startAgent(string $agentId): array
    {
        $agentId = $this->sanitizeId($agentId);
        return $this->manager->startAgent($agentId);
    }

    /**
     * POST /api/agents/{id}/stop
     *
     * Stops an active agent. Returns 409 if already stopped.
     *
     * @throws RuntimeException 404/409 on failure
     */
    public function stopAgent(string $agentId): array
    {
        $agentId = $this->sanitizeId($agentId);
        return $this->manager->stopAgent($agentId);
    }

    /**
     * POST /api/agents/{id}/restart
     *
     * Restarts an agent from any state.
     *
     * @throws RuntimeException 404 when agent not found
     */
    public function restartAgent(string $agentId): array
    {
        $agentId = $this->sanitizeId($agentId);
        return $this->manager->restartAgent($agentId);
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    /**
     * Sanitize and validate an agent ID path segment.
     *
     * @throws RuntimeException 400 if the ID is blank
     */
    private function sanitizeId(string $agentId): string
    {
        $clean = trim(strip_tags($agentId));
        if ($clean === '') {
            throw new RuntimeException('Agent ID must not be empty', 400);
        }
        return $clean;
    }
}
