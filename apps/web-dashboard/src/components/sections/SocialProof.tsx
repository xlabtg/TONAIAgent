'use client';

import { Card } from '@/components/ui/Card';

const partners = [
  { name: 'TON Foundation', logo: '/partners/ton.svg' },
  { name: 'Telegram', logo: '/partners/telegram.svg' },
  { name: 'CoinRabbit', logo: '/partners/coinrabbit.svg' },
  { name: 'Groq', logo: '/partners/groq.svg' },
  { name: 'ChangeNOW', logo: '/partners/changenow.svg' },
  { name: 'RedStone', logo: '/partners/redstone.svg' },
];

const testimonials = [
  {
    quote: "TON AI Agent has completely transformed how I manage my DeFi portfolio. The AI-powered strategies consistently outperform my manual trading.",
    author: 'Alex Chen',
    role: 'DeFi Trader',
    avatar: '/avatars/alex.jpg',
  },
  {
    quote: "As a developer, the SDK is incredibly well-designed. I was able to build a custom strategy plugin in just a few hours.",
    author: 'Maria Santos',
    role: 'Blockchain Developer',
    avatar: '/avatars/maria.jpg',
  },
  {
    quote: "The institutional-grade security and compliance features gave our fund the confidence to integrate autonomous agents into our operations.",
    author: 'James Wilson',
    role: 'Fund Manager',
    avatar: '/avatars/james.jpg',
  },
];

const metrics = [
  { value: '$50M+', label: 'Total Value Locked' },
  { value: '10,000+', label: 'Active Users' },
  { value: '1,000+', label: 'Strategies Created' },
  { value: '500K+', label: 'Transactions Executed' },
];

export function SocialProof() {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container">
        {/* Partner Logos */}
        <div className="text-center mb-20">
          <p className="text-sm text-foreground-muted uppercase tracking-wider mb-8">
            Trusted by industry leaders
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {partners.map((partner) => (
              <div
                key={partner.name}
                className="h-8 md:h-10 opacity-50 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              >
                {/* Placeholder for partner logo */}
                <div className="h-full px-4 flex items-center justify-center bg-foreground-muted/10 rounded text-foreground-muted text-sm font-medium">
                  {partner.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {metrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <div className="text-3xl md:text-4xl lg:text-5xl font-bold gradient-text mb-2">
                {metric.value}
              </div>
              <div className="text-foreground-muted">{metric.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.author}
              variant="default"
              hover
              className="animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col h-full">
                {/* Quote */}
                <div className="flex-1 mb-6">
                  <svg className="w-8 h-8 text-ton-blue/30 mb-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.871 3.871 0 01-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.871 3.871 0 01-2.748-1.179z" />
                  </svg>
                  <p className="text-foreground-secondary leading-relaxed">
                    {testimonial.quote}
                  </p>
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ton-blue to-vibrant-cyan flex items-center justify-center text-white font-medium">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{testimonial.author}</div>
                    <div className="text-sm text-foreground-muted">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
