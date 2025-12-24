"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { usePackageStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  Search,
  Package,
  Settings,
  Plus,
  Download,
  CheckCircle2,
  Truck,
  AlertTriangle,
  Command,
} from "lucide-react";

interface CommandItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

export function CommandPalette() {
  const router = useRouter();
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    packages,
    setStatusFilter,
    clearFilters,
  } = usePackageStore();

  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = useMemo(() => [
    {
      id: "new-tracking",
      icon: <Plus className="h-4 w-4" />,
      label: "Add new tracking",
      description: "Focus the tracking input",
      shortcut: "⌘N",
      action: () => {
        setCommandPaletteOpen(false);
        document.querySelector<HTMLTextAreaElement>('textarea')?.focus();
      },
      keywords: ["new", "add", "track", "paste"],
    },
    {
      id: "all-packages",
      icon: <Package className="h-4 w-4" />,
      label: "View all packages",
      action: () => {
        clearFilters();
        setCommandPaletteOpen(false);
      },
      keywords: ["all", "packages", "list"],
    },
    {
      id: "in-transit",
      icon: <Truck className="h-4 w-4" />,
      label: "Filter: In Transit",
      action: () => {
        setStatusFilter("in_transit");
        setCommandPaletteOpen(false);
      },
      keywords: ["transit", "shipping", "moving"],
    },
    {
      id: "delivered",
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: "Filter: Delivered",
      action: () => {
        setStatusFilter("delivered");
        setCommandPaletteOpen(false);
      },
      keywords: ["delivered", "complete", "arrived"],
    },
    {
      id: "exceptions",
      icon: <AlertTriangle className="h-4 w-4" />,
      label: "Filter: Exceptions",
      action: () => {
        setStatusFilter("exception");
        setCommandPaletteOpen(false);
      },
      keywords: ["exception", "problem", "issue", "delayed"],
    },
    {
      id: "settings",
      icon: <Settings className="h-4 w-4" />,
      label: "Open settings",
      shortcut: "⌘,",
      action: () => {
        router.push("/settings");
        setCommandPaletteOpen(false);
      },
      keywords: ["settings", "preferences", "options"],
    },
    {
      id: "export",
      icon: <Download className="h-4 w-4" />,
      label: "Export data",
      action: () => {
        const data = JSON.stringify(packages, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `parcel-ai-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setCommandPaletteOpen(false);
      },
      keywords: ["export", "download", "backup", "json"],
    },
  ], [packages, setCommandPaletteOpen, clearFilters, setStatusFilter, router]);

  const packageCommands: CommandItem[] = useMemo(() => 
    packages.slice(0, 5).map((pkg) => ({
      id: `package-${pkg.id}`,
      icon: <Package className="h-4 w-4" />,
      label: pkg.merchantName || pkg.carrierName,
      description: pkg.trackingNumber,
      action: () => {
        setCommandPaletteOpen(false);
        // Scroll to package
        const element = document.getElementById(`package-${pkg.id}`);
        element?.scrollIntoView({ behavior: "smooth" });
      },
      keywords: [pkg.trackingNumber, pkg.merchantName || "", pkg.carrierName].filter(Boolean),
    })),
  [packages, setCommandPaletteOpen]);

  const filteredCommands = useMemo(() => {
    const allCommands = [...commands, ...packageCommands];
    if (!search) return allCommands;
    
    const searchLower = search.toLowerCase();
    return allCommands.filter((cmd) => {
      if (cmd.label.toLowerCase().includes(searchLower)) return true;
      if (cmd.description?.toLowerCase().includes(searchLower)) return true;
      if (cmd.keywords?.some((k) => k.toLowerCase().includes(searchLower))) return true;
      return false;
    });
  }, [search, commands, packageCommands]);

  // Reset selected index when search changes - handled in onChange

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filteredCommands.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
        break;
      case "Enter":
        e.preventDefault();
        filteredCommands[selectedIndex]?.action();
        break;
      case "Escape":
        setCommandPaletteOpen(false);
        break;
    }
  }, [filteredCommands, selectedIndex, setCommandPaletteOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  const handleOpenChange = useCallback((open: boolean) => {
    setCommandPaletteOpen(open);
    if (!open) {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [setCommandPaletteOpen]);

  return (
    <Dialog open={isCommandPaletteOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden bg-[var(--background)]/95 backdrop-blur-xl border-[var(--border)] shadow-2xl sm:rounded-xl" hideCloseButton>
        <div className="flex items-center gap-3 px-4 py-1 border-b border-[var(--border)] bg-transparent">
          <Search className="h-4 w-4 text-[var(--foreground-tertiary)] shrink-0" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search commands, packages..."
            className="flex-1 h-12 bg-transparent border-0 outline-none text-sm placeholder:text-[var(--foreground-tertiary)]"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[var(--border)] bg-[var(--background-secondary)] px-1.5 text-[10px] font-medium text-[var(--foreground-tertiary)] font-mono">
            ESC
          </kbd>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-hide">
          {filteredCommands.length > 0 ? (
            <div className="space-y-1">
              {filteredCommands.map((cmd, index) => (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-all duration-200",
                    index === selectedIndex
                      ? "bg-[var(--accent)]/10 text-[var(--accent)] translate-x-0.5"
                      : "text-[var(--foreground-secondary)] hover:bg-[var(--background-hover)]"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center h-5 w-5 rounded",
                    index === selectedIndex ? "text-[var(--accent)]" : "text-[var(--foreground-tertiary)]"
                  )}>
                    {cmd.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", index === selectedIndex ? "text-[var(--foreground)]" : "")}>
                      {cmd.label}
                    </p>
                    {cmd.description && (
                      <p className="text-xs text-[var(--foreground-tertiary)] truncate mt-0.5">
                        {cmd.description}
                      </p>
                    )}
                  </div>
                  {cmd.shortcut && (
                    <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[var(--border)] bg-[var(--background-secondary)]/50 px-1.5 text-[10px] font-medium text-[var(--foreground-tertiary)] font-mono">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-[var(--foreground-secondary)] font-medium">No results found</p>
              <p className="text-xs text-[var(--foreground-tertiary)] mt-1">Try searching for something else</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[var(--border)] bg-[var(--background-secondary)]/50 backdrop-blur-sm text-[10px] uppercase tracking-wider text-[var(--foreground-tertiary)] font-medium">
          <div className="flex items-center gap-2">
            <Command className="h-3 w-3" />
            <span>Command Palette</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="text-[var(--foreground-secondary)]">↑↓</span> Navigate
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[var(--foreground-secondary)]">↵</span> Select
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
