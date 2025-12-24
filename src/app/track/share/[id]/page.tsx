"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { STATUS_CONFIG, type TrackingPackage } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";
import { MapPin, Calendar, Truck, Package, Loader2 } from "lucide-react";

export default function SharePage() {
  const params = useParams();
  const shareId = params.id as string;
  const [packageData, setPackageData] = useState<TrackingPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShareData = async () => {
      try {
        const response = await fetch(`/api/share?id=${shareId}`);
        if (!response.ok) {
          throw new Error("Share not found");
        }
        const data = await response.json();
        setPackageData(data.packageData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tracking");
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      fetchShareData();
    }
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Loading tracking...</p>
        </div>
      </div>
    );
  }

  if (error || !packageData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Tracking Not Found
          </h1>
          <p className="text-gray-500">
            This tracking link may have expired or is invalid.
          </p>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[packageData.status] || STATUS_CONFIG.unknown;
  const getStatusBadgeVariant = () => {
    switch (packageData.status) {
      case "delivered":
        return "delivered";
      case "in_transit":
      case "out_for_delivery":
        return "transit";
      case "exception":
      case "failed":
        return "failed";
      case "pending":
      case "info_received":
        return "pending";
      default:
        return "default";
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="h-4 w-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: statusConfig.color }}
            />
            <h1 className="text-2xl font-semibold text-gray-900">
              {packageData.nickname || packageData.merchantName || packageData.carrierName}
            </h1>
          </div>
          
          {/* Status Badge */}
          <Badge variant={getStatusBadgeVariant()} className="mb-4">
            {statusConfig.label}
          </Badge>

          {/* Summary */}
          <p className="text-gray-600 text-lg">
            {packageData.statusMessage}
          </p>
        </div>

        {/* Tracking Number */}
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Tracking Number</div>
          <code className="text-sm font-mono text-gray-900">
            {packageData.trackingNumber}
          </code>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <Truck className="h-3.5 w-3.5" />
              Carrier
            </div>
            <p className="text-sm font-medium text-gray-900">
              {packageData.carrierName}
            </p>
          </div>

          {packageData.origin && (
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <MapPin className="h-3.5 w-3.5" />
                Origin
              </div>
              <p className="text-sm font-medium text-gray-900">
                {packageData.origin}
              </p>
            </div>
          )}

          {packageData.destination && (
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <MapPin className="h-3.5 w-3.5" />
                Destination
              </div>
              <p className="text-sm font-medium text-gray-900">
                {packageData.destination}
              </p>
            </div>
          )}

          {packageData.eta && (
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Calendar className="h-3.5 w-3.5" />
                Estimated Delivery
              </div>
              <p className="text-sm font-medium text-gray-900">
                {new Date(packageData.eta).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        {packageData.timeline && packageData.timeline.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-4">
              Tracking History
            </h2>
            <div className="space-y-4">
              {packageData.timeline.map((event, index) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        index === 0 ? "bg-blue-500" : "bg-gray-300"
                      }`}
                    />
                    {index !== packageData.timeline.length - 1 && (
                      <div className="w-px h-full bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {event.message}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>
                        {new Date(event.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span>
                        {new Date(event.timestamp).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      {event.location && (
                        <>
                          <span>•</span>
                          <span>{event.location}</span>
                        </>
                      )}
                    </div>
                    {event.details && (
                      <p className="text-xs text-gray-500 mt-1">{event.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            Shared via ParcelAI • Track your packages with ease
          </p>
        </div>
      </div>
    </div>
  );
}
