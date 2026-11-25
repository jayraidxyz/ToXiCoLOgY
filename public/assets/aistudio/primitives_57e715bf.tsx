import React from 'react';
import { MascotAvatar } from '../CrownMark';

interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function ClayCard({
  interactive = false,
  className = '',
  children,
  ...props
}: ClayCardProps) {
  return (
    <div
      className={`clay-card ${
        interactive ? 'clay-card-interactive' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'subtle';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  compact?: boolean;
}

export function Button({
  variant = 'primary',
  compact = false,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const heightCls = compact ? 'min-h-[44px] px-4 text-xs' : 'h-12 px-6 text-sm';

  const variantCls =
    variant === 'primary'
      ? 'bg-[#E10000] text-white hover:bg-[#FF2A1F] shadow-[0_0_20px_rgba(225,0,0,0.32)]'
      : variant === 'secondary'
      ? 'border-[1.5px] border-white/80 bg-transparent text-white hover:bg-white/10'
      : 'border-[1.5px] border-[#2A2A2A] bg-[#161616] text-white hover:border-[#E10000]/70 hover:bg-[#1E1E1E]';

  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,border-color,transform,box-shadow] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 ${heightCls} ${variantCls} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

interface AnchorButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  compact?: boolean;
}

export function AnchorButton({
  variant = 'secondary',
  compact = false,
  className = '',
  children,
  ...props
}: AnchorButtonProps) {
  const heightCls = compact ? 'min-h-[44px] px-4 text-xs' : 'h-12 px-6 text-sm';

  const variantCls =
    variant === 'primary'
      ? 'bg-[#E10000] text-white hover:bg-[#FF2A1F] shadow-[0_0_20px_rgba(225,0,0,0.32)]'
      : variant === 'secondary'
      ? 'border-[1.5px] border-white/80 bg-transparent text-white hover:bg-white/10'
      : 'border-[1.5px] border-[#2A2A2A] bg-[#161616] text-white hover:border-[#E10000]/70 hover:bg-[#1E1E1E]';

  return (
    <a
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,border-color,transform,box-shadow] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] whitespace-nowrap shrink-0 ${heightCls} ${variantCls} ${className}`}
      {...props}
    >
      {children}
    </a>
  );
}

export function ArchiveSkeletonLoader({ label = 'Loading Toxicology Archive...' }: { label?: string }) {
  return (
    <ClayCard className="p-6 sm:p-8" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-4">
        <MascotAvatar size="sm" />
        <div className="space-y-2 flex-1">
          <p className="font-display text-sm font-bold text-white">{label}</p>
          <div className="h-2.5 w-40 animate-pulse rounded-full bg-[#161616]" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-[20px] border border-[#2A2A2A] bg-[#161616]" />
        <div className="h-28 animate-pulse rounded-[20px] border border-[#2A2A2A] bg-[#161616]" />
      </div>
    </ClayCard>
  );
}
