'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { TonIcon, MenuIcon, CloseIcon, ChevronDownIcon } from '@/components/icons';

interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string; description?: string }[];
}

const navigation: NavItem[] = [
  {
    label: 'Product',
    href: '/product',
    children: [
      { label: 'Agents', href: '/product/agents', description: 'Autonomous AI agents for finance' },
      { label: 'Strategy Engine', href: '/product/strategy-engine', description: 'Strategy DSL and AI generation' },
      { label: 'Marketplace', href: '/product/marketplace', description: 'Discover and copy strategies' },
      { label: 'Security', href: '/product/security', description: 'Institutional-grade security' },
      { label: 'AI Layer', href: '/product/ai-layer', description: 'Multi-provider AI infrastructure' },
    ],
  },
  {
    label: 'Developers',
    href: '/developers',
    children: [
      { label: 'Documentation', href: '/developers/docs', description: 'Complete developer guides' },
      { label: 'SDK', href: '/developers/sdk', description: 'SDK reference and examples' },
      { label: 'API', href: '/developers/api', description: 'REST API documentation' },
      { label: 'Quick Start', href: '/developers/quickstart', description: 'Get started in 5 minutes' },
    ],
  },
  {
    label: 'Institutional',
    href: '/institutional',
    children: [
      { label: 'For Funds', href: '/institutional/funds', description: 'Hedge funds and asset managers' },
      { label: 'For DAOs', href: '/institutional/dao', description: 'Treasury management' },
      { label: 'Enterprise', href: '/institutional/enterprise', description: 'Corporate treasury solutions' },
    ],
  },
  {
    label: 'Ecosystem',
    href: '/ecosystem',
    children: [
      { label: 'Strategies', href: '/ecosystem/strategies', description: 'Browse strategy marketplace' },
      { label: 'Partners', href: '/ecosystem/partners', description: 'Partner network' },
      { label: 'Builders', href: '/ecosystem/builders', description: 'Builder program and grants' },
    ],
  },
  {
    label: 'Token',
    href: '/token',
    children: [
      { label: 'Overview', href: '/token/overview', description: 'TONAI token utility' },
      { label: 'Staking', href: '/token/staking', description: 'Staking rewards' },
      { label: 'Governance', href: '/token/governance', description: 'DAO governance' },
    ],
  },
  {
    label: 'Resources',
    href: '/resources',
    children: [
      { label: 'Blog', href: '/resources/blog', description: 'Latest updates and insights' },
      { label: 'Research', href: '/resources/research', description: 'Whitepapers and reports' },
      { label: 'Case Studies', href: '/resources/case-studies', description: 'User success stories' },
    ],
  },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="container">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <TonIcon size={32} className="transition-transform group-hover:scale-110" />
            <span className="font-bold text-xl text-foreground">TON AI Agent</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setActiveDropdown(item.label)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1 px-4 py-2 text-sm font-medium',
                    'text-foreground-secondary hover:text-foreground',
                    'transition-colors duration-200 rounded-lg',
                    'hover:bg-background-secondary'
                  )}
                >
                  {item.label}
                  {item.children && (
                    <ChevronDownIcon
                      size={16}
                      className={cn(
                        'transition-transform duration-200',
                        activeDropdown === item.label && 'rotate-180'
                      )}
                    />
                  )}
                </Link>

                {/* Dropdown */}
                {item.children && activeDropdown === item.label && (
                  <div className="absolute top-full left-0 pt-2 animate-fade-down">
                    <div className="bg-background border border-border rounded-xl shadow-xl p-2 min-w-[280px]">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex flex-col gap-0.5 p-3 rounded-lg',
                            'hover:bg-background-secondary transition-colors'
                          )}
                        >
                          <span className="font-medium text-foreground">{child.label}</span>
                          {child.description && (
                            <span className="text-sm text-foreground-muted">{child.description}</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/developers/quickstart">Start Building</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="https://t.me/tonaiagent_bot" target="_blank" rel="noopener noreferrer">
                Launch App
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-foreground"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </nav>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 bg-background z-40 overflow-y-auto">
          <div className="container py-6">
            <nav className="flex flex-col gap-2">
              {navigation.map((item) => (
                <div key={item.label}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between py-3 text-lg font-medium text-foreground"
                  >
                    {item.label}
                  </Link>
                  {item.children && (
                    <div className="pl-4 pb-2 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block py-2 text-foreground-secondary hover:text-foreground"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
            <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-border">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/developers/quickstart">Start Building</Link>
              </Button>
              <Button className="w-full" asChild>
                <Link href="https://t.me/tonaiagent_bot" target="_blank" rel="noopener noreferrer">
                  Launch App
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
