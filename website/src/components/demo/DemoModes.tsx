'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  ArrowRightIcon,
  CheckIcon,
  RobotIcon,
  ChartIcon,
  WalletIcon,
  GearIcon,
  ShieldIcon,
} from '@/components/icons';

// Demo step types
interface DemoStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

const guidedSteps: DemoStep[] = [
  {
    id: 'create',
    title: 'Create Agent',
    description: 'Configure your AI agent parameters',
    completed: false,
  },
  {
    id: 'fund',
    title: 'Add Funds',
    description: 'Simulate wallet funding (test TON)',
    completed: false,
  },
  {
    id: 'strategy',
    title: 'Select Strategy',
    description: 'Choose from DCA, Grid, or Custom',
    completed: false,
  },
  {
    id: 'deploy',
    title: 'Deploy',
    description: 'Launch your autonomous agent',
    completed: false,
  },
  {
    id: 'monitor',
    title: 'Monitor',
    description: 'Watch real-time performance',
    completed: false,
  },
  {
    id: 'optimize',
    title: 'Optimize',
    description: 'AI-powered recommendations',
    completed: false,
  },
];

const strategies = [
  {
    id: 'dca',
    name: 'Dollar Cost Averaging',
    description: 'Automated periodic purchases to average entry price',
    risk: 'Low',
    expectedApy: '8-15%',
    icon: <WalletIcon size={24} />,
  },
  {
    id: 'grid',
    name: 'Grid Trading',
    description: 'Buy low, sell high within defined price ranges',
    risk: 'Medium',
    expectedApy: '15-35%',
    icon: <ChartIcon size={24} />,
  },
  {
    id: 'momentum',
    name: 'Momentum Trading',
    description: 'AI-driven trend following with adaptive signals',
    risk: 'High',
    expectedApy: '25-60%',
    icon: <LightningIcon size={24} />,
  },
  {
    id: 'yield',
    name: 'Yield Optimizer',
    description: 'Auto-compound across DeFi protocols',
    risk: 'Low-Medium',
    expectedApy: '12-25%',
    icon: <GearIcon size={24} />,
  },
];

function LightningIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DemoModes() {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(guidedSteps);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [agentConfig, setAgentConfig] = useState({
    name: 'My First Agent',
    initialFunds: 1000,
    riskLevel: 'moderate',
  });

  const handleNextStep = () => {
    const newSteps = [...steps];
    newSteps[currentStep].completed = true;
    setSteps(newSteps);

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'create':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={agentConfig.name}
                onChange={(e) => setAgentConfig({ ...agentConfig, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-ton-blue focus:ring-2 focus:ring-ton-blue/20 outline-none transition-all"
                placeholder="Enter agent name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Risk Tolerance
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['conservative', 'moderate', 'aggressive'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setAgentConfig({ ...agentConfig, riskLevel: level })}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium capitalize transition-all ${
                      agentConfig.riskLevel === level
                        ? 'border-ton-blue bg-ton-blue/10 text-ton-blue'
                        : 'border-border bg-background-secondary text-foreground-secondary hover:border-ton-blue/50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'fund':
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-ton-blue/10 to-vibrant-cyan/10 border border-ton-blue/20">
              <div className="flex items-center justify-between mb-4">
                <span className="text-foreground-muted">Test Wallet Balance</span>
                <Badge variant="success">Simulated</Badge>
              </div>
              <div className="text-4xl font-bold text-foreground mb-2">
                {agentConfig.initialFunds.toLocaleString()} TON
              </div>
              <p className="text-sm text-foreground-muted">
                This is simulated test TON for the demo
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Initial Investment
              </label>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={agentConfig.initialFunds}
                onChange={(e) =>
                  setAgentConfig({ ...agentConfig, initialFunds: parseInt(e.target.value) })
                }
                className="w-full accent-ton-blue"
              />
              <div className="flex justify-between text-sm text-foreground-muted mt-2">
                <span>100 TON</span>
                <span>10,000 TON</span>
              </div>
            </div>
          </div>
        );

      case 'strategy':
        return (
          <div className="space-y-4">
            <p className="text-foreground-muted text-sm mb-4">
              Select a strategy that matches your risk tolerance
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategies.map((strategy) => (
                <button
                  key={strategy.id}
                  onClick={() => setSelectedStrategy(strategy.id)}
                  className={`text-left p-5 rounded-2xl border transition-all ${
                    selectedStrategy === strategy.id
                      ? 'border-ton-blue bg-ton-blue/10 shadow-lg'
                      : 'border-border bg-background-secondary hover:border-ton-blue/50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                      selectedStrategy === strategy.id
                        ? 'bg-ton-blue text-white'
                        : 'bg-ton-blue/10 text-ton-blue'
                    }`}
                  >
                    {strategy.icon}
                  </div>
                  <h4 className="font-semibold text-foreground mb-1">{strategy.name}</h4>
                  <p className="text-sm text-foreground-muted mb-3">{strategy.description}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span
                      className={`px-2 py-1 rounded-full ${
                        strategy.risk === 'Low'
                          ? 'bg-success/10 text-success'
                          : strategy.risk === 'Medium'
                            ? 'bg-warning/10 text-warning'
                            : strategy.risk === 'High'
                              ? 'bg-error/10 text-error'
                              : 'bg-accent-purple/10 text-accent-purple'
                      }`}
                    >
                      {strategy.risk} Risk
                    </span>
                    <span className="text-foreground-secondary">APY: {strategy.expectedApy}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'deploy':
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-background-secondary border border-border">
              <h4 className="font-semibold text-foreground mb-4">Agent Configuration Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Name</span>
                  <span className="text-foreground font-medium">{agentConfig.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Initial Funds</span>
                  <span className="text-foreground font-medium">
                    {agentConfig.initialFunds.toLocaleString()} TON
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Risk Level</span>
                  <span className="text-foreground font-medium capitalize">
                    {agentConfig.riskLevel}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground-muted">Strategy</span>
                  <span className="text-foreground font-medium">
                    {strategies.find((s) => s.id === selectedStrategy)?.name || 'Not selected'}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-success/10 border border-success/20">
              <div className="flex items-start gap-3">
                <ShieldIcon size={20} className="text-success mt-0.5" />
                <div>
                  <p className="text-success font-medium text-sm">Non-Custodial Deployment</p>
                  <p className="text-success/80 text-xs mt-1">
                    Your funds never leave your control. Smart contracts ensure full transparency.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'monitor':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Value', value: '1,047.32 TON', change: '+4.73%' },
                { label: 'Active Trades', value: '3', change: null },
                { label: '24h P&L', value: '+12.45 TON', change: '+1.19%' },
                { label: 'Win Rate', value: '67%', change: '+2%' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-4 rounded-xl bg-background-secondary border border-border"
                >
                  <p className="text-sm text-foreground-muted mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  {stat.change && (
                    <p className="text-sm text-success mt-1">{stat.change}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="p-6 rounded-2xl bg-background-secondary border border-border">
              <h4 className="font-semibold text-foreground mb-4">Performance Chart</h4>
              <div className="h-48 flex items-end justify-between gap-1">
                {[65, 72, 68, 85, 78, 92, 88, 95, 91, 98, 94, 100].map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-ton-blue to-vibrant-cyan rounded-t"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-foreground-muted mt-2">
                <span>12h ago</span>
                <span>Now</span>
              </div>
            </div>
          </div>
        );

      case 'optimize':
        return (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-accent-purple/10 to-ton-blue/10 border border-accent-purple/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center">
                  <RobotIcon size={20} className="text-accent-purple" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">AI Optimization Ready</p>
                  <p className="text-sm text-foreground-muted">Based on market conditions</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">
                      Rebalance Portfolio
                    </span>
                    <Badge variant="primary">Recommended</Badge>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    Shift 15% to stablecoin pairs based on volatility forecast
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">
                      Adjust Grid Spacing
                    </span>
                    <Badge variant="default">Optional</Badge>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    Tighten grid by 5% during high-liquidity hours
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">
                      Enable Stop-Loss
                    </span>
                    <Badge variant="warning">Risk Alert</Badge>
                  </div>
                  <p className="text-xs text-foreground-muted">
                    Market indicators suggest adding 8% trailing stop
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section id="demo-modes" className="py-20 bg-background-secondary">
      <div className="container">
        <div className="max-w-5xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              Guided Demo
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Create Your First AI Agent
            </h2>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
              Follow our interactive walkthrough to experience the complete agent lifecycle
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => setCurrentStep(index)}
                    className={`relative flex flex-col items-center ${
                      index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    }`}
                    disabled={index > currentStep}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        step.completed
                          ? 'bg-success text-white'
                          : index === currentStep
                            ? 'bg-ton-blue text-white'
                            : 'bg-background-tertiary text-foreground-muted'
                      }`}
                    >
                      {step.completed ? <CheckIcon size={20} /> : index + 1}
                    </div>
                    <span
                      className={`text-xs mt-2 hidden sm:block ${
                        index === currentStep
                          ? 'text-ton-blue font-medium'
                          : 'text-foreground-muted'
                      }`}
                    >
                      {step.title}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-8 sm:w-16 md:w-24 h-1 mx-2 rounded-full ${
                        step.completed ? 'bg-success' : 'bg-background-tertiary'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <Card variant="feature" className="p-6 md:p-8">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {steps[currentStep].title}
              </h3>
              <p className="text-foreground-muted">{steps[currentStep].description}</p>
            </div>

            {renderStepContent()}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
              <Button
                variant="ghost"
                onClick={handlePrevStep}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              <div className="text-sm text-foreground-muted">
                Step {currentStep + 1} of {steps.length}
              </div>
              <Button onClick={handleNextStep}>
                {currentStep === steps.length - 1 ? 'Complete Demo' : 'Next Step'}
                <ArrowRightIcon size={16} />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
