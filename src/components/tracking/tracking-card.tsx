"use client";

import { useState, useEffect } from "react";
import { usePackageStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn, formatRelativeTime, copyToClipboard } from "@/lib/utils";
import { STATUS_CONFIG, CARRIER_NAMES, type TrackingPackage, type TrackingStatus } from "@/lib/types";
import {
  ChevronDown,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Archive,
  Trash2,
  Tag,
  Share2,
  MessageSquare,
  RefreshCw,
  Check,
  MapPin,
  Calendar,
  Truck,
  Loader2,
  Pencil,
  Languages,
} from "lucide-react";
import { motion } from "framer-motion";
import { TrackingTimeline } from "./tracking-timeline";
import { TrackingChat } from "./tracking-chat";

interface TrackingCardProps {
  package_: TrackingPackage;
}

export function TrackingCard({ package_: pkg }: TrackingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isEditingCarrier, setIsEditingCarrier] = useState(false);
  const [carrierInput, setCarrierInput] = useState(pkg.carrier);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(pkg.nickname || "");
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const { archivePackage, deletePackage, updatePackage, selectedIds } = usePackageStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch AI summary on mount
  useEffect(() => {
    if (mounted && !aiSummary && !isLoadingSummary && pkg.timeline?.length > 0) {
      console.log("Fetching AI summary for", pkg.trackingNumber);
      fetchSummary();
    }
  }, [mounted, pkg.id, pkg.timeline?.length, pkg.statusMessage, pkg.eta]);

  const fetchSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageData: pkg }),
      });
      console.log("Summarize response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("AI Summary received:", data.summary);
        setAiSummary(data.summary);
      } else {
        console.error("Summarize failed:", await response.text());
      }
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const getFallbackSummary = () => {
    const eta = pkg.eta ? new Date(pkg.eta).toLocaleDateString() : null;
    switch (pkg.status) {
      case "delivered":
        return "Delivered ✅";
      case "out_for_delivery":
        return "Out for delivery today.";
      case "in_transit":
        return `In transit${pkg.destination ? ` to ${pkg.destination}` : ""}${eta ? `. ETA: ${eta}` : ""}`;
      case "exception":
      case "failed":
        return `Delivery issue. ${pkg.statusMessage || "Check details."}`;
      case "pending":
      case "info_received":
        return "Waiting for carrier pickup.";
      default:
        return pkg.statusMessage || "Tracking in progress.";
    }
  };

  const handleTranslate = async () => {
    if (isTranslated) {
      // Revert to original - keep all properties
      const originalTimeline = pkg.timeline.map((e) => {
        const { originalMessage, ...rest } = e as typeof e & { originalMessage?: string };
        return {
          ...rest,
          message: originalMessage || e.message,
        };
      });
      // Revert origin/destination if we have originals stored
      const updates: Partial<typeof pkg> = { timeline: originalTimeline };
      if ((pkg as typeof pkg & { originalOrigin?: string }).originalOrigin) {
        updates.origin = (pkg as typeof pkg & { originalOrigin?: string }).originalOrigin;
      }
      if ((pkg as typeof pkg & { originalDestination?: string }).originalDestination) {
        updates.destination = (pkg as typeof pkg & { originalDestination?: string }).originalDestination;
      }
      updatePackage(pkg.id, updates);
      setIsTranslated(false);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          events: pkg.timeline,
          origin: pkg.origin,
          destination: pkg.destination,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Translate response:", data);
        if (data.events) {
          // Force a new array reference to trigger re-render
          const newTimeline = data.events.map((e: typeof pkg.timeline[0] & { originalMessage?: string }) => ({ ...e }));
          console.log("Updating timeline with:", newTimeline);
          const updates: Record<string, unknown> = { timeline: newTimeline };
          
          // Update origin/destination if translated
          if (data.origin && data.origin !== pkg.origin) {
            updates.originalOrigin = pkg.origin;
            updates.origin = data.origin;
          }
          if (data.destination && data.destination !== pkg.destination) {
            updates.originalDestination = pkg.destination;
            updates.destination = data.destination;
          }
          
          updatePackage(pkg.id, updates);
          setIsTranslated(true);
        } else {
          console.log("Translation returned but no changes:", data);
        }
      } else {
        console.error("Translate API failed:", response.status);
      }
    } catch (err) {
      console.error("Failed to translate:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const isSelected = selectedIds.includes(pkg.id);
  const statusConfig = STATUS_CONFIG[pkg.status] || STATUS_CONFIG.unknown;

  const handleCopy = async () => {
    await copyToClipboard(pkg.trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageData: pkg }),
      });

      if (!response.ok) {
        throw new Error("Failed to create share link");
      }

      const { shareId } = await response.json();
      const shareUrl = `${window.location.origin}/track/share/${shareId}`;
      
      setShareLink(shareUrl);
      await copyToClipboard(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to share:", err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          trackingNumber: pkg.trackingNumber, 
          carrier: pkg.carrier,
          forceRefresh: true 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        updatePackage(pkg.id, {
          carrier: data.carrier || pkg.carrier,
          carrierName: data.carrierName || pkg.carrierName,
          status: data.status as TrackingStatus,
          statusMessage: data.statusMessage,
          eta: data.eta,
          deliveredAt: data.deliveredAt,
          origin: data.origin,
          destination: data.destination,
          currentLocation: data.currentLocation,
          timeline: data.timeline?.length > 0 ? data.timeline : pkg.timeline,
          lastCheckedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Failed to refresh tracking:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCarrierSave = () => {
    const normalizedCarrier = carrierInput.toLowerCase().replace(/\s+/g, "-");
    const carrierName = CARRIER_NAMES[normalizedCarrier] || carrierInput;
    updatePackage(pkg.id, {
      carrier: normalizedCarrier,
      carrierName: carrierName,
    });
    setIsEditingCarrier(false);
  };

  const getStatusBadgeVariant = () => {
    switch (pkg.status) {
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

  const getCarrierUrl = () => {
    const trackNum = pkg.trackingNumber;
    
    // Check destination country for better URL selection
    const destCountry = pkg.destination?.toLowerCase() || "";
    const isIreland = destCountry.includes("ie") || destCountry.includes("ireland") || destCountry.includes("爱尔兰");
    const isUK = destCountry.includes("gb") || destCountry.includes("uk") || destCountry.includes("united kingdom");
    
    // Carrier-specific URLs
    const carrierUrls: Record<string, string> = {
      ups: `https://www.ups.com/track?loc=en_US&tracknum=${trackNum}`,
      fedex: `https://www.fedex.com/fedextrack/?tracknumbers=${trackNum}`,
      usps: `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackNum}`,
      dhl: `https://www.dhl.com/global-en/home/tracking/tracking-express.html?AWB=${trackNum}`,
      amazon: `https://track.amazon.com/tracking/${trackNum}`,
      "china-post": `https://www.anpost.com/Post-Parcels/Track/History?item=${trackNum}`,
      "china-ems": `https://www.anpost.com/Post-Parcels/Track/History?item=${trackNum}`,
      anpost: `https://www.anpost.com/Post-Parcels/Track/History?item=${trackNum}`,
      royalmail: `https://www.royalmail.com/track-your-item?trackingNumber=${trackNum}`,
      dpd: `https://shipping.dpd.ie/tracking/?parcel=${trackNum}`,
      postnl: `https://www.postnl.nl/en/receiving/parcels/track-and-trace/?tracktrace=${trackNum}`,
      canadapost: `https://www.canadapost-postescanada.ca/track-reperage/en?search=${trackNum}`,
      gls: `https://gls-group.com/IE/en/parcel-tracking?match=${trackNum}`,
      auspost: `https://auspost.com.au/mypost/track/#/details/${trackNum}`,
    };

    // If we have a specific carrier URL, use it
    if (carrierUrls[pkg.carrier]) {
      return carrierUrls[pkg.carrier];
    }

    // For international shipments to Ireland, try An Post
    if (isIreland && trackNum.match(/^[A-Z]{2}\d{9}[A-Z]{2}$/i)) {
      return `https://www.anpost.com/Post-Parcels/Track/History?item=${trackNum}`;
    }

    // For UK, try Royal Mail
    if (isUK && trackNum.match(/^[A-Z]{2}\d{9}[A-Z]{2}$/i)) {
      return `https://www.royalmail.com/track-your-item?trackingNumber=${trackNum}`;
    }

    // Fallback to 17track which supports many carriers
    return `https://t.17track.net/en#nums=${trackNum}`;
  };

  const getCarrierDisplayName = () => {
    // For China Post shipments to Ireland, show "An Post" as the destination carrier
    const destCountry = pkg.destination?.toLowerCase() || "";
    const isIreland = destCountry.includes("ie") || destCountry.includes("ireland") || destCountry.includes("爱尔兰");
    
    if ((pkg.carrier === "china-post" || pkg.carrier === "china-ems") && isIreland) {
      return "An Post";
    }
    return pkg.carrierName;
  };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "group rounded-xl border border-[var(--border)] bg-[var(--background)] transition-all duration-200 hover:border-[var(--border-hover)] hover:shadow-md",
        isSelected && "ring-2 ring-[var(--accent)] border-[var(--accent)] shadow-none"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex cursor-pointer items-center gap-4 p-5">
            {/* Status indicator */}
            <div className="relative flex items-center justify-center">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full ring-2 ring-[var(--background)]",
                  pkg.status === "delivered" && "bg-[var(--status-delivered)]",
                  (pkg.status === "in_transit" || pkg.status === "out_for_delivery") && "bg-[var(--status-transit)]",
                  (pkg.status === "exception" || pkg.status === "failed") && "bg-[var(--status-failed)]",
                  (pkg.status === "pending" || pkg.status === "info_received") && "bg-[var(--status-pending)]"
                )}
              />
              {/* Pulse effect for active statuses */}
              {(pkg.status === "in_transit" || pkg.status === "out_for_delivery") && (
                <div className="absolute h-4 w-4 rounded-full bg-[var(--status-transit)] opacity-20 animate-ping" />
              )}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex items-center gap-2.5">
                <h3 className="font-semibold text-base text-[var(--foreground)] truncate tracking-tight">
                  {pkg.nickname || pkg.merchantName || pkg.carrierName}
                </h3>
                {(pkg.nickname ? (pkg.merchantName || pkg.carrierName) : pkg.itemDescription) && (
                  <span className="text-sm text-[var(--foreground-tertiary)] truncate hidden sm:inline border-l border-[var(--border)] pl-2.5">
                    {pkg.nickname ? (pkg.merchantName || pkg.carrierName) : pkg.itemDescription}
                  </span>
                )}
              </div>
              {/* AI Summary or Status */}
              <div className="mt-1.5">
                {aiSummary ? (
                  <p className="text-sm text-[var(--foreground-secondary)] line-clamp-1 font-medium">
                    {aiSummary}
                  </p>
                ) : isLoadingSummary ? (
                  <span className="text-sm text-[var(--foreground-tertiary)] flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Generating summary...
                  </span>
                ) : (
                  <p className="text-sm text-[var(--foreground-secondary)] line-clamp-1 font-medium">
                    {getFallbackSummary()}
                  </p>
                )}
              </div>
            </div>

            {/* Tags */}
            {pkg.tags.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5">
                {pkg.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs font-normal bg-[var(--background-secondary)] text-[var(--foreground-secondary)] hover:bg-[var(--background-hover)]">
                    {tag}
                  </Badge>
                ))}
                {pkg.tags.length > 2 && (
                  <Badge variant="secondary" className="text-xs font-normal bg-[var(--background-secondary)] text-[var(--foreground-secondary)] hover:bg-[var(--background-hover)]">
                    +{pkg.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {/* Status badge */}
            <Badge variant={getStatusBadgeVariant()} className="hidden sm:flex shadow-none font-medium">
              {statusConfig.label}
            </Badge>

            {/* Expand arrow */}
            <ChevronDown
              className={cn(
                "h-5 w-5 text-[var(--foreground-tertiary)] transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-[var(--border)]">
            {/* AI Summary Banner */}
            <div className="p-4 bg-gradient-to-r from-[var(--accent)]/10 to-transparent border-b border-[var(--border)]">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent)]/20">
                  <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--accent)] mb-1">AI Summary</p>
                  {aiSummary ? (
                    <p className="text-sm text-[var(--foreground)]">{aiSummary}</p>
                  ) : isLoadingSummary ? (
                    <span className="text-sm text-[var(--foreground-secondary)] flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing your package...
                    </span>
                  ) : (
                    <p className="text-sm text-[var(--foreground)]">{getFallbackSummary()}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Details section */}
            <div className="p-4 space-y-4">
              {/* Tracking number and actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 rounded bg-[var(--background-secondary)] font-mono text-sm">
                    {pkg.trackingNumber}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-[var(--status-delivered)]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const willShow = !showChat;
                      setShowChat(willShow);
                      if (willShow) {
                        setTimeout(() => {
                          const element = document.getElementById(`chat-section-${pkg.id}`);
                          if (element) {
                            element.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }, 100);
                      }
                    }}
                    className="gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Ask AI
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleTranslate}
                    disabled={isTranslating}
                    className="gap-2"
                  >
                    {isTranslating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Languages className="h-4 w-4" />
                    )}
                    {isTranslated ? "Show Original" : "Translate"}
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                  >
                    <a href={getCarrierUrl()} target="_blank" rel="noopener noreferrer" className="gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Track on {getCarrierDisplayName()}
                    </a>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCopy}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy tracking number
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setIsEditingNickname(true);
                        setNicknameInput(pkg.nickname || "");
                      }}>
                        <Tag className="mr-2 h-4 w-4" />
                        Rename parcel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsEditingCarrier(true)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit carrier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
                        <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
                        {isRefreshing ? "Refreshing..." : "Refresh status"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => archivePackage(pkg.id)}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => deletePackage(pkg.id)}
                        className="text-[var(--status-failed)]"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Share Link Display */}
              {shareLink && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
                  <Share2 className="h-4 w-4 text-[var(--accent)]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--accent)] mb-1">Shareable Link</p>
                    <code className="text-xs text-[var(--foreground-secondary)] break-all">
                      {shareLink}
                    </code>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={async () => {
                      await copyToClipboard(shareLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-[var(--status-delivered)]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShareLink(null)}
                  >
                    ×
                  </Button>
                </div>
              )}

              {/* Nickname editing */}
              {isEditingNickname && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]">
                  <Tag className="h-4 w-4 text-[var(--foreground-tertiary)]" />
                  <Input
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updatePackage(pkg.id, { nickname: nicknameInput.trim() || undefined });
                        setIsEditingNickname(false);
                      }
                      if (e.key === "Escape") {
                        setNicknameInput(pkg.nickname || "");
                        setIsEditingNickname(false);
                      }
                    }}
                    className="flex-1 h-8"
                    autoFocus
                    placeholder="Give this parcel a name..."
                  />
                  <Button 
                    size="sm" 
                    onClick={() => {
                      updatePackage(pkg.id, { nickname: nicknameInput.trim() || undefined });
                      setIsEditingNickname(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setNicknameInput(pkg.nickname || "");
                      setIsEditingNickname(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[var(--foreground-tertiary)]">
                    <Truck className="h-3 w-3" />
                    Carrier
                  </div>
                  {isEditingCarrier ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={carrierInput}
                        onChange={(e) => setCarrierInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCarrierSave();
                          if (e.key === "Escape") {
                            setCarrierInput(pkg.carrier);
                            setIsEditingCarrier(false);
                          }
                        }}
                        className="h-7 text-sm w-28"
                        autoFocus
                        placeholder="e.g. ups, fedex"
                      />
                      <Button size="icon-sm" variant="ghost" onClick={handleCarrierSave}>
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingCarrier(true)}
                      className="text-sm font-medium text-left hover:text-[var(--accent)] flex items-center gap-1 group"
                    >
                      {pkg.carrierName}
                      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50" />
                    </button>
                  )}
                </div>
                {pkg.origin && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[var(--foreground-tertiary)]">
                      <MapPin className="h-3 w-3" />
                      Origin
                    </div>
                    <p className="text-sm font-medium">{pkg.origin}</p>
                  </div>
                )}
                {pkg.destination && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[var(--foreground-tertiary)]">
                      <MapPin className="h-3 w-3" />
                      Destination
                    </div>
                    <p className="text-sm font-medium">{pkg.destination}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[var(--foreground-tertiary)]">
                    <Calendar className="h-3 w-3" />
                    Added
                  </div>
                  <p className="text-sm font-medium">{formatRelativeTime(pkg.createdAt)}</p>
                </div>
              </div>

              {/* Timeline */}
              <TrackingTimeline events={pkg.timeline} />

              {/* AI Chat */}
              {showChat && (
                <div id={`chat-section-${pkg.id}`}>
                  <TrackingChat packageId={pkg.id} />
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}
