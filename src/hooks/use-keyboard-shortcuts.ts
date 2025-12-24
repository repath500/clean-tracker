"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePackageStore } from "@/lib/store";

export function useKeyboardShortcuts() {
  const router = useRouter();
  const { setCommandPaletteOpen, packages } = usePackageStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape to close things even when in input
        if (e.key === "Escape") {
          (target as HTMLInputElement).blur();
        }
        return;
      }

      const isMeta = e.metaKey || e.ctrlKey;

      // Command palette: Cmd/Ctrl + K
      if (isMeta && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Search: Cmd/Ctrl + F
      if (isMeta && e.key === "f") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // New tracking: Cmd/Ctrl + N
      if (isMeta && e.key === "n") {
        e.preventDefault();
        document.querySelector<HTMLTextAreaElement>("textarea")?.focus();
        return;
      }

      // Settings: Cmd/Ctrl + ,
      if (isMeta && e.key === ",") {
        e.preventDefault();
        router.push("/settings");
        return;
      }

      // Export: Cmd/Ctrl + E
      if (isMeta && e.key === "e") {
        e.preventDefault();
        const data = JSON.stringify(packages, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `parcel-ai-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // Navigation with j/k (vim-style)
      if (e.key === "j" || e.key === "k") {
        const cards = document.querySelectorAll("[data-tracking-card]");
        if (cards.length === 0) return;

        const focused = document.activeElement;
        let currentIndex = -1;

        cards.forEach((card, index) => {
          if (card.contains(focused) || card === focused) {
            currentIndex = index;
          }
        });

        let nextIndex: number;
        if (e.key === "j") {
          nextIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
        }

        const nextCard = cards[nextIndex] as HTMLElement;
        nextCard?.focus();
        nextCard?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      // Expand/collapse with Enter
      if (e.key === "Enter") {
        const focused = document.activeElement as HTMLElement;
        if (focused?.hasAttribute("data-tracking-card")) {
          focused.click();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router, setCommandPaletteOpen, packages]);
}
