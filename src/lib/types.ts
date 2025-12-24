export type TrackingStatus = 
  | "pending"
  | "info_received"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "exception"
  | "failed"
  | "expired"
  | "unknown";

export interface TimelineEvent {
  id: string;
  timestamp: string;
  status: TrackingStatus;
  message: string;
  location?: string;
  details?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface TrackingPackage {
  id: string;
  trackingNumber: string;
  carrier: string;
  carrierName: string;
  
  nickname?: string; // User-defined name for the parcel
  merchantName?: string;
  itemDescription?: string;
  orderNumber?: string;
  
  status: TrackingStatus;
  statusMessage: string;
  
  eta?: string;
  deliveredAt?: string;
  
  origin?: string;
  destination?: string;
  currentLocation?: string;
  
  timeline: TimelineEvent[];
  chatHistory: ChatMessage[];
  
  tags: string[];
  isArchived: boolean;
  
  rawInput?: string;
  
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  defaultView: "compact" | "expanded";
  notificationsEnabled: boolean;
  notifyOnExceptionsOnly: boolean;
  emailAlertsEnabled: boolean;
}

export interface AppState {
  packages: TrackingPackage[];
  selectedPackageIds: string[];
  searchQuery: string;
  statusFilter: TrackingStatus | "all";
  carrierFilter: string | "all";
  tagFilter: string | "all";
  isCommandPaletteOpen: boolean;
  isSidebarOpen: boolean;
  preferences: UserPreferences;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  defaultView: "compact",
  notificationsEnabled: false,
  notifyOnExceptionsOnly: true,
  emailAlertsEnabled: false,
};

export const STATUS_CONFIG: Record<TrackingStatus, { label: string; color: string; bgClass: string }> = {
  pending: { label: "Pending", color: "#8B5CF6", bgClass: "status-pending" },
  info_received: { label: "Info Received", color: "#8B5CF6", bgClass: "status-pending" },
  in_transit: { label: "In Transit", color: "#3B82F6", bgClass: "status-transit" },
  out_for_delivery: { label: "Out for Delivery", color: "#3B82F6", bgClass: "status-transit" },
  delivered: { label: "Delivered", color: "#10B981", bgClass: "status-delivered" },
  exception: { label: "Exception", color: "#F59E0B", bgClass: "status-delayed" },
  failed: { label: "Failed", color: "#EF4444", bgClass: "status-failed" },
  expired: { label: "Expired", color: "#999999", bgClass: "bg-gray-100" },
  unknown: { label: "Unknown", color: "#999999", bgClass: "bg-gray-100" },
};

export const CARRIER_NAMES: Record<string, string> = {
  ups: "UPS",
  fedex: "FedEx",
  usps: "USPS",
  dhl: "DHL Express",
  amazon: "Amazon Logistics",
  anpost: "An Post",
  royalmail: "Royal Mail",
  dpd: "DPD",
  postnl: "PostNL",
  canadapost: "Canada Post",
  gls: "GLS",
  auspost: "Australia Post",
  ontrac: "OnTrac",
  lasership: "LaserShip",
  unknown: "Unknown Carrier",
};
