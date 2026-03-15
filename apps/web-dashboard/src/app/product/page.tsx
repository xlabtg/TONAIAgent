import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  AgentIcon,
  StrategyIcon,
  MarketplaceIcon,
  ShieldIcon,
  BrainIcon,
  UsersIcon,
  ArrowRightIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'Product',
  description:
    'Discover the complete TON AI Agent platform. Autonomous agents, strategy engine, marketplace, security, and AI infrastructure.',
};

const products = [
  {
    icon: <AgentIcon size={32} />,
    title: 'Autonomous Agents',
    description:
      'Deploy intelligent agents that execute strategies 24/7. Trading, portfolio management, yield optimization, and more.',
    href: '/product/agents',
    features: ['24/7 Execution', 'Risk Controls', 'Monitoring'],
    color: 'bg-ton-blue',
  },
  {
    icon: <StrategyIcon size={32} />,
    title: 'Strategy Engine',
    description:
      'Build strategies with our powerful DSL or natural language. AI-assisted generation, backtesting, and optimization.',
    href: '/product/strategy-engine',
    features: ['Strategy DSL', 'AI Generation', 'Backtesting'],
    color: 'bg-accent-purple',
  },
  {
    icon: <MarketplaceIcon size={32} />,
    title: 'Marketplace',
    description:
      'Discover, copy, and monetize strategies. Transparent track records, one-click deployment, creator economy.',
    href: '/product/marketplace',
    features: ['Copy Trading', 'Analytics', 'Monetization'],
    color: 'bg-vibrant-cyan',
  },
  {
    icon: <ShieldIcon size={32} />,
    title: 'Security',
    description:
      'Institutional-grade security infrastructure. MPC wallets, HSM integration, 8-layer authorization pipeline.',
    href: '/product/security',
    features: ['MPC Wallets', 'HSM', 'Emergency Controls'],
    color: 'bg-success',
  },
  {
    icon: <BrainIcon size={32} />,
    title: 'AI Layer',
    description:
      'Multi-provider AI with intelligent routing. Groq, Claude, GPT-4, Gemini with automatic failover.',
    href: '/product/ai-layer',
    features: ['Multi-Provider', 'Failover', 'Safety'],
    color: 'bg-warning',
  },
  {
    icon: <UsersIcon size={32} />,
    title: 'Multi-Agent',
    description:
      'Coordinate specialized agents that work together. Swarm intelligence for collective portfolio optimization.',
    href: '/product/multi-agent',
    features: ['Coordination', 'Swarm AI', 'Optimization'],
    badge: 'Coming Soon',
    color: 'bg-error',
  },
];

export default function ProductPage() {
  return (
    <div className="pt-24 pb-20">
      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="primary" className="mb-4">
            Platform
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            The Complete Platform for{' '}
            <span className="gradient-text">Autonomous Finance</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground-secondary mb-8">
            Everything you need to deploy, manage, and scale AI-powered financial
            agents on The Open Network.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="https://t.me/tonaiagent_bot" target="_blank">
                Launch App
                <ArrowRightIcon size={20} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/developers/quickstart">View Documentation</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="container py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Link key={product.title} href={product.href}>
              <Card
                variant="feature"
                hover
                className="h-full group"
              >
                <div className="flex flex-col h-full">
                  {/* Icon & Badge */}
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className={`${product.color} w-14 h-14 rounded-xl flex items-center justify-center text-white`}
                    >
                      {product.icon}
                    </div>
                    {product.badge && (
                      <Badge variant="secondary" size="sm">
                        {product.badge}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-ton-blue transition-colors">
                    {product.title}
                  </h3>
                  <p className="text-foreground-secondary mb-6 flex-1">
                    {product.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {product.features.map((feature) => (
                      <Badge key={feature} variant="default" size="sm">
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  {/* Link */}
                  <div className="flex items-center text-ton-blue text-sm font-medium group-hover:gap-2 transition-all">
                    Learn more
                    <ArrowRightIcon size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Integration Banner */}
      <section className="container py-16">
        <div className="bg-gradient-to-r from-ton-blue to-vibrant-cyan rounded-3xl p-8 md:p-12 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Build on TON AI Agent
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8">
            Integrate autonomous agents into your application with our comprehensive
            SDK and API. Full documentation, examples, and developer support.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-white text-ton-blue hover:bg-white/90"
              asChild
            >
              <Link href="/developers/sdk">View SDK</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              asChild
            >
              <Link href="/developers/api">API Reference</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
