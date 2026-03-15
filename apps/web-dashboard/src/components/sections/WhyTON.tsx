'use client';

import { TelegramIcon, LightningIcon, TokenIcon, CodeIcon, GlobeIcon } from '@/components/icons';

const advantages = [
  {
    icon: <TelegramIcon size={28} />,
    title: 'Telegram Distribution',
    description: '900M+ Telegram users can access via Mini App',
    stat: '900M+',
    statLabel: 'Potential Users',
  },
  {
    icon: <LightningIcon size={28} />,
    title: 'Scalability',
    description: 'Millions of TPS with sharding architecture',
    stat: '10M+',
    statLabel: 'TPS Capacity',
  },
  {
    icon: <TokenIcon size={28} />,
    title: 'Low Fees',
    description: 'Fraction of a cent per transaction',
    stat: '$0.01',
    statLabel: 'Avg Transaction',
  },
  {
    icon: <CodeIcon size={28} />,
    title: 'Developer Friendly',
    description: 'FunC/Tact smart contracts, robust tooling',
    stat: '1000+',
    statLabel: 'Active Devs',
  },
  {
    icon: <GlobeIcon size={28} />,
    title: 'Growing Ecosystem',
    description: 'Fastest-growing L1 with active DeFi',
    stat: '$500M+',
    statLabel: 'TVL',
  },
];

export function WhyTON() {
  return (
    <section className="py-20 md:py-32 bg-background-secondary">
      <div className="container">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Built on The Open Network
          </h2>
          <p className="text-lg text-foreground-secondary">
            TON combines the reach of Telegram with the power of a next-generation blockchain.
            The perfect foundation for autonomous AI agents.
          </p>
        </div>

        {/* Advantages */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
          {advantages.map((advantage, index) => (
            <div
              key={advantage.title}
              className="bg-background rounded-2xl border border-border p-6 text-center hover:shadow-lg hover:border-ton-blue/30 transition-all duration-300"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-ton-blue/10 text-ton-blue flex items-center justify-center">
                {advantage.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{advantage.title}</h3>
              <p className="text-sm text-foreground-muted mb-4">{advantage.description}</p>
              <div className="pt-4 border-t border-border">
                <div className="text-2xl font-bold text-ton-blue">{advantage.stat}</div>
                <div className="text-xs text-foreground-muted">{advantage.statLabel}</div>
              </div>
            </div>
          ))}
        </div>

        {/* TON Logo Banner */}
        <div className="mt-16 flex items-center justify-center">
          <div className="flex items-center gap-4 px-8 py-4 bg-background rounded-full border border-border">
            <svg width="40" height="40" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M28 56C43.464 56 56 43.464 56 28C56 12.536 43.464 0 28 0C12.536 0 0 12.536 0 28C0 43.464 12.536 56 28 56Z" fill="#0088CC"/>
              <path d="M37.5603 15.6298H18.4386C14.9228 15.6298 12.6944 19.4354 14.4632 22.4656L26.2644 42.9582C27.0432 44.2977 28.9542 44.2977 29.7329 42.9582L41.5348 22.4656C43.3029 19.4354 41.0752 15.6298 37.5603 15.6298ZM26.2657 36.2057L24.1653 32.4372L17.8328 21.4876C17.3721 20.7085 17.9249 19.7113 18.8382 19.7113H26.2657V36.2057ZM38.1644 21.4876L31.832 32.4372L29.7322 36.2057V19.7106H37.1597C38.0737 19.7106 38.6258 20.7078 38.1651 21.4869L38.1644 21.4876Z" fill="white"/>
            </svg>
            <div className="text-left">
              <div className="text-sm text-foreground-muted">Powered by</div>
              <div className="font-semibold text-foreground">The Open Network</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
