import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  BuildingIcon,
  ShieldIcon,
  ChartIcon,
  DocumentIcon,
  ArrowRightIcon,
  CheckIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'Institutional',
  description:
    'Enterprise-grade autonomous trading solutions for hedge funds, asset managers, DAOs, and corporate treasuries.',
};

const solutions = [
  {
    icon: <ChartIcon size={32} />,
    title: 'For Hedge Funds',
    description: 'Institutional-grade infrastructure for quantitative strategies and portfolio management.',
    href: '/institutional/funds',
    features: ['Portfolio Automation', 'Risk Management', 'Compliance Reporting'],
  },
  {
    icon: <BuildingIcon size={32} />,
    title: 'For DAOs',
    description: 'Autonomous treasury management with multi-sig integration and governance support.',
    href: '/institutional/dao',
    features: ['Treasury Automation', 'Governance Integration', 'Transparency'],
  },
  {
    icon: <ShieldIcon size={32} />,
    title: 'Enterprise',
    description: 'White-label solutions for enterprises with dedicated support and custom integrations.',
    href: '/institutional/enterprise',
    features: ['White-Label', 'Custom Integration', 'Dedicated Support'],
  },
];

const features = [
  'SOC 2 Type II Compliant',
  'MPC Custody Integration',
  'Regulatory Reporting',
  'Real-time Risk Monitoring',
  'Custom API Access',
  'Dedicated Account Manager',
  'SLA Guarantees',
  'On-premise Deployment Option',
];

export default function InstitutionalPage() {
  return (
    <div className="pt-24 pb-20">
      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="primary" className="mb-4">
            Institutional Solutions
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            Autonomous Finance for{' '}
            <span className="gradient-text">Institutions</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground-secondary mb-8">
            Enterprise-grade infrastructure for hedge funds, asset managers, DAOs, and
            corporate treasuries. Compliant, secure, and scalable.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/company/contact">
                Contact Sales
                <ArrowRightIcon size={20} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/resources/case-studies">View Case Studies</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Solutions */}
      <section className="container py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {solutions.map((solution) => (
            <Link key={solution.title} href={solution.href}>
              <Card variant="feature" hover className="h-full group">
                <div className="w-14 h-14 rounded-xl bg-ton-blue/10 text-ton-blue flex items-center justify-center mb-6">
                  {solution.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-ton-blue transition-colors">
                  {solution.title}
                </h3>
                <p className="text-foreground-secondary mb-6">{solution.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {solution.features.map((feature) => (
                    <Badge key={feature} variant="default" size="sm">
                      {feature}
                    </Badge>
                  ))}
                </div>
                <span className="text-ton-blue text-sm font-medium flex items-center gap-1">
                  Learn more <ArrowRightIcon size={16} />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container py-16">
        <Card variant="gradient" className="p-8 md:p-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Enterprise Features
            </h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              Built for the most demanding institutional requirements.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 p-4 bg-background/50 rounded-lg"
              >
                <CheckIcon size={16} className="text-success flex-shrink-0" />
                <span className="text-foreground">{feature}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* CTA */}
      <section className="container py-16">
        <div className="bg-deep-navy rounded-3xl p-8 md:p-12 text-white text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Scale Your Operations?
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8">
            Schedule a demo with our institutional team. We&apos;ll show you how TON AI Agent
            can transform your treasury and trading operations.
          </p>
          <Button
            size="lg"
            className="bg-white text-deep-navy hover:bg-white/90"
            asChild
          >
            <Link href="/company/contact">Schedule Demo</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
