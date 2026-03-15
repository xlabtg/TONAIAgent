'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowRightIcon, PlayIcon, CheckIcon } from '@/components/icons';

const stats = [
  { value: '10,000+', label: 'Active Users' },
  { value: '$50M+', label: 'Assets Managed' },
  { value: '1,000+', label: 'Strategies Deployed' },
  { value: '99.9%', label: 'Uptime' },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,136,204,0.15)_0%,transparent_50%)]" />

      {/* Animated Grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--ton-blue) 1px, transparent 1px), linear-gradient(90deg, var(--ton-blue) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Floating Elements */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-ton-blue/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-vibrant-cyan/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

      <div className="container relative z-10 pt-32 pb-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="mb-6 animate-fade-down">
            <Badge variant="primary" size="lg">
              Powered by TON Blockchain
            </Badge>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-up">
            <span className="text-foreground">Autonomous AI Agents</span>
            <br />
            <span className="gradient-text">for Finance on TON</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-foreground-secondary max-w-2xl mx-auto mb-8 animate-fade-up stagger-2">
            Deploy intelligent agents that trade, manage portfolios, and optimize yields 24/7
            on The Open Network. Non-custodial, AI-powered, institutional-grade security.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-up stagger-3">
            <Button size="xl" asChild>
              <Link href="https://t.me/tonaiagent_bot" target="_blank" rel="noopener noreferrer">
                Launch Agent
                <ArrowRightIcon size={20} />
              </Link>
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href="/developers/quickstart">
                Start Building
              </Link>
            </Button>
            <Button size="xl" variant="ghost" className="group">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-ton-blue/10 group-hover:bg-ton-blue/20 transition-colors">
                <PlayIcon size={16} className="text-ton-blue ml-0.5" />
              </span>
              Watch Demo
            </Button>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-foreground-muted animate-fade-up stagger-4">
            <span className="flex items-center gap-2">
              <CheckIcon size={16} className="text-success" />
              No code required
            </span>
            <span className="flex items-center gap-2">
              <CheckIcon size={16} className="text-success" />
              Non-custodial
            </span>
            <span className="flex items-center gap-2">
              <CheckIcon size={16} className="text-success" />
              Start in 2 minutes
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 animate-fade-up stagger-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-foreground-muted">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual/Demo Preview */}
        <div className="mt-20 relative animate-fade-up stagger-6">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
          <div className="relative bg-background-secondary rounded-2xl border border-border overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-background-tertiary border-b border-border">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-error" />
                <span className="w-3 h-3 rounded-full bg-warning" />
                <span className="w-3 h-3 rounded-full bg-success" />
              </div>
              <div className="flex-1 flex justify-center">
                <span className="text-xs text-foreground-muted bg-background rounded px-3 py-1">
                  agent.tonaiagent.com
                </span>
              </div>
            </div>
            <div className="p-8 md:p-12 min-h-[300px] flex items-center justify-center">
              <div className="text-center text-foreground-muted">
                <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-ton-blue to-vibrant-cyan flex items-center justify-center">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="6" width="16" height="12" rx="2" stroke="white" strokeWidth="2" />
                    <circle cx="9" cy="11" r="1.5" fill="white" />
                    <circle cx="15" cy="11" r="1.5" fill="white" />
                    <path d="M10 14H14" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-foreground">Your AI Agent Dashboard</p>
                <p className="text-sm mt-2">Monitor, configure, and optimize your agents</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
