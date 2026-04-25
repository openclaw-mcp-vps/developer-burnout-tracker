import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        default: "border-[#30363d] bg-[#21262d] text-[#c9d1d9]",
        success: "border-[#238636] bg-[#2386361a] text-[#3fb950]",
        warning: "border-[#d29922] bg-[#d299221a] text-[#e3b341]",
        danger: "border-[#da3633] bg-[#da36331a] text-[#f85149]",
        info: "border-[#1f6feb] bg-[#1f6feb1a] text-[#58a6ff]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
