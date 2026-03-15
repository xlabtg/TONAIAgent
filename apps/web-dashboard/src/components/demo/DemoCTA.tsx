'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  ArrowRightIcon,
  RobotIcon,
  CheckIcon,
  CodeIcon,
  ShieldIcon,
} from '@/components/icons';

const benefits = [
  {
    icon: <RobotIcon size={24} />,
    title: 'Deploy Real Agents',
    description: 'Move from simulation to production with one click',
  },
  {
    icon: <ShieldIcon size={24} />,
    title: 'Non-Custodial',
    description: 'Your keys, your crypto — always in your control',
  },
  {
    icon: <CodeIcon size={24} />,
    title: 'Full SDK Access',
    description: 'Build custom integrations with our developer tools',
  },
];

const conversionTiers = [
  {
    name: 'Starter',
    price: 'Free',
    features: ['1 Active Agent', 'Basic Strategies', 'Community Support', '100 TON limit'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29/mo',
    features: [
      '5 Active Agents',
      'Advanced Strategies',
      'Priority Support',
      '10,000 TON limit',
      'API Access',
    ],
    cta: 'Start Pro Trial',
    highlighted: true,
  },
  {
    name: 'Institutional',
    price: 'Custom',
    features: [
      'Unlimited Agents',
      'Custom Strategies',
      'Dedicated Support',
      'No limits',
      'Full API + SDK',
      'Compliance Tools',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export function DemoCTA() {
  return (
    <section className="py-20 bg-gradient-to-b from-background-secondary to-background">
      <div className="container">
        <div className="max-w-5xl mx-auto">
          {/* Main CTA */}
          <div className="text-center mb-16">
            <Badge variant="success" className="mb-4">
              Demo Complete
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Deploy Real AI Agents?
            </h2>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto mb-8">
              You&apos;ve experienced the power of AI-native autonomous finance.
              Now create your production account and start managing real assets.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button size="xl" asChild>
                <Link href="https://t.me/tonaiagent_bot" target="_blank" rel="noopener noreferrer">
                  Create Real Agent
                  <ArrowRightIcon size={20} />
                </Link>
              </Button>
              <Button size="xl" variant="outline" asChild>
                <Link href="/developers">
                  <CodeIcon size={20} />
                  Developer Docs
                </Link>
              </Button>
            </div>

            {/* Trust Signals */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-foreground-muted">
              <span className="flex items-center gap-2">
                <CheckIcon size={16} className="text-success" />
                2-minute setup
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon size={16} className="text-success" />
                Non-custodial
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon size={16} className="text-success" />
                Start with $0
              </span>
              <span className="flex items-center gap-2">
                <CheckIcon size={16} className="text-success" />
                Cancel anytime
              </span>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {benefits.map((benefit) => (
              <Card key={benefit.title} variant="feature" className="p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-ton-blue/10 text-ton-blue flex items-center justify-center mx-auto mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-foreground-muted">{benefit.description}</p>
              </Card>
            ))}
          </div>

          {/* Pricing Tiers */}
          <div className="grid md:grid-cols-3 gap-6">
            {conversionTiers.map((tier) => (
              <Card
                key={tier.name}
                variant={tier.highlighted ? 'gradient' : 'feature'}
                className={`p-6 relative ${
                  tier.highlighted
                    ? 'border-ton-blue ring-2 ring-ton-blue/20'
                    : ''
                }`}
              >
                {tier.highlighted && (
                  <Badge
                    variant="primary"
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                  >
                    Most Popular
                  </Badge>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-3xl font-bold text-foreground">{tier.price}</p>
                  {tier.price !== 'Free' && tier.price !== 'Custom' && (
                    <p className="text-sm text-foreground-muted">billed monthly</p>
                  )}
                </div>

                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckIcon size={16} className="text-success flex-shrink-0" />
                      <span className="text-foreground-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={tier.highlighted ? 'primary' : 'outline'}
                  asChild
                >
                  <Link href={tier.name === 'Institutional' ? '/institutional' : 'https://t.me/tonaiagent_bot'}>
                    {tier.cta}
                  </Link>
                </Button>
              </Card>
            ))}
          </div>

          {/* Investor Section */}
          <Card variant="feature" className="mt-16 p-8 md:p-12 text-center">
            <Badge variant="secondary" className="mb-4">
              For Investors
            </Badge>
            <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Interested in TON AI Agent?
            </h3>
            <p className="text-foreground-secondary max-w-2xl mx-auto mb-6">
              We&apos;re building the future of AI-native autonomous finance on TON.
              Contact us to learn about investment opportunities and partnerships.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="outline" asChild>
                <Link href="/token">
                  TONAI Token
                  <ArrowRightIcon size={16} />
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="mailto:invest@tonaiagent.com">
                  Contact Investor Relations
                </Link>
              </Button>
            </div>
          </Card>

          {/* Developer Call-out */}
          <div className="mt-12 text-center">
            <p className="text-foreground-muted mb-4">
              Are you a developer? Build your own AI-powered applications.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/developers/quickstart"
                className="text-ton-blue hover:underline flex items-center gap-1"
              >
                Quick Start Guide
                <ArrowRightIcon size={14} />
              </Link>
              <Link
                href="/developers/sdk"
                className="text-ton-blue hover:underline flex items-center gap-1"
              >
                SDK Documentation
                <ArrowRightIcon size={14} />
              </Link>
              <Link
                href="https://github.com/xlabtg/TONAIAgent"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ton-blue hover:underline flex items-center gap-1"
              >
                GitHub Repository
                <ArrowRightIcon size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
