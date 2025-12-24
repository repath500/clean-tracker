"use client";

import { usePackageStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Package,
  Inbox,
  CheckCircle2,
  Truck,
  AlertTriangle,
  Archive,
  Tag,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}

function SidebarItem({ icon, label, count, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200",
        active
          ? "bg-[var(--accent)]/10 text-[var(--accent)] font-medium"
          : "text-[var(--foreground-secondary)] hover:bg-[var(--background-hover)] hover:text-[var(--foreground)]"
      )}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <Badge 
          variant={active ? "accent" : "secondary"} 
          className={cn(
            "text-[10px] px-1.5 py-0 h-5",
            !active && "bg-[var(--background-secondary)] text-[var(--foreground-tertiary)]"
          )}
        >
          {count}
        </Badge>
      )}
    </button>
  );
}

export function Sidebar() {
  const {
    packages,
    isSidebarOpen,
    setSidebarOpen,
    statusFilter,
    setStatusFilter,
    tagFilter,
    setTagFilter,
    showArchived,
    setShowArchived,
    getAllTags,
    clearFilters,
  } = usePackageStore();

  const activePackages = packages.filter((p) => !p.isArchived);
  const archivedPackages = packages.filter((p) => p.isArchived);
  const tags = getAllTags();

  const statusCounts: Record<string, number> = {
    all: activePackages.length,
    delivered: activePackages.filter((p) => p.status === "delivered").length,
    in_transit: activePackages.filter((p) => 
      p.status === "in_transit" || p.status === "out_for_delivery"
    ).length,
    exception: activePackages.filter((p) => 
      p.status === "exception" || p.status === "failed"
    ).length,
    pending: activePackages.filter((p) => 
      p.status === "pending" || p.status === "info_received"
    ).length,
  };

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-14 z-50 h-[calc(100vh-3.5rem)] w-64 border-r border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl transition-all duration-300 ease-in-out",
          isSidebarOpen 
            ? "translate-x-0 lg:translate-x-0" 
            : "-translate-x-full lg:-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-4 lg:hidden">
            <span className="font-semibold tracking-tight">Filters</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 lg:p-4">
            {/* Status filters */}
            <div className="space-y-0.5">
              <SidebarItem
                icon={<Inbox className="h-4 w-4" />}
                label="All Packages"
                count={statusCounts.all}
                active={statusFilter === "all" && tagFilter === "all" && !showArchived}
                onClick={() => clearFilters()}
              />
              <SidebarItem
                icon={<Truck className="h-4 w-4" />}
                label="In Transit"
                count={statusCounts.in_transit}
                active={statusFilter === "in_transit" && !showArchived}
                onClick={() => {
                  setShowArchived(false);
                  setStatusFilter("in_transit");
                  setTagFilter("all");
                }}
              />
              <SidebarItem
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Delivered"
                count={statusCounts.delivered}
                active={statusFilter === "delivered" && !showArchived}
                onClick={() => {
                  setShowArchived(false);
                  setStatusFilter("delivered");
                  setTagFilter("all");
                }}
              />
              <SidebarItem
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Exceptions"
                count={statusCounts.exception}
                active={statusFilter === "exception" && !showArchived}
                onClick={() => {
                  setShowArchived(false);
                  setStatusFilter("exception");
                  setTagFilter("all");
                }}
              />
              <SidebarItem
                icon={<Package className="h-4 w-4" />}
                label="Pending"
                count={statusCounts.pending}
                active={statusFilter === "pending" && !showArchived}
                onClick={() => {
                  setShowArchived(false);
                  setStatusFilter("pending");
                  setTagFilter("all");
                }}
              />
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--foreground-tertiary)]">
                  Tags
                </h3>
                <div className="space-y-1">
                  {tags.map((tag) => (
                    <SidebarItem
                      key={tag}
                      icon={<Tag className="h-4 w-4" />}
                      label={tag}
                      count={packages.filter((p) => p.tags.includes(tag) && !p.isArchived).length}
                      active={tagFilter === tag && !showArchived}
                      onClick={() => {
                        setShowArchived(false);
                        setTagFilter(tag);
                        setStatusFilter("all");
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Archive */}
            {archivedPackages.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-[var(--foreground-tertiary)]">
                  Archive
                </h3>
                <SidebarItem
                  icon={<Archive className="h-4 w-4" />}
                  label="Archived"
                  count={archivedPackages.length}
                  active={showArchived}
                  onClick={() => {
                    setShowArchived(true);
                    setStatusFilter("all");
                    setTagFilter("all");
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--border)] p-4 flex items-center justify-between">
            <p className="text-xs text-[var(--foreground-tertiary)]">
              {packages.length} total packages
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSidebarOpen(false)}
                    className="hidden lg:flex"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Hide sidebar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </aside>

      {/* Collapsed sidebar toggle button - visible when sidebar is hidden on desktop */}
      {!isSidebarOpen && (
        <div className="hidden lg:flex fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] items-start pt-4 pl-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSidebarOpen(true)}
                  className="bg-[var(--background)] border border-[var(--border)] shadow-sm"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Show sidebar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </>
  );
}
