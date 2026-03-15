'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArrowRightIcon, AgentIcon, BrainIcon, StrategyIcon, ShieldIcon } from '@/components/icons';

const agentTypes = [
  {
    icon: <StrategyIcon size={24} />,
    name: 'Strategist Agent',
    description: 'Analyzes markets and generates trading signals',
    color: 'bg-ton-blue',
  },
  {
    icon: <BrainIcon size={24} />,
    name: 'Coordinator Agent',
    description: 'Orchestrates multiple agents and optimizes allocation',
    color: 'bg-accent-purple',
  },
  {
    icon: <AgentIcon size={24} />,
    name: 'Executor Agent',
    description: 'Executes trades with optimal timing and routing',
    color: 'bg-vibrant-cyan',
  },
  {
    icon: <ShieldIcon size={24} />,
    name: 'Risk Agent',
    description: 'Monitors positions and enforces risk limits',
    color: 'bg-success',
  },
];

export function MultiAgent() {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <div>
            <Badge variant="primary" className="mb-4">Coming Soon</Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              The Future: Autonomous Agent Economy
            </h2>
            <p className="text-lg text-foreground-secondary mb-8">
              Coordinate specialized agents that work together to optimize your portfolio
              across strategies, risk management, and execution. The next evolution of
              autonomous finance.
            </p>

            <div className="space-y-4 mb-8">
              {[
                'Swarm intelligence for collective optimization',
                'Specialized agents for different market conditions',
                'Automatic task delegation and coordination',
                'Cross-strategy risk management',
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-ton-blue/10 flex items-center justify-center">
                    <svg className="w-3 h-3 text-ton-blue" viewBox="0 0 12 12" fill="none">
                      <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="text-foreground-secondary">{item}</span>
                </div>
              ))}
            </div>

            <Button size="lg" variant="outline" asChild>
              <Link href="/product/multi-agent">
                Explore Multi-Agent
                <ArrowRightIcon size={20} />
              </Link>
            </Button>
          </div>

          {/* Visual */}
          <div className="relative">
            {/* Agent Cards */}
            <div className="grid grid-cols-2 gap-4">
              {agentTypes.map((agent, index) => (
                <Card
                  key={agent.name}
                  variant="feature"
                  padding="md"
                  hover
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`${agent.color} w-10 h-10 rounded-lg flex items-center justify-center text-white mb-3`}>
                    {agent.icon}
                  </div>
                  <h4 className="font-semibold text-foreground mb-1 text-sm">
                    {agent.name}
                  </h4>
                  <p className="text-foreground-muted text-xs">
                    {agent.description}
                  </p>
                </Card>
              ))}
            </div>

            {/* Connection Lines */}
            <div className="absolute inset-0 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 400 300" fill="none">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--ton-blue)" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="var(--vibrant-cyan)" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="var(--ton-blue)" stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <path
                  d="M100 75 L200 150 L100 225"
                  stroke="url(#lineGradient)"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  fill="none"
                />
                <path
                  d="M300 75 L200 150 L300 225"
                  stroke="url(#lineGradient)"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                  fill="none"
                />
              </svg>
            </div>

            {/* Central Coordinator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ton-blue to-vibrant-cyan flex items-center justify-center text-white shadow-xl animate-pulse-glow">
                <AgentIcon size={32} />
              </div>
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-sm font-medium text-foreground">
                Your Portfolio
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
