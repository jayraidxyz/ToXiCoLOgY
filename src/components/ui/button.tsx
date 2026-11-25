import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap shrink-0 transition-[background-color,border-color,transform,box-shadow] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[#E10000] text-white shadow-[0_0_20px_rgba(225,0,0,0.34)] hover:bg-[#FF2A1F]',
        secondary:
          'border-[1.5px] border-white/85 bg-transparent text-white hover:bg-white/10',
        subtle:
          'border-[1.5px] border-[#2A2A2A] bg-[#161616] text-white hover:border-[#E10000]/70 hover:bg-[#1E1E1E]',
        ghost:
          'bg-transparent text-[#A3A3A3] hover:bg-[#161616] hover:text-white',
      },
      size: {
        default: 'h-12 px-6 text-sm',
        compact: 'min-h-[44px] px-4 py-2 text-xs',
        icon: 'h-12 w-12 p-0',
        iconCompact: 'h-11 w-11 p-0',
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
  ({ className, variant, size, asChild = false, type = 'button', ...props }, ref) => {
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
