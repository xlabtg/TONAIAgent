'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      asChild = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = cn(
      'inline-flex items-center justify-center gap-2',
      'font-medium transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ton-blue focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      'rounded-full'
    );

    const variants = {
      primary: cn(
        'bg-ton-blue text-white',
        'hover:bg-ton-blue-dark hover:shadow-lg',
        'active:scale-[0.98]'
      ),
      secondary: cn(
        'bg-background-secondary text-foreground',
        'border border-border',
        'hover:bg-background-tertiary hover:border-border-hover',
        'active:scale-[0.98]'
      ),
      ghost: cn(
        'text-foreground-secondary',
        'hover:bg-background-secondary hover:text-foreground',
        'active:scale-[0.98]'
      ),
      outline: cn(
        'border-2 border-ton-blue text-ton-blue',
        'hover:bg-ton-blue hover:text-white',
        'active:scale-[0.98]'
      ),
      danger: cn(
        'bg-error text-white',
        'hover:bg-error/90 hover:shadow-lg',
        'active:scale-[0.98]'
      ),
    };

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 text-base',
      lg: 'h-12 px-8 text-base',
      xl: 'h-14 px-10 text-lg',
    };

    const Comp = asChild ? Slot : 'button';

    // When using asChild, we pass all children directly to Slot
    // which will merge props onto its single child element
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(baseStyles, variants[variant], sizes[size], className)}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <svg
            className="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
