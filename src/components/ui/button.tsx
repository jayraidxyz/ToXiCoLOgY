import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap shrink-0 transition-[background-color,border-color,color,transform,box-shadow] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--accent)] text-white shadow-[0_0_20px_var(--accent-glow)] hover:bg-[var(--accent-hover)]',
        secondary:
          'border border-[var(--text)]/70 bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)]',
        subtle:
          'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--accent)]',
        ghost:
          'bg-transparent text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
      },
      size: {
        default: 'min-h-[44px] h-12 px-5 text-sm sm:px-6',
        compact: 'min-h-[44px] px-4 py-2 text-xs',
        icon: 'h-10 w-10 p-0',
        iconCompact: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, type = 'button', ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
