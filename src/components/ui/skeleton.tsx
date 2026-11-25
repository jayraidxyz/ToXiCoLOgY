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
      className={cn('animate-pulse rounded-[20px] bg-[#161616]', className)}
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
    <Card className="p-6 sm:p-8" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-4">
        <MascotAvatar size="sm" />
        <div className="flex-1 space-y-2">
          <p className="font-display text-sm font-bold text-white">{label}</p>
          <Skeleton className="h-2.5 w-40 rounded-full" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 border-[1.5px] border-[#2A2A2A]" />
        <Skeleton className="h-28 border-[1.5px] border-[#2A2A2A]" />
      </div>
    </Card>
  );
}

export { Skeleton, ArchiveSkeletonLoader };
