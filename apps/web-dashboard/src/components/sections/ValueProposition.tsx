'use client';

import { FeatureCard } from '@/components/ui/Card';
import {
  ClockIcon,
  BrainIcon,
  ShieldIcon,
  MarketplaceIcon,
  TelegramIcon,
  CopyIcon,
} from '@/components/icons';

const features = [
  {
    icon: <ClockIcon size={24} />,
    title: '24/7 Automation',
    description:
      'Agents never sleep. Execute strategies around the clock without manual intervention. Capture opportunities across all time zones.',
  },
  {
    icon: <BrainIcon size={24} />,
    title: 'Multi-AI Intelligence',
    description:
      'Powered by Groq, Claude, GPT-4, and Gemini with smart routing and automatic failover. Always the best model for each task.',
  },
  {
    icon: <ShieldIcon size={24} />,
    title: 'Institutional Security',
    description:
      'MPC wallets, HSM integration, 8-layer authorization pipeline, and emergency controls. Your assets stay under your control.',
  },
  {
    icon: <MarketplaceIcon size={24} />,
    title: 'Strategy Marketplace',
    description:
      'Discover and copy proven strategies from top performers. One-click deployment with transparent track records.',
  },
  {
    icon: <TelegramIcon size={24} />,
    title: 'Telegram Native',
    description:
      'Manage your agents directly from Telegram. Mini App integration for a seamless mobile-first experience.',
  },
  {
    icon: <CopyIcon size={24} />,
    title: 'Copy & Earn',
    description:
      'Copy top-performing strategies or monetize your own. Earn fees when others copy your successful strategies.',
  },
];

export function ValueProposition() {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Why TON AI Agent?
          </h2>
          <p className="text-lg text-foreground-secondary">
            The most comprehensive platform for autonomous AI agents in DeFi.
            Built for retail traders, developers, and institutions.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
