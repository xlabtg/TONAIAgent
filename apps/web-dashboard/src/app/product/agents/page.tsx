import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  AgentIcon,
  ChartIcon,
  ShieldIcon,
  ClockIcon,
  RefreshIcon,
  LightningIcon,
  ArrowRightIcon,
  CheckIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'Autonomous Agents',
  description:
    'Deploy intelligent AI agents that trade, manage portfolios, and optimize yields 24/7 on The Open Network.',
};

const agentTypes = [
  {
    icon: <ChartIcon size={24} />,
    title: 'Trading Agent',
    description:
      'Execute trading strategies automatically based on market conditions, signals, and AI analysis.',
    capabilities: [
      'Limit orders, market orders, DCA',
      'Technical analysis integration',
      'Multi-DEX routing',
      'Slippage protection',
    ],
  },
  {
    icon: <RefreshIcon size={24} />,
    title: 'Portfolio Agent',
    description:
      'Automatically rebalance your portfolio to maintain target allocations across multiple assets.',
    capabilities: [
      'Target allocation maintenance',
      'Drift monitoring',
      'Tax-efficient rebalancing',
      'Cost optimization',
    ],
  },
  {
    icon: <LightningIcon size={24} />,
    title: 'Yield Agent',
    description:
      'Optimize yields across DeFi protocols. Find the best rates and auto-compound rewards.',
    capabilities: [
      'Cross-protocol yield optimization',
      'Auto-compounding',
      'Impermanent loss monitoring',
      'Gas optimization',
    ],
  },
  {
    icon: <AgentIcon size={24} />,
    title: 'Copy Agent',
    description:
      'Automatically copy trades from top performers in the marketplace with configurable risk limits.',
    capabilities: [
      'Real-time trade copying',
      'Position sizing controls',
      'Risk filtering',
      'Performance tracking',
    ],
  },
];

const features = [
  {
    icon: <ClockIcon size={20} />,
    title: '24/7 Operation',
    description: 'Agents never sleep. Execute strategies around the clock without manual intervention.',
  },
  {
    icon: <ShieldIcon size={20} />,
    title: 'Risk Controls',
    description: 'Built-in stop-loss, position limits, and drawdown protection keep your assets safe.',
  },
  {
    icon: <ChartIcon size={20} />,
    title: 'Real-time Monitoring',
    description: 'Full visibility into agent performance, positions, and P&L through Telegram or dashboard.',
  },
  {
    icon: <LightningIcon size={20} />,
    title: 'Instant Notifications',
    description: 'Get alerts for trades, risk events, and performance milestones in real-time.',
  },
];

const useCases = [
  {
    title: 'Dollar-Cost Averaging',
    description: 'Automatically buy assets at regular intervals to reduce timing risk.',
    example: 'Buy $100 of TON every Monday at 9am',
  },
  {
    title: 'Grid Trading',
    description: 'Place buy and sell orders at preset intervals to profit from volatility.',
    example: 'Grid orders between $2.00 - $3.00 with 5% spacing',
  },
  {
    title: 'Yield Farming',
    description: 'Auto-compound LP rewards and rotate to highest-yield pools.',
    example: 'Compound USDT/TON LP rewards daily, rotate if APY drops below 20%',
  },
  {
    title: 'Arbitrage',
    description: 'Capture price differences across DEXes automatically.',
    example: 'Execute when price difference exceeds 0.5% between DEX A and B',
  },
];

export default function AgentsPage() {
  return (
    <div className="pt-24 pb-20">
      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="primary" className="mb-4">
            Autonomous Agents
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            AI Agents That Trade{' '}
            <span className="gradient-text">While You Sleep</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground-secondary mb-8">
            Deploy intelligent agents that execute your strategies 24/7. From simple DCA
            to complex multi-step operations, agents handle it all autonomously.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="https://t.me/tonaiagent_bot" target="_blank">
                Create Your First Agent
                <ArrowRightIcon size={20} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/developers/docs">View Documentation</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Agent Types */}
      <section className="container py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Agent Types
          </h2>
          <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
            Choose from specialized agent types or combine them for sophisticated operations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {agentTypes.map((agent) => (
            <Card key={agent.title} variant="feature" hover>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-ton-blue/10 text-ton-blue flex items-center justify-center flex-shrink-0">
                  {agent.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {agent.title}
                  </h3>
                  <p className="text-foreground-secondary mb-4">
                    {agent.description}
                  </p>
                  <ul className="space-y-2">
                    {agent.capabilities.map((capability) => (
                      <li
                        key={capability}
                        className="flex items-center gap-2 text-sm text-foreground-muted"
                      >
                        <CheckIcon size={16} className="text-success" />
                        {capability}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 bg-background-secondary rounded-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for Reliability
          </h2>
          <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
            Enterprise-grade infrastructure ensures your agents operate flawlessly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-ton-blue/10 text-ton-blue flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-foreground-secondary">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="container py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Use Cases
          </h2>
          <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
            From simple automation to complex strategies, agents handle it all.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {useCases.map((useCase) => (
            <Card key={useCase.title} variant="default" padding="lg">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {useCase.title}
              </h3>
              <p className="text-foreground-secondary mb-4">
                {useCase.description}
              </p>
              <div className="p-3 bg-background-secondary rounded-lg">
                <code className="text-sm text-ton-blue">{useCase.example}</code>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16">
        <div className="bg-gradient-to-r from-ton-blue to-vibrant-cyan rounded-3xl p-8 md:p-12 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Deploy Your Agent?
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8">
            Start with our free tier. No credit card required. Deploy your first agent in minutes.
          </p>
          <Button
            size="lg"
            className="bg-white text-ton-blue hover:bg-white/90"
            asChild
          >
            <Link href="https://t.me/tonaiagent_bot" target="_blank">
              Get Started
              <ArrowRightIcon size={20} />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
