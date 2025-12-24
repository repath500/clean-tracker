"use client";

import { cn, formatDateTime } from "@/lib/utils";
import type { TimelineEvent } from "@/lib/types";
import { CheckCircle2, Circle, AlertCircle, Truck, Package, MapPin } from "lucide-react";

interface TrackingTimelineProps {
  events: TimelineEvent[];
}

export function TrackingTimeline({ events }: TrackingTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-[var(--foreground-tertiary)]">
        No tracking events yet
      </div>
    );
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getEventIcon = (event: TimelineEvent, isFirst: boolean) => {
    if (event.status === "delivered") {
      return <CheckCircle2 className="h-4 w-4 text-[var(--status-delivered)]" />;
    }
    if (event.status === "exception" || event.status === "failed") {
      return <AlertCircle className="h-4 w-4 text-[var(--status-failed)]" />;
    }
    if (event.status === "out_for_delivery") {
      return <Truck className="h-4 w-4 text-[var(--status-transit)]" />;
    }
    if (event.status === "in_transit") {
      return <Package className="h-4 w-4 text-[var(--status-transit)]" />;
    }
    if (isFirst) {
      return <Circle className="h-4 w-4 text-[var(--accent)] fill-[var(--accent)]" />;
    }
    return <Circle className="h-4 w-4 text-[var(--foreground-tertiary)]" />;
  };

  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium text-[var(--foreground-secondary)] mb-3">
        Tracking History
      </h4>
      <div className="relative">
        {sortedEvents.map((event, index) => {
          const isFirst = index === 0;
          const isLast = index === sortedEvents.length - 1;

          return (
            <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-[7px] top-6 h-full w-px bg-[var(--border)]" />
              )}

              {/* Icon */}
              <div className="relative z-10 flex h-4 w-4 items-center justify-center bg-[var(--background)] ring-4 ring-[var(--background)]">
                {getEventIcon(event, isFirst)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 -mt-0.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p
                    className={cn(
                      "text-sm",
                      isFirst
                        ? "font-medium text-[var(--foreground)]"
                        : "text-[var(--foreground-secondary)]"
                    )}
                  >
                    {event.message}
                  </p>
                  {event.location && (
                    <span className="flex items-center gap-1 text-xs text-[var(--foreground-tertiary)] bg-[var(--background-secondary)] px-1.5 py-0.5 rounded">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--foreground-tertiary)] font-medium">
                  {formatDateTime(event.timestamp)}
                </p>
                {event.details && (
                  <p className="mt-1 text-xs text-[var(--foreground-secondary)]">
                    {event.details}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
