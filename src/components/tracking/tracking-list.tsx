"use client";

import { usePackageStore } from "@/lib/store";
import { TrackingCard } from "./tracking-card";
import { Button } from "@/components/ui/button";
import { Package, Search, Filter, Archive, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function TrackingList() {
  const {
    packages: allPackages,
    selectedIds,
    deselectAll,
    searchQuery,
    statusFilter,
    carrierFilter,
    tagFilter,
    showArchived,
    clearFilters,
    archivePackage,
    deletePackage,
  } = usePackageStore();

  // Filter packages reactively (subscribe to allPackages changes)
  const packages = (() => {
    let filtered = showArchived 
      ? allPackages.filter((pkg) => pkg.isArchived)
      : allPackages.filter((pkg) => !pkg.isArchived);
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (pkg) =>
          pkg.trackingNumber.toLowerCase().includes(query) ||
          pkg.merchantName?.toLowerCase().includes(query) ||
          pkg.itemDescription?.toLowerCase().includes(query) ||
          pkg.carrierName.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== "all") {
      filtered = filtered.filter((pkg) => pkg.status === statusFilter);
    }
    
    if (carrierFilter !== "all") {
      filtered = filtered.filter((pkg) => pkg.carrier === carrierFilter);
    }
    
    if (tagFilter !== "all") {
      filtered = filtered.filter((pkg) => pkg.tags.includes(tagFilter));
    }
    
    return filtered;
  })();
  const hasActiveFilters = Boolean(searchQuery) || statusFilter !== "all" || carrierFilter !== "all" || tagFilter !== "all";

  const handleBulkArchive = () => {
    selectedIds.forEach((id) => archivePackage(id));
    deselectAll();
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => deletePackage(id));
    deselectAll();
  };

  return (
    <div className="space-y-4">
      {/* Bulk actions toolbar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between rounded-lg border border-[var(--accent)] bg-[var(--accent-light)] p-3"
          >
            <span className="text-sm font-medium text-[var(--accent)]">
              {selectedIds.length} selected
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleBulkArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
              <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="text-[var(--status-failed)]">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                <X className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filters indicator */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-[var(--foreground-tertiary)]" />
          <span className="text-[var(--foreground-secondary)]">
            Showing {packages.length} result{packages.length !== 1 ? "s" : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-auto p-1 text-[var(--accent)]"
          >
            Clear filters
          </Button>
        </div>
      )}

      {/* Package list */}
      {packages.length > 0 ? (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {packages.map((pkg) => (
              <TrackingCard key={pkg.id} package_={pkg} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState hasFilters={hasActiveFilters} />
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const { clearFilters } = usePackageStore();

  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Search className="h-12 w-12 text-[var(--foreground-tertiary)] mb-4" />
        <h3 className="text-lg font-medium text-[var(--foreground)]">
          No packages found
        </h3>
        <p className="mt-1 text-sm text-[var(--foreground-secondary)] max-w-sm">
          Try adjusting your search or filters to find what you&apos;re looking for.
        </p>
        <Button variant="secondary" onClick={clearFilters} className="mt-4">
          Clear all filters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--background-secondary)] mb-4">
        <Package className="h-8 w-8 text-[var(--foreground-tertiary)]" />
      </div>
      <h3 className="text-lg font-medium text-[var(--foreground)]">
        No packages yet
      </h3>
      <p className="mt-1 text-sm text-[var(--foreground-secondary)] max-w-sm">
        Paste a tracking number, email, or link above to start tracking your first package.
      </p>
    </div>
  );
}
