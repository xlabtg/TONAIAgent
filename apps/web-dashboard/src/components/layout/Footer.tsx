'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  TonIcon,
  TelegramIcon,
  TwitterIcon,
  GithubIcon,
  DiscordIcon,
} from '@/components/icons';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const footerLinks: Record<string, FooterSection> = {
  product: {
    title: 'Product',
    links: [
      { label: 'Agents', href: '/product/agents' },
      { label: 'Strategy Engine', href: '/product/strategy-engine' },
      { label: 'Marketplace', href: '/product/marketplace' },
      { label: 'Security', href: '/product/security' },
      { label: 'AI Layer', href: '/product/ai-layer' },
      { label: 'Multi-Agent', href: '/product/multi-agent' },
    ],
  },
  developers: {
    title: 'Developers',
    links: [
      { label: 'Documentation', href: '/developers/docs' },
      { label: 'SDK', href: '/developers/sdk' },
      { label: 'API Reference', href: '/developers/api' },
      { label: 'Quick Start', href: '/developers/quickstart' },
      { label: 'Examples', href: '/developers/examples' },
      { label: 'GitHub', href: 'https://github.com/xlabtg/TONAIAgent', external: true },
    ],
  },
  ecosystem: {
    title: 'Ecosystem',
    links: [
      { label: 'Strategies', href: '/ecosystem/strategies' },
      { label: 'Partners', href: '/ecosystem/partners' },
      { label: 'Builders Program', href: '/ecosystem/builders' },
      { label: 'Grants', href: '/ecosystem/grants' },
    ],
  },
  company: {
    title: 'Company',
    links: [
      { label: 'About', href: '/company/about' },
      { label: 'Blog', href: '/resources/blog' },
      { label: 'Careers', href: '/company/careers' },
      { label: 'Press', href: '/company/press' },
      { label: 'Contact', href: '/company/contact' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Risk Disclaimers', href: '/legal/disclaimers' },
      { label: 'Security', href: '/security/overview' },
    ],
  },
};

const socialLinks = [
  { icon: TelegramIcon, href: 'https://t.me/tonaiagent', label: 'Telegram' },
  { icon: TwitterIcon, href: 'https://twitter.com/tonaiagent', label: 'Twitter' },
  { icon: GithubIcon, href: 'https://github.com/xlabtg/TONAIAgent', label: 'GitHub' },
  { icon: DiscordIcon, href: 'https://discord.gg/tonaiagent', label: 'Discord' },
];

export function Footer() {
  return (
    <footer className="bg-background-secondary border-t border-border">
      {/* Newsletter Section */}
      <div className="container py-12 md:py-16">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 pb-12 border-b border-border">
          <div className="max-w-md">
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              Stay updated
            </h3>
            <p className="text-foreground-secondary">
              Get the latest news, updates, and insights from TON AI Agent.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <Input
              type="email"
              placeholder="Enter your email"
              className="sm:w-72"
            />
            <Button>Subscribe</Button>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 py-12">
          {Object.values(footerLinks).map((section) => (
            <div key={section.title}>
              <h4 className="font-semibold text-foreground mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground-secondary hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-foreground-secondary hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-border">
          {/* Logo and Copyright */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <TonIcon size={28} />
              <span className="font-bold text-lg text-foreground">TON AI Agent</span>
            </Link>
            <span className="text-foreground-muted text-sm">
              {new Date().getFullYear()} TON AI Agent. All rights reserved.
            </span>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'p-2 rounded-lg text-foreground-muted',
                  'hover:bg-background hover:text-foreground',
                  'transition-colors duration-200'
                )}
                aria-label={social.label}
              >
                <social.icon size={20} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-deep-navy py-4">
        <div className="container">
          <p className="text-center text-sm text-white/60">
            Built with precision for the TON Ecosystem. Powered by{' '}
            <a
              href="https://ton.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ton-blue hover:underline"
            >
              The Open Network
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
