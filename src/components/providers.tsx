"use client";

import { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={300}>
      <KeyboardShortcutsProvider>
        {children}
      </KeyboardShortcutsProvider>
    </TooltipProvider>
  );
}
