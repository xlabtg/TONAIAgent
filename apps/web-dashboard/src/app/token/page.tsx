import { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  TokenIcon,
  ShieldIcon,
  UsersIcon,
  ChartIcon,
  ArrowRightIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'TONAI Token',
  description:
    'Learn about the TONAI token - utility, governance, staking, and economic model powering the TON AI Agent ecosystem.',
};

const utilities = [
  {
    icon: <TokenIcon size={24} />,
    title: 'Fee Discounts',
    description: 'Hold TONAI tokens to unlock tiered fee discounts on agent operations, marketplace fees, and premium features.',
  },
  {
    icon: <ShieldIcon size={24} />,
    title: 'Staking Rewards',
    description: 'Stake TONAI to earn protocol revenue share and additional token rewards with flexible lock periods.',
  },
  {
    icon: <UsersIcon size={24} />,
    title: 'Governance',
    description: 'Vote on protocol upgrades, fee structures, treasury allocations, and strategic decisions.',
  },
  {
    icon: <ChartIcon size={24} />,
    title: 'Premium Access',
    description: 'Unlock advanced features, priority execution, and exclusive marketplace strategies.',
  },
];

const distribution = [
  { label: 'Ecosystem & Community', percentage: 40, color: 'bg-ton-blue' },
  { label: 'Team & Advisors', percentage: 20, color: 'bg-accent-purple' },
  { label: 'Treasury', percentage: 20, color: 'bg-vibrant-cyan' },
  { label: 'Private Sale', percentage: 15, color: 'bg-success' },
  { label: 'Liquidity', percentage: 5, color: 'bg-warning' },
];

const tokenomics = [
  { label: 'Total Supply', value: '1,000,000,000' },
  { label: 'Initial Circulating', value: '150,000,000' },
  { label: 'Max Fee Discount', value: '50%' },
  { label: 'Staking APY', value: 'Up to 25%' },
];

export default function TokenPage() {
  return (
    <div className="pt-24 pb-20">
      {/* Hero */}
      <section className="container py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="primary" className="mb-4">
            TONAI Token
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
            The Token Powering{' '}
            <span className="gradient-text">Autonomous Finance</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground-secondary mb-8">
            TONAI is the native utility and governance token of the TON AI Agent
            ecosystem. Stake, govern, and unlock premium features.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/token/staking">
                Start Staking
                <ArrowRightIcon size={20} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/token/governance">View Governance</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="container py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {tokenomics.map((item) => (
            <Card key={item.label} variant="default" padding="md" className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                {item.value}
              </div>
              <div className="text-sm text-foreground-muted">{item.label}</div>
            </Card>
          ))}
        </div>
      </section>

      {/* Token Utility */}
      <section className="container py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Token Utility
          </h2>
          <p className="text-lg text-foreground-secondary max-w-2xl mx-auto">
            Multiple ways to use and benefit from holding TONAI tokens.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {utilities.map((utility) => (
            <Card key={utility.title} variant="feature" hover>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-ton-blue/10 text-ton-blue flex items-center justify-center flex-shrink-0">
                  {utility.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {utility.title}
                  </h3>
                  <p className="text-foreground-secondary">{utility.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Distribution */}
      <section className="container py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Token Distribution
            </h2>
            <p className="text-lg text-foreground-secondary mb-8">
              A fair and sustainable distribution designed for long-term ecosystem growth.
            </p>
            <div className="space-y-4">
              {distribution.map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className={`w-4 h-4 rounded ${item.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground">{item.label}</span>
                      <span className="text-foreground-secondary">{item.percentage}%</span>
                    </div>
                    <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Chart */}
          <div className="flex justify-center">
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {distribution.reduce(
                  (acc, item, index) => {
                    const startAngle = acc.offset;
                    const angle = (item.percentage / 100) * 360;
                    const endAngle = startAngle + angle;

                    const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                    const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                    const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
                    const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

                    const largeArcFlag = angle > 180 ? 1 : 0;

                    acc.paths.push(
                      <path
                        key={item.label}
                        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                        className={item.color.replace('bg-', 'fill-')}
                        opacity={0.9}
                      />
                    );

                    acc.offset = endAngle;
                    return acc;
                  },
                  { paths: [] as React.ReactNode[], offset: 0 }
                ).paths}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 md:w-40 md:h-40 bg-background rounded-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl md:text-3xl font-bold text-foreground">1B</div>
                    <div className="text-sm text-foreground-muted">Total Supply</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Accrual */}
      <section className="container py-16">
        <Card variant="gradient" className="p-8 md:p-12">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Protocol Revenue = Token Value
            </h2>
            <p className="text-foreground-secondary mb-8">
              Protocol fees are used for token buybacks and burns, staking rewards,
              and ecosystem development. As the platform grows, so does token value.
            </p>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-2xl font-bold gradient-text">30%</div>
                <div className="text-sm text-foreground-muted">Buyback & Burn</div>
              </div>
              <div>
                <div className="text-2xl font-bold gradient-text">40%</div>
                <div className="text-sm text-foreground-muted">Staking Rewards</div>
              </div>
              <div>
                <div className="text-2xl font-bold gradient-text">30%</div>
                <div className="text-sm text-foreground-muted">Ecosystem</div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* CTA */}
      <section className="container py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <Link href="/token/staking">
            <Card variant="feature" hover className="h-full">
              <h3 className="text-lg font-semibold text-foreground mb-2">Staking</h3>
              <p className="text-foreground-secondary mb-4">
                Stake TONAI to earn rewards and unlock fee discounts.
              </p>
              <span className="text-ton-blue text-sm font-medium flex items-center gap-1">
                Start Staking <ArrowRightIcon size={16} />
              </span>
            </Card>
          </Link>
          <Link href="/token/governance">
            <Card variant="feature" hover className="h-full">
              <h3 className="text-lg font-semibold text-foreground mb-2">Governance</h3>
              <p className="text-foreground-secondary mb-4">
                Participate in protocol decisions and vote on proposals.
              </p>
              <span className="text-ton-blue text-sm font-medium flex items-center gap-1">
                View Proposals <ArrowRightIcon size={16} />
              </span>
            </Card>
          </Link>
          <Link href="/token/economics">
            <Card variant="feature" hover className="h-full">
              <h3 className="text-lg font-semibold text-foreground mb-2">Economics</h3>
              <p className="text-foreground-secondary mb-4">
                Deep dive into the economic model and value accrual.
              </p>
              <span className="text-ton-blue text-sm font-medium flex items-center gap-1">
                Learn More <ArrowRightIcon size={16} />
              </span>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
