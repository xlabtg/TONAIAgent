import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  CodeIcon,
  DocumentIcon,
  LightningIcon,
  ArrowRightIcon,
  GithubIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'Developers',
  description:
    'Build on TON AI Agent with our comprehensive SDK, API, and developer tools. Complete documentation and examples.',
};

const quickLinks = [
  {
    icon: <LightningIcon size={24} />,
    title: 'Quick Start',
    description: 'Get started with TON AI Agent in 5 minutes.',
    href: '/developers/quickstart',
    cta: 'Start Tutorial',
  },
  {
    icon: <DocumentIcon size={24} />,
    title: 'Documentation',
    description: 'Comprehensive guides and API reference.',
    href: '/developers/docs',
    cta: 'Read Docs',
  },
  {
    icon: <CodeIcon size={24} />,
    title: 'SDK Reference',
    description: 'Full SDK documentation with examples.',
    href: '/developers/sdk',
    cta: 'View SDK',
  },
  {
    icon: <GithubIcon size={24} />,
    title: 'Examples',
    description: 'Code examples and starter templates.',
    href: '/developers/examples',
    cta: 'Browse Examples',
  },
];

const codeExample = `import { TONAIAgent } from '@tonaiagent/core';

// Initialize the client
const agent = new TONAIAgent({
  apiKey: process.env.TONAI_API_KEY,
});

// Create a DCA strategy
const strategy = await agent.strategies.create({
  type: 'dca',
  params: {
    asset: 'TON',
    amount: 100,
    frequency: 'weekly',
  },
});

// Deploy the agent
const deployed = await agent.deploy(strategy);
console.log('Agent deployed:', deployed.id);`;

export default function DevelopersPage() {
  return (
    <div className="pt-24 pb-20">
      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="primary" className="mb-4">
              Developer Portal
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Build Autonomous{' '}
              <span className="gradient-text">AI Agents</span>
            </h1>
            <p className="text-lg text-foreground-secondary mb-8">
              Integrate intelligent agents into your applications with our
              comprehensive SDK. Full TypeScript support, extensive documentation,
              and production-ready examples.
            </p>
            <div className="flex flex-wrap gap-4 mb-8">
              <Button size="lg" asChild>
                <Link href="/developers/quickstart">
                  Quick Start
                  <ArrowRightIcon size={20} />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link
                  href="https://github.com/xlabtg/TONAIAgent"
                  target="_blank"
                >
                  <GithubIcon size={20} />
                  View on GitHub
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-6 text-sm text-foreground-muted">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full" />
                TypeScript
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-ton-blue rounded-full" />
                MIT License
              </span>
              <span>v2.6.0</span>
            </div>
          </div>

          {/* Code Preview */}
          <div className="relative">
            <div className="bg-deep-navy rounded-2xl p-6 overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-error" />
                  <span className="w-3 h-3 rounded-full bg-warning" />
                  <span className="w-3 h-3 rounded-full bg-success" />
                </div>
                <span className="text-xs text-white/40 ml-2">example.ts</span>
              </div>
              <pre className="text-sm text-white/80 overflow-x-auto">
                <code>{codeExample}</code>
              </pre>
            </div>
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-ton-blue/20 to-vibrant-cyan/20 rounded-3xl blur-3xl -z-10" />
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="container py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickLinks.map((link) => (
            <Link key={link.title} href={link.href}>
              <Card variant="feature" hover className="h-full group">
                <div className="w-12 h-12 rounded-xl bg-ton-blue/10 text-ton-blue flex items-center justify-center mb-4 group-hover:bg-ton-blue group-hover:text-white transition-colors">
                  {link.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {link.title}
                </h3>
                <p className="text-foreground-secondary mb-4">{link.description}</p>
                <span className="text-ton-blue text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  {link.cta}
                  <ArrowRightIcon size={16} />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Installation */}
      <section className="container py-16">
        <Card variant="gradient" className="p-8 md:p-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Install in Seconds
              </h2>
              <p className="text-foreground-secondary mb-6">
                Add TON AI Agent to your project with a single command.
                Works with npm, yarn, pnpm, and bun.
              </p>
              <div className="bg-deep-navy rounded-lg p-4 font-mono text-sm text-white">
                <span className="text-foreground-muted">$</span> npm install @tonaiagent/core
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-foreground-secondary">Full TypeScript support</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-foreground-secondary">Tree-shakeable for minimal bundle size</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-foreground-secondary">Works in Node.js, browser, and edge</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-success/10 text-success flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-foreground-secondary">Comprehensive test coverage</span>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Popular Topics */}
      <section className="container py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
          Popular Topics
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            'Creating Your First Agent',
            'Strategy DSL Reference',
            'Webhook Integration',
            'Plugin Development',
            'Error Handling',
            'Authentication',
            'Rate Limits',
            'Testing & Sandbox',
            'Deployment Best Practices',
          ].map((topic) => (
            <Link
              key={topic}
              href={`/developers/docs/${topic.toLowerCase().replace(/\s+/g, '-')}`}
              className="flex items-center justify-between p-4 bg-background-secondary rounded-lg hover:bg-background-tertiary transition-colors group"
            >
              <span className="text-foreground">{topic}</span>
              <ArrowRightIcon
                size={16}
                className="text-foreground-muted group-hover:text-ton-blue group-hover:translate-x-1 transition-all"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Community */}
      <section className="container py-16">
        <div className="bg-gradient-to-r from-ton-blue to-vibrant-cyan rounded-3xl p-8 md:p-12 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Join the Developer Community
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8">
            Get help, share your projects, and connect with other developers building
            on TON AI Agent.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-white text-ton-blue hover:bg-white/90"
              asChild
            >
              <Link href="https://discord.gg/tonaiagent" target="_blank">
                Join Discord
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              asChild
            >
              <Link href="https://github.com/xlabtg/TONAIAgent" target="_blank">
                Star on GitHub
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
