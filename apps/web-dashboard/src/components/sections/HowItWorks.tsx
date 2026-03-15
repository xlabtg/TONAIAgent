'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { WalletIcon, TokenIcon, StrategyIcon, LightningIcon, ArrowRightIcon } from '@/components/icons';

const steps = [
  {
    number: 1,
    icon: <WalletIcon size={28} />,
    title: 'Connect Wallet',
    description:
      'Link TON Connect or create an MPC wallet. Secure, non-custodial, and instant setup.',
  },
  {
    number: 2,
    icon: <TokenIcon size={28} />,
    title: 'Fund Your Agent',
    description:
      'Deposit TON or stablecoins to fund your agent operations. Withdraw anytime.',
  },
  {
    number: 3,
    icon: <StrategyIcon size={28} />,
    title: 'Choose Strategy',
    description:
      'Select from the marketplace or build custom strategies with AI assistance.',
  },
  {
    number: 4,
    icon: <LightningIcon size={28} />,
    title: 'Go Live 24/7',
    description:
      'Your agent executes automatically with full monitoring and risk controls.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 md:py-32 bg-background-secondary">
      <div className="container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Launch Your First Agent in Minutes
          </h2>
          <p className="text-lg text-foreground-secondary">
            From zero to autonomous trading in four simple steps. No coding required.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Step Card */}
                <div className="bg-background rounded-2xl border border-border p-6 h-full hover:shadow-lg hover:border-ton-blue/30 transition-all duration-300">
                  {/* Step Number */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-ton-blue/10 text-ton-blue">
                      {step.icon}
                    </div>
                    <span className="text-6xl font-bold text-foreground/5">
                      {step.number}
                    </span>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-foreground-secondary">
                    {step.description}
                  </p>
                </div>

                {/* Arrow (visible on lg screens between cards) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-4 z-10 w-8 h-8 bg-background rounded-full border border-border items-center justify-center -translate-y-1/2">
                    <ArrowRightIcon size={16} className="text-foreground-muted" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button size="lg" asChild>
            <Link href="https://t.me/tonaiagent_bot" target="_blank" rel="noopener noreferrer">
              Start Now - It&apos;s Free
              <ArrowRightIcon size={20} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
