"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { TrackingInput } from "@/components/tracking/tracking-input";
import { TrackingList } from "@/components/tracking/tracking-list";
import { CommandPalette } from "@/components/command-palette";
import { usePackageStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function Home() {
  const { isSidebarOpen, packages } = usePackageStore();
  const hasPackages = packages.length > 0;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />
      <CommandPalette />
      
      <div className="flex">
        <Sidebar />
        
        <main
          className={cn(
            "flex-1 min-h-[calc(100vh-3.5rem)] transition-all duration-300",
            isSidebarOpen ? "lg:ml-64" : "lg:ml-0"
          )}
        >
          <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Hero section for empty state */}
            {!hasPackages && (
              <div className="mb-12 text-center">
                <h1 className="text-3xl font-semibold text-[var(--foreground)] mb-3">
                  Track your packages
                </h1>
                <p className="text-[var(--foreground-secondary)] max-w-md mx-auto">
                  Paste any tracking number, email, or link below. 
                  No account required. Your data stays on your device.
                </p>
              </div>
            )}

            {/* Tracking input */}
            <div className={cn(
              "mb-8",
              !hasPackages && "max-w-xl mx-auto"
            )}>
              <TrackingInput />
            </div>

            {/* Package list */}
            <TrackingList />
          </div>
        </main>
      </div>
    </div>
  );
}
