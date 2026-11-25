import * as React from 'react';
import { cn } from '../../lib/utils';
import { MascotAvatar } from '../CrownMark';
import { Card } from './card';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-[var(--surface-2)]', className)}
      {...props}
    />
  );
}

function ArchiveSkeletonLoader({
  label = 'Loading Toxicology Archive...',
}: {
  label?: string;
}) {
  return (
    <Card className="p-4 sm:p-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-4">
        <MascotAvatar size="sm" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-display text-sm font-bold text-[var(--text)]">
            {label}
          </p>
          <Skeleton className="h-2.5 w-40 rounded-full" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        <Skeleton className="h-28 border border-[var(--border)]" />
        <Skeleton className="h-28 border border-[var(--border)]" />
      </div>
    </Card>
  );
}

export { Skeleton, ArchiveSkeletonLoader };
