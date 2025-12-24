"use client";

import { usePreferencesStore, usePackageStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Bell,
  Mail,
  Download,
  Trash2,
  Database,
  Shield,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function SettingsPage() {
  const { preferences, setPreference, resetPreferences } = usePreferencesStore();
  const { packages } = usePackageStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExport = (format: "json" | "csv") => {
    if (format === "json") {
      const data = JSON.stringify(packages, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parcel-ai-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ["Tracking Number", "Carrier", "Status", "ETA", "Created At"];
      const rows = packages.map((pkg) => [
        pkg.trackingNumber,
        pkg.carrierName,
        pkg.status,
        pkg.eta || "",
        pkg.createdAt,
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parcel-ai-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleClearData = () => {
    if (showDeleteConfirm) {
      localStorage.removeItem("parcel-ai-packages");
      localStorage.removeItem("parcel-ai-preferences");
      window.location.reload();
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm">
        <div className="flex h-14 items-center gap-4 px-4 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-semibold">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto p-4 space-y-8">
        {/* Appearance */}
        <section>
          <h2 className="text-sm font-medium text-[var(--foreground-secondary)] mb-4">
            Appearance
          </h2>
          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--background-secondary)]">
                  {preferences.theme === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : preferences.theme === "light" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Monitor className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-[var(--foreground-secondary)]">
                    Choose your preferred appearance
                  </p>
                </div>
              </div>
              <div className="flex gap-1 rounded-lg border border-[var(--border)] p-1">
                {(["light", "dark", "system"] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setPreference("theme", theme)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      preferences.theme === theme
                        ? "bg-[var(--accent)] text-white"
                        : "hover:bg-[var(--background-hover)]"
                    }`}
                  >
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--background-secondary)]">
                    <Database className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Default View</p>
                    <p className="text-sm text-[var(--foreground-secondary)]">
                      How to display tracking cards
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 rounded-lg border border-[var(--border)] p-1">
                  {(["compact", "expanded"] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => setPreference("defaultView", view)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        preferences.defaultView === view
                          ? "bg-[var(--accent)] text-white"
                          : "hover:bg-[var(--background-hover)]"
                      }`}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="text-sm font-medium text-[var(--foreground-secondary)] mb-4">
            Notifications
          </h2>
          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--background-secondary)]">
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-[var(--foreground-secondary)]">
                    Get notified about package updates
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.notificationsEnabled}
                onCheckedChange={(checked) => setPreference("notificationsEnabled", checked)}
              />
            </div>

            {preferences.notificationsEnabled && (
              <div className="border-t border-[var(--border)] pt-4">
                <div className="flex items-center justify-between">
                  <div className="ml-12">
                    <p className="font-medium">Exceptions Only</p>
                    <p className="text-sm text-[var(--foreground-secondary)]">
                      Only notify on delays or problems
                    </p>
                  </div>
                  <Switch
                    checked={preferences.notifyOnExceptionsOnly}
                    onCheckedChange={(checked) => setPreference("notifyOnExceptionsOnly", checked)}
                  />
                </div>
              </div>
            )}

            <div className="border-t border-[var(--border)] pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--background-secondary)]">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Email Alerts</p>
                    <p className="text-sm text-[var(--foreground-secondary)]">
                      Receive email updates (requires account)
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.emailAlertsEnabled}
                  onCheckedChange={(checked) => setPreference("emailAlertsEnabled", checked)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Data Management */}
        <section>
          <h2 className="text-sm font-medium text-[var(--foreground-secondary)] mb-4">
            Data Management
          </h2>
          <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--background-secondary)]">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Export Data</p>
                  <p className="text-sm text-[var(--foreground-secondary)]">
                    Download all your tracking data
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleExport("json")}>
                  JSON
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleExport("csv")}>
                  CSV
                </Button>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--status-failed-bg)]">
                    <Trash2 className="h-4 w-4 text-[var(--status-failed)]" />
                  </div>
                  <div>
                    <p className="font-medium">Clear All Data</p>
                    <p className="text-sm text-[var(--foreground-secondary)]">
                      Permanently delete all local data
                    </p>
                  </div>
                </div>
                <Button
                  variant={showDeleteConfirm ? "destructive" : "secondary"}
                  size="sm"
                  onClick={handleClearData}
                >
                  {showDeleteConfirm ? "Confirm Delete" : "Clear Data"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section>
          <h2 className="text-sm font-medium text-[var(--foreground-secondary)] mb-4">
            Privacy
          </h2>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--background-secondary)]">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Your Privacy Matters</p>
                <p className="text-sm text-[var(--foreground-secondary)] mt-1">
                  ParcelAI stores all data locally on your device by default. No accounts required.
                  No ads. No tracking. Your data is yours.
                </p>
                <div className="flex gap-3 mt-3">
                  <a
                    href="#"
                    className="text-sm text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                  >
                    Privacy Policy
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <a
                    href="#"
                    className="text-sm text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                  >
                    Terms of Service
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-sm font-medium text-[var(--foreground-secondary)] mb-4">
            About
          </h2>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-light)]">
                <HelpCircle className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div className="flex-1">
                <p className="font-medium">ParcelAI</p>
                <p className="text-sm text-[var(--foreground-secondary)] mt-1">
                  Version 1.0.0 • A minimalist, ad-free parcel tracking utility.
                </p>
                <p className="text-sm text-[var(--foreground-secondary)] mt-2">
                  {packages.length} packages tracked locally
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Reset */}
        <div className="pb-8">
          <Button
            variant="ghost"
            className="text-[var(--foreground-tertiary)]"
            onClick={resetPreferences}
          >
            Reset to defaults
          </Button>
        </div>
      </main>
    </div>
  );
}
