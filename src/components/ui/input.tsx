import * as React from 'react';
import { cn } from '../../lib/utils';

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = 'text', ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'min-h-[44px] w-full min-w-0 max-w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-base text-[var(--text)] placeholder:text-[var(--muted)] transition-colors duration-200 focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]/60',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[96px] w-full min-w-0 max-w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-base text-[var(--text)] placeholder:text-[var(--muted)] transition-colors duration-200 focus:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-text)]/60',
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Input, Textarea };
