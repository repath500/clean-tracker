import type { TrackingStatus } from "./types";

export interface CarrierConfig {
  id: string;
  name: string;
  trackingUrlTemplate: string;
  trackingPatterns: RegExp[];
  parseStrategy: "json_embedded" | "html_timeline" | "api_json";
  jsonSelector?: string;
  timelineSelector?: string;
  eventSelectors?: {
    date?: string;
    time?: string;
    location?: string;
    description?: string;
    status?: string;
  };
  statusMappings?: Record<string, TrackingStatus>;
}

export const CARRIERS: CarrierConfig[] = [
  {
    id: "ups",
    name: "UPS",
    trackingUrlTemplate: "https://www.ups.com/track?loc=en_US&tracknum={TRACKING_NUMBER}",
    trackingPatterns: [/^1Z[A-Z0-9]{16}$/i],
    parseStrategy: "json_embedded",
    jsonSelector: "trackDetails",
  },
  {
    id: "fedex",
    name: "FedEx",
    trackingUrlTemplate: "https://www.fedex.com/fedextrack/?tracknumbers={TRACKING_NUMBER}",
    trackingPatterns: [
      /^\d{12}$/,
      /^\d{15}$/,
      /^\d{20}$/,
      /^\d{22}$/,
    ],
    parseStrategy: "json_embedded",
  },
  {
    id: "usps",
    name: "USPS",
    trackingUrlTemplate: "https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1={TRACKING_NUMBER}",
    trackingPatterns: [
      /^(94|93|92|95)\d{20,22}$/,
      /^[A-Z]{2}\d{9}US$/i,
    ],
    parseStrategy: "html_timeline",
    timelineSelector: ".track-bar-container",
  },
  {
    id: "dhl",
    name: "DHL Express",
    trackingUrlTemplate: "https://www.dhl.com/global-en/home/tracking/tracking-express.html?AWB={TRACKING_NUMBER}",
    trackingPatterns: [
      /^\d{10,11}$/,
      /^[A-Z]{3}\d{7}$/i,
    ],
    parseStrategy: "json_embedded",
  },
  {
    id: "anpost",
    name: "An Post",
    trackingUrlTemplate: "https://www.anpost.com/Post-Parcels/Track/History?item={TRACKING_NUMBER}",
    trackingPatterns: [
      /^[A-Z]{2}\d{9}[A-Z]{2}$/i, // International format like LZ346316415CN
      /^[A-Z]{2}\d{9}IE$/i, // Irish format
    ],
    parseStrategy: "html_timeline",
    timelineSelector: ".tracking-history, .track-history, table.tracking",
    eventSelectors: {
      date: ".date, td:first-child",
      location: ".location, td:nth-child(2)",
      description: ".status, .description, td:nth-child(3)",
    },
  },
  {
    id: "royalmail",
    name: "Royal Mail",
    trackingUrlTemplate: "https://www.royalmail.com/track-your-item?trackingNumber={TRACKING_NUMBER}",
    trackingPatterns: [
      /^[A-Z]{2}\d{9}GB$/i,
      /^[A-Z]{2}\d{9}[A-Z]{2}$/i,
    ],
    parseStrategy: "html_timeline",
  },
  {
    id: "dpd",
    name: "DPD",
    trackingUrlTemplate: "https://shipping.dpd.ie/tracking/?parcel={TRACKING_NUMBER}",
    trackingPatterns: [
      /^\d{14}$/,
      /^[A-Z0-9]{14,27}$/i,
    ],
    parseStrategy: "html_timeline",
  },
  {
    id: "postnl",
    name: "PostNL",
    trackingUrlTemplate: "https://www.postnl.nl/en/receiving/parcels/track-and-trace/?tracktrace={TRACKING_NUMBER}",
    trackingPatterns: [
      /^[A-Z]{2}\d{9}NL$/i,
      /^3S[A-Z0-9]{15,18}$/i,
    ],
    parseStrategy: "json_embedded",
  },
  {
    id: "canadapost",
    name: "Canada Post",
    trackingUrlTemplate: "https://www.canadapost-postescanada.ca/track-reperage/en?search={TRACKING_NUMBER}",
    trackingPatterns: [
      /^\d{16}$/,
      /^[A-Z]{2}\d{9}CA$/i,
    ],
    parseStrategy: "html_timeline",
  },
  {
    id: "gls",
    name: "GLS",
    trackingUrlTemplate: "https://gls-group.com/IE/en/parcel-tracking?match={TRACKING_NUMBER}",
    trackingPatterns: [
      /^[A-Z0-9]{11,14}$/i,
    ],
    parseStrategy: "html_timeline",
  },
  {
    id: "auspost",
    name: "Australia Post",
    trackingUrlTemplate: "https://auspost.com.au/mypost/track/#/details/{TRACKING_NUMBER}",
    trackingPatterns: [
      /^[A-Z]{2}\d{9}AU$/i,
      /^\d{13,22}$/,
    ],
    parseStrategy: "json_embedded",
  },
  {
    id: "amazon",
    name: "Amazon Logistics",
    trackingUrlTemplate: "https://track.amazon.com/tracking/{TRACKING_NUMBER}",
    trackingPatterns: [
      /^TBA\d{12,}$/i,
    ],
    parseStrategy: "json_embedded",
  },
];

export function detectCarrier(trackingNumber: string): CarrierConfig | null {
  const normalized = trackingNumber.trim().toUpperCase().replace(/\s+/g, "");
  
  for (const carrier of CARRIERS) {
    for (const pattern of carrier.trackingPatterns) {
      if (pattern.test(normalized)) {
        return carrier;
      }
    }
  }
  
  return null;
}

export function getCarrierById(carrierId: string): CarrierConfig | null {
  return CARRIERS.find(c => c.id === carrierId) || null;
}

export function buildTrackingUrl(carrier: CarrierConfig, trackingNumber: string): string {
  return carrier.trackingUrlTemplate.replace("{TRACKING_NUMBER}", encodeURIComponent(trackingNumber));
}

export function getAllCarrierIds(): string[] {
  return CARRIERS.map(c => c.id);
}

export const STATUS_KEYWORDS: Record<string, TrackingStatus> = {
  // Delivered
  "delivered": "delivered",
  "zugestellt": "delivered",
  "livré": "delivered",
  "entregado": "delivered",
  "consegnato": "delivered",
  "bezorgd": "delivered",
  "доставлено": "delivered",
  "signed": "delivered",
  "collected": "delivered",
  
  // Out for delivery
  "out for delivery": "out_for_delivery",
  "on vehicle": "out_for_delivery",
  "with driver": "out_for_delivery",
  "in zustellung": "out_for_delivery",
  "en cours de livraison": "out_for_delivery",
  
  // In transit
  "in transit": "in_transit",
  "departed": "in_transit",
  "arrived": "in_transit",
  "processed": "in_transit",
  "in bewegung": "in_transit",
  "en route": "in_transit",
  "shipping": "in_transit",
  "left": "in_transit",
  "received at": "in_transit",
  "accepted": "in_transit",
  "dispatched": "in_transit",
  "forwarded": "in_transit",
  "sorted": "in_transit",
  "hub": "in_transit",
  "facility": "in_transit",
  "customs": "in_transit",
  "export": "in_transit",
  "import": "in_transit",
  
  // Info received
  "label created": "info_received",
  "shipment information": "info_received",
  "electronic notification": "info_received",
  "pre-shipment": "info_received",
  "order received": "info_received",
  "picked up": "info_received",
  
  // Exception
  "exception": "exception",
  "held": "exception",
  "delayed": "exception",
  "delivery attempted": "exception",
  "attempted": "exception",
  "returned": "exception",
  "undeliverable": "exception",
  "addressee unknown": "exception",
  "refused": "exception",
  "incorrect address": "exception",
  "not home": "exception",
  "customs hold": "exception",
  
  // Failed
  "failed": "failed",
  "cancelled": "failed",
  "lost": "failed",
};

export function inferStatusFromText(text: string): TrackingStatus {
  const lower = text.toLowerCase();
  
  for (const [keyword, status] of Object.entries(STATUS_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return status;
    }
  }
  
  return "unknown";
}
