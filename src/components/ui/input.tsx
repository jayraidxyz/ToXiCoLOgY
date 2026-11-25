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
        'min-h-[44px] w-full rounded-full border-[1.5px] border-[#2A2A2A] bg-[#161616] px-4 py-2 text-sm text-white placeholder:text-[#A3A3A3] transition-colors duration-200 focus:border-[#E10000] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]/60',
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
        'w-full rounded-[20px] border-[1.5px] border-[#2A2A2A] bg-[#161616] p-4 text-sm text-white placeholder:text-[#A3A3A3] transition-colors duration-200 focus:border-[#E10000] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B63]/60',
        className
      )}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Input, Textarea };
