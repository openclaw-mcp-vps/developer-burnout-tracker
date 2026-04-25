import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58a6ff] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[#2f81f7] text-[#f0f6fc] hover:bg-[#1f6feb] shadow-[0_8px_30px_rgba(47,129,247,0.28)]",
        secondary:
          "border border-[#30363d] bg-[#161b22] text-[#c9d1d9] hover:bg-[#21262d]",
        ghost: "text-[#8b949e] hover:bg-[#21262d] hover:text-[#f0f6fc]",
        danger: "bg-[#da3633] text-[#f0f6fc] hover:bg-[#b62324]",
      },
      size: {
        default: "h-10 px-4 py-2",
        lg: "h-12 rounded-md px-6 text-base",
        sm: "h-8 rounded-md px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
