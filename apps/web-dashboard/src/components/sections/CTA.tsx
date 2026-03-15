'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowRightIcon, CheckIcon, ShieldIcon, ClockIcon, LightningIcon } from '@/components/icons';

const benefits = [
  { icon: <ShieldIcon size={16} />, text: 'No code required' },
  { icon: <ClockIcon size={16} />, text: 'Non-custodial' },
  { icon: <LightningIcon size={16} />, text: 'Start in 2 minutes' },
];

export function CTA() {
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-ton-blue via-ton-blue-dark to-deep-navy text-white overflow-hidden">
      <div className="container relative">
        {/* Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-vibrant-cyan/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-purple/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Ready to Deploy Your First AI Agent?
          </h2>
          <p className="text-lg md:text-xl text-white/80 mb-8">
            Join 10,000+ users automating their finances on TON.
            Start with zero upfront cost and scale as you grow.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button
              size="xl"
              className="bg-white text-ton-blue hover:bg-white/90"
              asChild
            >
              <Link href="https://t.me/tonaiagent_bot" target="_blank" rel="noopener noreferrer">
                Launch Agent
                <ArrowRightIcon size={20} />
              </Link>
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              asChild
            >
              <Link href="/institutional">
                Talk to Sales
              </Link>
            </Button>
          </div>

          {/* Benefits */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/70">
            {benefits.map((benefit) => (
              <span key={benefit.text} className="flex items-center gap-2">
                <span className="text-vibrant-cyan">{benefit.icon}</span>
                {benefit.text}
              </span>
            ))}
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-10 left-10 w-20 h-20 border border-white/10 rounded-2xl rotate-12 animate-float" />
        <div className="absolute bottom-10 right-10 w-16 h-16 border border-white/10 rounded-xl -rotate-12 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-20 w-12 h-12 bg-white/5 rounded-lg rotate-45 animate-float" style={{ animationDelay: '2s' }} />
      </div>
    </section>
  );
}
