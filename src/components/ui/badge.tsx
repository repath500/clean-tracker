"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--background-secondary)] text-[var(--foreground-secondary)]",
        secondary: "bg-[var(--background-secondary)] text-[var(--foreground-secondary)] hover:bg-[var(--background-hover)] border border-[var(--border)]",
        delivered: "bg-[var(--status-delivered-bg)] text-[var(--status-delivered)]",
        transit: "bg-[var(--status-transit-bg)] text-[var(--status-transit)]",
        delayed: "bg-[var(--status-delayed-bg)] text-[var(--status-delayed)]",
        failed: "bg-[var(--status-failed-bg)] text-[var(--status-failed)]",
        pending: "bg-[var(--status-pending-bg)] text-[var(--status-pending)]",
        accent: "bg-[var(--accent-light)] text-[var(--accent)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
