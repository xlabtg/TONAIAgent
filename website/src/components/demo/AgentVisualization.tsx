'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  RobotIcon,
  ChartIcon,
  ShieldIcon,
  LightningIcon,
  ArrowRightIcon,
} from '@/components/icons';

// Agent types for visualization
interface Agent {
  id: string;
  name: string;
  type: 'portfolio' | 'execution' | 'risk' | 'data' | 'coordinator';
  status: 'active' | 'waiting' | 'processing';
  position: { x: number; y: number };
  connections: string[];
}

interface DataFlow {
  from: string;
  to: string;
  label: string;
  active: boolean;
}

const agents: Agent[] = [
  {
    id: 'coordinator',
    name: 'Coordinator Agent',
    type: 'coordinator',
    status: 'active',
    position: { x: 50, y: 10 },
    connections: ['portfolio', 'risk', 'data'],
  },
  {
    id: 'portfolio',
    name: 'Portfolio Agent',
    type: 'portfolio',
    status: 'active',
    position: { x: 20, y: 40 },
    connections: ['execution'],
  },
  {
    id: 'risk',
    name: 'Risk Agent',
    type: 'risk',
    status: 'processing',
    position: { x: 50, y: 40 },
    connections: ['execution'],
  },
  {
    id: 'data',
    name: 'Data Agent',
    type: 'data',
    status: 'active',
    position: { x: 80, y: 40 },
    connections: ['portfolio', 'risk'],
  },
  {
    id: 'execution',
    name: 'Execution Agent',
    type: 'execution',
    status: 'waiting',
    position: { x: 35, y: 75 },
    connections: [],
  },
];

const dataFlows: DataFlow[] = [
  { from: 'coordinator', to: 'portfolio', label: 'Strategy Update', active: true },
  { from: 'coordinator', to: 'risk', label: 'Risk Params', active: false },
  { from: 'coordinator', to: 'data', label: 'Data Request', active: true },
  { from: 'data', to: 'portfolio', label: 'Market Data', active: true },
  { from: 'data', to: 'risk', label: 'Volatility Signal', active: true },
  { from: 'portfolio', to: 'execution', label: 'Trade Order', active: false },
  { from: 'risk', to: 'execution', label: 'Approval', active: false },
];

const agentIcons = {
  coordinator: <RobotIcon size={24} />,
  portfolio: <ChartIcon size={24} />,
  risk: <ShieldIcon size={24} />,
  data: <LightningIcon size={24} />,
  execution: <ArrowRightIcon size={24} />,
};

const agentColors = {
  coordinator: 'bg-accent-purple',
  portfolio: 'bg-ton-blue',
  risk: 'bg-warning',
  data: 'bg-vibrant-cyan',
  execution: 'bg-success',
};

export function AgentVisualization() {
  const [activeFlows, setActiveFlows] = useState<Set<string>>(new Set());
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Simulate data flow animation
  useEffect(() => {
    if (!isAnimating) return;

    const flowSequence = [
      ['coordinator-data', 'coordinator-portfolio'],
      ['data-portfolio', 'data-risk'],
      ['coordinator-risk'],
      ['portfolio-execution', 'risk-execution'],
    ];

    let step = 0;
    const interval = setInterval(() => {
      setActiveFlows(new Set(flowSequence[step % flowSequence.length]));
      step++;
    }, 1500);

    return () => clearInterval(interval);
  }, [isAnimating]);

  const renderConnection = (from: Agent, to: Agent, flowId: string) => {
    const isActive = activeFlows.has(flowId);
    const flow = dataFlows.find((f) => f.from === from.id && f.to === to.id);

    // Calculate line positions
    const x1 = from.position.x;
    const y1 = from.position.y + 5;
    const x2 = to.position.x;
    const y2 = to.position.y - 5;

    return (
      <g key={flowId}>
        <line
          x1={`${x1}%`}
          y1={`${y1}%`}
          x2={`${x2}%`}
          y2={`${y2}%`}
          stroke={isActive ? '#0088CC' : '#334155'}
          strokeWidth={isActive ? 3 : 2}
          strokeDasharray={isActive ? '0' : '5,5'}
          className={isActive ? 'animate-pulse' : ''}
        />
        {isActive && (
          <circle r="4" fill="#0088CC" className="animate-flow">
            <animateMotion
              dur="1s"
              repeatCount="indefinite"
              path={`M${(x1 * 4).toFixed(0)},${(y1 * 3).toFixed(0)} L${(x2 * 4).toFixed(0)},${(y2 * 3).toFixed(0)}`}
            />
          </circle>
        )}
        {flow && isActive && (
          <text
            x={`${(x1 + x2) / 2}%`}
            y={`${(y1 + y2) / 2 - 2}%`}
            textAnchor="middle"
            className="text-xs fill-ton-blue font-medium"
          >
            {flow.label}
          </text>
        )}
      </g>
    );
  };

  return (
    <section className="py-20 bg-background-secondary">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              Multi-Agent System
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Agent Orchestration Visualization
            </h2>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
              Watch how autonomous agents coordinate in real-time: data flows,
              decision-making, risk assessment, and trade execution.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Visualization Canvas */}
            <div className="lg:col-span-2">
              <Card variant="feature" className="p-6 min-h-[500px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-foreground">Agent Network</h3>
                  <Button
                    size="sm"
                    variant={isAnimating ? 'primary' : 'outline'}
                    onClick={() => setIsAnimating(!isAnimating)}
                  >
                    {isAnimating ? 'Pause' : 'Animate'}
                  </Button>
                </div>

                {/* SVG Visualization */}
                <div className="relative h-[400px] bg-background-secondary rounded-xl overflow-hidden">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox="0 0 400 300"
                    className="absolute inset-0"
                  >
                    {/* Grid Background */}
                    <defs>
                      <pattern
                        id="grid"
                        width="20"
                        height="20"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 20 0 L 0 0 0 20"
                          fill="none"
                          stroke="var(--border)"
                          strokeWidth="0.5"
                          opacity="0.3"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Connection Lines */}
                    {agents.map((agent) =>
                      agent.connections.map((targetId) => {
                        const target = agents.find((a) => a.id === targetId);
                        if (!target) return null;
                        return renderConnection(
                          agent,
                          target,
                          `${agent.id}-${targetId}`
                        );
                      })
                    )}
                  </svg>

                  {/* Agent Nodes */}
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() =>
                        setSelectedAgent(selectedAgent === agent.id ? null : agent.id)
                      }
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                        selectedAgent === agent.id
                          ? 'scale-110 z-20'
                          : 'hover:scale-105 z-10'
                      }`}
                      style={{
                        left: `${agent.position.x}%`,
                        top: `${agent.position.y}%`,
                      }}
                    >
                      <div
                        className={`relative p-4 rounded-2xl ${agentColors[agent.type]} text-white shadow-lg ${
                          agent.status === 'processing'
                            ? 'animate-pulse'
                            : agent.status === 'waiting'
                              ? 'opacity-70'
                              : ''
                        }`}
                      >
                        {agentIcons[agent.type]}
                        <span
                          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                            agent.status === 'active'
                              ? 'bg-success'
                              : agent.status === 'processing'
                                ? 'bg-warning'
                                : 'bg-foreground-muted'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-foreground-muted mt-2 text-center whitespace-nowrap">
                        {agent.name}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-success" />
                    <span className="text-foreground-muted">Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-warning" />
                    <span className="text-foreground-muted">Processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-foreground-muted" />
                    <span className="text-foreground-muted">Waiting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-0.5 bg-ton-blue" />
                    <span className="text-foreground-muted">Active Flow</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Agent Details Panel */}
            <div className="space-y-4">
              <Card variant="feature" className="p-6">
                <h3 className="font-semibold text-foreground mb-4">
                  {selectedAgent
                    ? agents.find((a) => a.id === selectedAgent)?.name
                    : 'Select an Agent'}
                </h3>

                {selectedAgent ? (
                  <div className="space-y-4">
                    {(() => {
                      const agent = agents.find((a) => a.id === selectedAgent);
                      if (!agent) return null;

                      return (
                        <>
                          <div>
                            <p className="text-sm text-foreground-muted mb-1">Type</p>
                            <Badge variant="primary" className="capitalize">
                              {agent.type}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-foreground-muted mb-1">Status</p>
                            <Badge
                              variant={
                                agent.status === 'active'
                                  ? 'success'
                                  : agent.status === 'processing'
                                    ? 'warning'
                                    : 'default'
                              }
                              className="capitalize"
                            >
                              {agent.status}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-foreground-muted mb-2">
                              Connected Agents
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {agent.connections.length > 0 ? (
                                agent.connections.map((connId) => (
                                  <Badge key={connId} variant="default" size="sm">
                                    {agents.find((a) => a.id === connId)?.name}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-foreground-muted">
                                  No outbound connections
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="pt-4 border-t border-border">
                            <p className="text-sm text-foreground-muted mb-2">
                              Recent Activity
                            </p>
                            <div className="space-y-2">
                              {[
                                'Processed market data',
                                'Updated strategy params',
                                'Risk check passed',
                              ].map((activity, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                                  <span className="text-foreground-secondary">
                                    {activity}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-foreground-muted">
                    Click on an agent node to view its details, connections, and
                    recent activity.
                  </p>
                )}
              </Card>

              {/* Data Flows List */}
              <Card variant="feature" className="p-6">
                <h3 className="font-semibold text-foreground mb-4">Active Data Flows</h3>
                <div className="space-y-2">
                  {dataFlows
                    .filter((flow) => activeFlows.has(`${flow.from}-${flow.to}`))
                    .map((flow, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-ton-blue/10 border border-ton-blue/20"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-ton-blue capitalize">
                            {flow.from}
                          </span>
                          <ArrowRightIcon size={14} className="text-ton-blue" />
                          <span className="text-sm font-medium text-ton-blue capitalize">
                            {flow.to}
                          </span>
                        </div>
                        <span className="text-xs text-foreground-muted">{flow.label}</span>
                      </div>
                    ))}
                  {activeFlows.size === 0 && (
                    <p className="text-sm text-foreground-muted text-center py-4">
                      Click &quot;Animate&quot; to see data flows
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
