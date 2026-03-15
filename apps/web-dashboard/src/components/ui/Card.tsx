'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient' | 'glass' | 'feature';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, padding = 'lg', children, ...props }, ref) => {
    const baseStyles = 'rounded-2xl border transition-all duration-300';

    const variants = {
      default: 'bg-background border-border',
      gradient: 'bg-gradient-to-br from-background via-background to-background-secondary border-border',
      glass: 'glass backdrop-blur-xl',
      feature: 'bg-background-secondary border-border/50',
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const hoverStyles = hover
      ? 'hover:shadow-xl hover:border-border-hover hover:-translate-y-1 cursor-pointer'
      : '';

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], paddings[padding], hoverStyles, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

// Card Title
interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-xl font-semibold text-foreground', className)}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

// Card Description
interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-foreground-secondary text-base', className)}
      {...props}
    />
  )
);

CardDescription.displayName = 'CardDescription';

// Card Content
interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('pt-0', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';

// Card Footer
interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';

// Feature Card Component
interface FeatureCardProps extends HTMLAttributes<HTMLDivElement> {
  icon: ReactNode;
  title: string;
  description: string;
}

const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ className, icon, title, description, ...props }, ref) => (
    <Card
      ref={ref}
      variant="feature"
      hover
      className={cn('group', className)}
      {...props}
    >
      <div className="flex flex-col items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ton-blue/10 text-ton-blue transition-colors group-hover:bg-ton-blue group-hover:text-white">
          {icon}
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-foreground-secondary leading-relaxed">{description}</p>
        </div>
      </div>
    </Card>
  )
);

FeatureCard.displayName = 'FeatureCard';

// Metric Card Component
interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
  label: string;
  prefix?: string;
  suffix?: string;
}

const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, value, label, prefix, suffix, ...props }, ref) => (
    <Card
      ref={ref}
      variant="default"
      padding="md"
      className={cn('text-center', className)}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-bold text-foreground">
          {prefix}
          {value}
          {suffix}
        </span>
        <span className="text-sm text-foreground-muted">{label}</span>
      </div>
    </Card>
  )
);

MetricCard.displayName = 'MetricCard';

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  FeatureCard,
  MetricCard,
};
