'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowRightIcon,
  PlayIcon,
  RobotIcon,
  ChartIcon,
  ShieldIcon,
  LightningIcon,
} from '@/components/icons';

const demoScenarios = [
  {
    id: 'retail',
    icon: <RobotIcon size={24} />,
    title: 'Retail User',
    description: 'Create your first AI agent with DCA strategy',
    duration: '5 min',
    difficulty: 'Beginner',
  },
  {
    id: 'trader',
    icon: <ChartIcon size={24} />,
    title: 'Active Trader',
    description: 'Multi-strategy portfolio with risk management',
    duration: '10 min',
    difficulty: 'Intermediate',
  },
  {
    id: 'institution',
    icon: <ShieldIcon size={24} />,
    title: 'Institutional',
    description: 'Compliance-ready treasury management',
    duration: '15 min',
    difficulty: 'Advanced',
  },
  {
    id: 'dao',
    icon: <LightningIcon size={24} />,
    title: 'DAO Treasury',
    description: 'Multi-sig governance with AI optimization',
    duration: '12 min',
    difficulty: 'Advanced',
  },
];

export function DemoHero() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-24">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,136,204,0.2)_0%,transparent_60%)]" />

      {/* Animated Grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(var(--ton-blue) 1px, transparent 1px), linear-gradient(90deg, var(--ton-blue) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Floating Elements */}
      <div className="absolute top-1/3 left-5 w-64 h-64 bg-ton-blue/15 rounded-full blur-3xl animate-float" />
      <div
        className="absolute bottom-1/3 right-5 w-80 h-80 bg-vibrant-cyan/15 rounded-full blur-3xl animate-float"
        style={{ animationDelay: '1.5s' }}
      />

      <div className="container relative z-10 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="primary" size="lg" className="mb-6 animate-fade-down">
              Interactive Demo — No Signup Required
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 animate-fade-up">
              <span className="text-foreground">Experience AI-Native</span>
              <br />
              <span className="gradient-text">Autonomous Finance</span>
            </h1>
            <p className="text-lg sm:text-xl text-foreground-secondary max-w-2xl mx-auto animate-fade-up stagger-2">
              Explore the full power of TON AI Agent. Create agents, simulate trading,
              generate UI concepts, and visualize multi-agent coordination — all in your browser.
            </p>
          </div>

          {/* Scenario Selection */}
          <div className="mb-8 animate-fade-up stagger-3">
            <p className="text-center text-foreground-muted text-sm mb-4">
              Choose your experience
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {demoScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => setSelectedScenario(scenario.id)}
                  className={`group text-left p-5 rounded-2xl border transition-all duration-300 ${
                    selectedScenario === scenario.id
                      ? 'border-ton-blue bg-ton-blue/10 shadow-lg shadow-ton-blue/10'
                      : 'border-border bg-background-secondary hover:border-ton-blue/50 hover:bg-background-tertiary'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                      selectedScenario === scenario.id
                        ? 'bg-ton-blue text-white'
                        : 'bg-ton-blue/10 text-ton-blue group-hover:bg-ton-blue/20'
                    }`}
                  >
                    {scenario.icon}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{scenario.title}</h3>
                  <p className="text-sm text-foreground-muted mb-3">{scenario.description}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-foreground-muted">{scenario.duration}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        scenario.difficulty === 'Beginner'
                          ? 'bg-success/10 text-success'
                          : scenario.difficulty === 'Intermediate'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-accent-purple/10 text-accent-purple'
                      }`}
                    >
                      {scenario.difficulty}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Demo CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up stagger-4">
            <Button
              size="xl"
              onClick={() => {
                const section = document.getElementById('demo-modes');
                section?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {selectedScenario ? 'Start Selected Demo' : 'Start Guided Demo'}
              <PlayIcon size={20} />
            </Button>
            <Button size="xl" variant="outline" asChild>
              <Link href="#ai-generator">
                Try AI Generator
                <ArrowRightIcon size={20} />
              </Link>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-up stagger-5">
            {[
              { value: '2 min', label: 'To First Agent' },
              { value: '15+', label: 'Strategy Templates' },
              { value: 'Real-time', label: 'Market Simulation' },
              { value: '100%', label: 'Non-Custodial' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-foreground-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
