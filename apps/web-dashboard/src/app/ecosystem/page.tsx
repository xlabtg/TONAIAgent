import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  MarketplaceIcon,
  UsersIcon,
  CodeIcon,
  GlobeIcon,
  ArrowRightIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'Ecosystem',
  description:
    'Explore the TON AI Agent ecosystem. Strategy marketplace, partner network, builder program, and grants.',
};

const sections = [
  {
    icon: <MarketplaceIcon size={32} />,
    title: 'Strategy Marketplace',
    description: 'Discover and copy proven strategies from top performers. Browse by category, risk level, and performance.',
    href: '/ecosystem/strategies',
    stats: { value: '1,000+', label: 'Strategies' },
  },
  {
    icon: <UsersIcon size={32} />,
    title: 'Partner Network',
    description: 'Integrate with TON AI Agent and reach millions of users. API access, co-marketing, and revenue share.',
    href: '/ecosystem/partners',
    stats: { value: '50+', label: 'Partners' },
  },
  {
    icon: <CodeIcon size={32} />,
    title: 'Builder Program',
    description: 'Build the future of autonomous finance. Grants, mentorship, and ecosystem support for builders.',
    href: '/ecosystem/builders',
    stats: { value: '$5M', label: 'In Grants' },
  },
];

export default function EcosystemPage() {
  return (
    <div className="pt-24 pb-20">
      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="primary" className="mb-4">
            Ecosystem
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Join the Growing{' '}
            <span className="gradient-text">TON AI Agent Ecosystem</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground-secondary mb-8">
            Build, trade, and earn in the most active autonomous finance ecosystem on TON.
            Strategies, partners, and opportunities await.
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="container py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {sections.map((section) => (
            <Link key={section.title} href={section.href}>
              <Card variant="feature" hover className="h-full group">
                <div className="w-14 h-14 rounded-xl bg-ton-blue/10 text-ton-blue flex items-center justify-center mb-6">
                  {section.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-ton-blue transition-colors">
                  {section.title}
                </h3>
                <p className="text-foreground-secondary mb-6">{section.description}</p>
                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{section.stats.value}</div>
                    <div className="text-sm text-foreground-muted">{section.stats.label}</div>
                  </div>
                  <ArrowRightIcon size={20} className="text-ton-blue group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16">
        <div className="bg-gradient-to-r from-ton-blue to-vibrant-cyan rounded-3xl p-8 md:p-12 text-white text-center">
          <GlobeIcon size={48} className="mx-auto mb-4 opacity-80" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Be Part of the Future
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8">
            Whether you&apos;re building strategies, integrating the API, or contributing to the protocol,
            there&apos;s a place for you in the TON AI Agent ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-white text-ton-blue hover:bg-white/90"
              asChild
            >
              <Link href="/ecosystem/builders">Apply for Grants</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              asChild
            >
              <Link href="/ecosystem/partners">Become a Partner</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
