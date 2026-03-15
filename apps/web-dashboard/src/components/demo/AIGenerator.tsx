'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { LightningIcon, RobotIcon } from '@/components/icons';

// Pre-defined UI mockup templates
const mockupTemplates = {
  'mobile-portfolio': {
    title: 'Mobile Crypto Portfolio',
    layout: 'mobile',
    components: ['header', 'balance-card', 'asset-list', 'chart', 'nav-bar'],
    colors: ['#0088CC', '#00D4FF', '#1A1A2E'],
  },
  'dashboard-institutional': {
    title: 'Institutional Dashboard',
    layout: 'desktop',
    components: ['sidebar', 'header', 'metrics-grid', 'table', 'charts'],
    colors: ['#1A1A2E', '#0088CC', '#00C853'],
  },
  'telegram-mini-app': {
    title: 'Telegram Mini App',
    layout: 'mobile',
    components: ['tg-header', 'wallet-connect', 'quick-actions', 'recent-activity'],
    colors: ['#0088CC', '#FFFFFF', '#F1F5F9'],
  },
  'trading-interface': {
    title: 'Trading Interface',
    layout: 'desktop',
    components: ['chart', 'orderbook', 'trade-form', 'positions', 'history'],
    colors: ['#0F0F1A', '#00D4FF', '#FF1744'],
  },
};

const examplePrompts = [
  'Design a mobile crypto portfolio manager with dark mode',
  'Create a dashboard for institutional fund management',
  'Build a Telegram Mini App for quick trading',
  'Design a DeFi yield farming interface',
  'Create a multi-agent coordination dashboard',
];

interface GeneratedMockup {
  type: string;
  components: string[];
  description: string;
}

export function AIGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMockup, setGeneratedMockup] = useState<GeneratedMockup | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('groq');
  const [designStyle, setDesignStyle] = useState('modern');

  const providers = [
    { id: 'groq', name: 'Groq', badge: 'Primary', speed: 'Ultra-fast' },
    { id: 'openai', name: 'OpenAI', badge: 'Optional', speed: 'Fast' },
    { id: 'anthropic', name: 'Anthropic', badge: 'Optional', speed: 'Fast' },
    { id: 'google', name: 'Google', badge: 'Optional', speed: 'Fast' },
  ];

  const designStyles = [
    { id: 'modern', name: 'Modern Minimal' },
    { id: 'glassmorphism', name: 'Glassmorphism' },
    { id: 'neumorphism', name: 'Neumorphism' },
    { id: 'brutalist', name: 'Brutalist' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);

    // Simulate AI generation with deterministic mockup selection
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Determine mockup type based on prompt keywords
    let mockupType = 'mobile-portfolio';
    if (prompt.toLowerCase().includes('institutional') || prompt.toLowerCase().includes('dashboard')) {
      mockupType = 'dashboard-institutional';
    } else if (prompt.toLowerCase().includes('telegram')) {
      mockupType = 'telegram-mini-app';
    } else if (prompt.toLowerCase().includes('trading')) {
      mockupType = 'trading-interface';
    }

    const template = mockupTemplates[mockupType as keyof typeof mockupTemplates];

    setGeneratedMockup({
      type: mockupType,
      components: template.components,
      description: `Generated ${template.title} with ${designStyle} design style`,
    });

    setIsGenerating(false);
  };

  const renderMockupPreview = () => {
    if (!generatedMockup) return null;

    const template = mockupTemplates[generatedMockup.type as keyof typeof mockupTemplates];
    const isMobile = template.layout === 'mobile';

    return (
      <div
        className={`relative ${
          isMobile ? 'w-full max-w-[375px]' : 'w-full'
        } mx-auto bg-background-secondary rounded-2xl border border-border overflow-hidden shadow-xl`}
      >
        {/* Browser/Phone Frame */}
        <div className="flex items-center gap-2 px-4 py-3 bg-background-tertiary border-b border-border">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-error" />
            <span className="w-3 h-3 rounded-full bg-warning" />
            <span className="w-3 h-3 rounded-full bg-success" />
          </div>
          <div className="flex-1 flex justify-center">
            <span className="text-xs text-foreground-muted bg-background rounded px-3 py-1">
              {template.title}
            </span>
          </div>
        </div>

        {/* Mockup Content */}
        <div className={`p-4 ${isMobile ? 'min-h-[500px]' : 'min-h-[400px]'}`}>
          {generatedMockup.type === 'mobile-portfolio' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-ton-blue/20" />
                <div className="w-20 h-6 rounded bg-background-tertiary" />
              </div>

              {/* Balance Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-ton-blue to-vibrant-cyan text-white">
                <p className="text-sm opacity-80 mb-1">Total Balance</p>
                <p className="text-3xl font-bold">$12,458.32</p>
                <p className="text-sm mt-2 text-success-light">+5.23% today</p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-4 gap-2">
                {['Send', 'Receive', 'Swap', 'Stake'].map((action) => (
                  <div
                    key={action}
                    className="flex flex-col items-center p-3 rounded-xl bg-background-tertiary"
                  >
                    <div className="w-8 h-8 rounded-full bg-ton-blue/10 mb-2" />
                    <span className="text-xs text-foreground-muted">{action}</span>
                  </div>
                ))}
              </div>

              {/* Asset List */}
              <div className="space-y-3">
                {['TON', 'USDT', 'NOT', 'DOGS'].map((asset, i) => (
                  <div
                    key={asset}
                    className="flex items-center justify-between p-3 rounded-xl bg-background-tertiary"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-ton-blue/20" />
                      <div>
                        <p className="font-medium text-foreground">{asset}</p>
                        <p className="text-xs text-foreground-muted">
                          {(Math.random() * 1000).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">
                        ${(Math.random() * 5000).toFixed(2)}
                      </p>
                      <p
                        className={`text-xs ${i % 2 === 0 ? 'text-success' : 'text-error'}`}
                      >
                        {i % 2 === 0 ? '+' : '-'}
                        {(Math.random() * 10).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {generatedMockup.type === 'dashboard-institutional' && (
            <div className="flex gap-4">
              {/* Sidebar */}
              <div className="w-48 space-y-2 hidden md:block">
                {['Overview', 'Portfolio', 'Analytics', 'Compliance', 'Reports', 'Settings'].map(
                  (item, i) => (
                    <div
                      key={item}
                      className={`p-3 rounded-lg text-sm ${
                        i === 0
                          ? 'bg-ton-blue/10 text-ton-blue font-medium'
                          : 'text-foreground-muted hover:bg-background-tertiary'
                      }`}
                    >
                      {item}
                    </div>
                  )
                )}
              </div>

              {/* Main Content */}
              <div className="flex-1 space-y-4">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'AUM', value: '$50.2M', change: '+12.3%' },
                    { label: 'Active Agents', value: '24', change: '+3' },
                    { label: 'MTD Returns', value: '8.7%', change: '+2.1%' },
                    { label: 'Risk Score', value: 'Low', change: null },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="p-4 rounded-xl bg-background-tertiary"
                    >
                      <p className="text-xs text-foreground-muted mb-1">{metric.label}</p>
                      <p className="text-xl font-bold text-foreground">{metric.value}</p>
                      {metric.change && (
                        <p className="text-xs text-success mt-1">{metric.change}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Chart Placeholder */}
                <div className="p-4 rounded-xl bg-background-tertiary">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-medium text-foreground">Portfolio Performance</p>
                    <div className="flex gap-2">
                      {['1D', '1W', '1M', '1Y'].map((period) => (
                        <button
                          key={period}
                          className="px-2 py-1 text-xs rounded bg-background-secondary text-foreground-muted"
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-32 flex items-end justify-between gap-1">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-ton-blue to-vibrant-cyan rounded-t opacity-80"
                        style={{ height: `${30 + Math.random() * 70}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {generatedMockup.type === 'telegram-mini-app' && (
            <div className="space-y-4">
              {/* TG Header */}
              <div className="flex items-center justify-center py-2">
                <span className="text-sm font-medium text-ton-blue">TON AI Agent</span>
              </div>

              {/* Wallet Connect */}
              <div className="p-4 rounded-2xl bg-ton-blue text-white text-center">
                <p className="text-sm opacity-80 mb-2">Connected Wallet</p>
                <p className="font-mono text-sm">EQBx...7Kg9</p>
                <p className="text-2xl font-bold mt-2">1,245.67 TON</p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                {['New Agent', 'My Agents', 'Marketplace', 'Settings'].map((action) => (
                  <button
                    key={action}
                    className="p-4 rounded-xl bg-background-tertiary text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-ton-blue/10 mx-auto mb-2" />
                    <span className="text-sm font-medium text-foreground">{action}</span>
                  </button>
                ))}
              </div>

              {/* Recent Activity */}
              <div>
                <p className="text-sm font-medium text-foreground mb-3">Recent Activity</p>
                <div className="space-y-2">
                  {['Agent deployed', 'Trade executed', 'Yield claimed'].map((activity, i) => (
                    <div
                      key={activity}
                      className="flex items-center justify-between p-3 rounded-lg bg-background-tertiary"
                    >
                      <span className="text-sm text-foreground">{activity}</span>
                      <span className="text-xs text-foreground-muted">{i + 1}h ago</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {generatedMockup.type === 'trading-interface' && (
            <div className="grid grid-cols-3 gap-4">
              {/* Chart */}
              <div className="col-span-2 p-4 rounded-xl bg-background-tertiary">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">TON/USDT</span>
                    <span className="text-success text-sm">+2.34%</span>
                  </div>
                  <span className="text-xl font-bold text-foreground">$5.847</span>
                </div>
                <div className="h-40 flex items-end justify-between gap-0.5">
                  {Array.from({ length: 40 }).map((_, i) => {
                    const isUp = Math.random() > 0.4;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm ${isUp ? 'bg-success' : 'bg-error'}`}
                        style={{ height: `${20 + Math.random() * 80}%` }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Order Book */}
              <div className="p-4 rounded-xl bg-background-tertiary">
                <p className="text-sm font-medium text-foreground mb-3">Order Book</p>
                <div className="space-y-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={`ask-${i}`} className="flex justify-between text-xs">
                      <span className="text-error">{(5.85 + i * 0.01).toFixed(3)}</span>
                      <span className="text-foreground-muted">
                        {(Math.random() * 1000).toFixed(0)}
                      </span>
                    </div>
                  ))}
                  <div className="py-2 text-center text-lg font-bold text-foreground">
                    $5.847
                  </div>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={`bid-${i}`} className="flex justify-between text-xs">
                      <span className="text-success">{(5.84 - i * 0.01).toFixed(3)}</span>
                      <span className="text-foreground-muted">
                        {(Math.random() * 1000).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trade Form */}
              <div className="col-span-3 p-4 rounded-xl bg-background-tertiary">
                <div className="flex gap-4">
                  <button className="flex-1 py-3 rounded-lg bg-success text-white font-medium">
                    Buy
                  </button>
                  <button className="flex-1 py-3 rounded-lg bg-error text-white font-medium">
                    Sell
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section id="ai-generator" className="py-20">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <Badge variant="primary" className="mb-4">
              AI-Powered
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              UI Concept Generator
            </h2>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
              Describe your interface and let AI generate a modern UI concept instantly.
              Supports web, mobile, and Telegram Mini App layouts.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Panel */}
            <div className="space-y-6">
              {/* Prompt Input */}
              <Card variant="feature" className="p-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Describe your interface
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Design a mobile crypto portfolio manager with dark mode and quick trading features"
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-ton-blue focus:ring-2 focus:ring-ton-blue/20 outline-none transition-all resize-none"
                />

                {/* Example Prompts */}
                <div className="mt-4">
                  <p className="text-xs text-foreground-muted mb-2">Try an example:</p>
                  <div className="flex flex-wrap gap-2">
                    {examplePrompts.slice(0, 3).map((example) => (
                      <button
                        key={example}
                        onClick={() => setPrompt(example)}
                        className="px-3 py-1.5 text-xs rounded-full bg-background-secondary text-foreground-muted hover:text-ton-blue hover:bg-ton-blue/10 transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Configuration */}
              <Card variant="feature" className="p-6">
                <div className="space-y-4">
                  {/* AI Provider */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      AI Provider
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {providers.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setSelectedProvider(provider.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            selectedProvider === provider.id
                              ? 'border-ton-blue bg-ton-blue/10'
                              : 'border-border bg-background-secondary hover:border-ton-blue/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm text-foreground">
                              {provider.name}
                            </span>
                            <Badge
                              variant={provider.badge === 'Primary' ? 'primary' : 'default'}
                              size="sm"
                            >
                              {provider.badge}
                            </Badge>
                          </div>
                          <span className="text-xs text-foreground-muted">{provider.speed}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Design Style */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Design Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {designStyles.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => setDesignStyle(style.id)}
                          className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                            designStyle === style.id
                              ? 'border-ton-blue bg-ton-blue/10 text-ton-blue'
                              : 'border-border bg-background-secondary text-foreground-secondary hover:border-ton-blue/50'
                          }`}
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Generate Button */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleGenerate}
                isLoading={isGenerating}
                disabled={!prompt.trim()}
              >
                {isGenerating ? 'Generating...' : 'Generate UI Concept'}
                <LightningIcon size={20} />
              </Button>
            </div>

            {/* Preview Panel */}
            <div>
              <Card variant="feature" className="p-6 min-h-[600px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Preview</h3>
                  {generatedMockup && (
                    <Badge variant="success">Generated</Badge>
                  )}
                </div>

                {generatedMockup ? (
                  <div>
                    {renderMockupPreview()}
                    <div className="mt-4 p-4 rounded-xl bg-background-secondary">
                      <p className="text-sm text-foreground-muted">
                        {generatedMockup.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {generatedMockup.components.map((comp) => (
                          <Badge key={comp} variant="default" size="sm">
                            {comp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-center">
                    <div className="w-20 h-20 rounded-2xl bg-ton-blue/10 flex items-center justify-center mb-4">
                      <RobotIcon size={40} className="text-ton-blue" />
                    </div>
                    <p className="text-foreground-muted mb-2">
                      Your generated UI will appear here
                    </p>
                    <p className="text-sm text-foreground-muted max-w-xs">
                      Enter a description and click Generate to create your UI concept
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
