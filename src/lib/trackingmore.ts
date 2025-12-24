import type { TrackingStatus } from "./types";

const TRACKINGMORE_API_URL = "https://api.trackingmore.com/v4";

export interface TrackingMoreEvent {
  checkpoint_date: string;
  tracking_detail: string;
  location: string;
  checkpoint_delivery_status: string;
  checkpoint_delivery_substatus: string;
  country_iso2: string | null;
  state: string | null;
  city: string | null;
  zip: string | null;
}

export interface TrackingMoreResponse {
  id: string;
  tracking_number: string;
  courier_code: string;
  delivery_status: string;
  origin_country: string | null;
  origin_city: string | null;
  destination_country: string | null;
  destination_city: string | null;
  latest_event: string;
  latest_checkpoint_time: string;
  transit_time: number;
  scheduled_delivery_date: string | null;
  origin_info: {
    courier_code: string | null;
    weblink: string | null;
    trackinfo: TrackingMoreEvent[];
    milestone_date?: {
      delivery_date?: string | null;
      pickup_date?: string | null;
      outfordelivery_date?: string | null;
    };
  };
  destination_info: {
    trackinfo: TrackingMoreEvent[];
  };
}

export interface TrackingMoreResult {
  success: boolean;
  carrier: string;
  carrierName: string;
  trackingNumber: string;
  status: TrackingStatus;
  statusMessage: string;
  eta: string | null;
  deliveredAt: string | null;
  origin: string | null;
  destination: string | null;
  currentLocation: string | null;
  events: Array<{
    timestamp: string | null;
    location: string | null;
    description: string;
    status: TrackingStatus;
  }>;
  error?: string;
  carrierTrackingUrl?: string | null;
}

const STATUS_MAP: Record<string, TrackingStatus> = {
  pending: "pending",
  notfound: "pending",
  inforeceived: "info_received",
  transit: "in_transit",
  pickup: "out_for_delivery",
  delivered: "delivered",
  undelivered: "exception",
  exception: "exception",
  expired: "expired",
};

function mapStatus(trackingMoreStatus: string): TrackingStatus {
  return STATUS_MAP[trackingMoreStatus.toLowerCase()] || "unknown";
}

function getApiKey(): string {
  return process.env.TRACKINGMORE_API_KEY || "";
}

export function isTrackingMoreConfigured(): boolean {
  const key = getApiKey();
  return Boolean(key && key !== "your-trackingmore-api-key");
}

export async function detectCourierCode(trackingNumber: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const response = await fetch(`${TRACKINGMORE_API_URL}/couriers/detect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Tracking-Api-Key": apiKey,
      },
      body: JSON.stringify({ tracking_number: trackingNumber }),
    });

    if (!response.ok) {
      console.error("TrackingMore detect API error:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.meta?.code === 200 && data.data?.length > 0) {
      return data.data[0].courier_code;
    }

    return null;
  } catch (error) {
    console.error("TrackingMore detect error:", error);
    return null;
  }
}

export async function createAndGetTracking(
  trackingNumber: string,
  courierCodeHint?: string
): Promise<TrackingMoreResult> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return {
      success: false,
      carrier: "unknown",
      carrierName: "Unknown",
      trackingNumber,
      status: "unknown",
      statusMessage: "TrackingMore API not configured",
      eta: null,
      deliveredAt: null,
      origin: null,
      destination: null,
      currentLocation: null,
      events: [],
      error: "TrackingMore API key not configured",
    };
  }

  // ALWAYS use TrackingMore's detect API - they have better carrier detection
  let courier: string | null = await detectCourierCode(trackingNumber);
  
  if (!courier) {
    // Fallback to hint if detect fails
    courier = courierCodeHint || null;
    if (!courier) {
      return {
        success: false,
        carrier: "unknown",
        carrierName: "Unknown",
        trackingNumber,
        status: "unknown",
        statusMessage: "Could not detect carrier",
        eta: null,
        deliveredAt: null,
        origin: null,
        destination: null,
        currentLocation: null,
        events: [],
        error: "Could not detect carrier for this tracking number",
      };
    }
  }

  try {
    const createResponse = await fetch(`${TRACKINGMORE_API_URL}/trackings/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Tracking-Api-Key": apiKey,
      },
      body: JSON.stringify({
        tracking_number: trackingNumber,
        courier_code: courier,
      }),
    });

    const createData = await createResponse.json();

    if (createData.meta?.code === 4101) {
      // Tracking already exists, fetch it
    } else if (createData.meta?.code !== 200) {
      console.error("TrackingMore create error:", createData);
    }

    const getResponse = await fetch(
      `${TRACKINGMORE_API_URL}/trackings/get?tracking_numbers=${encodeURIComponent(trackingNumber)}&courier_code=${courier}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Tracking-Api-Key": apiKey,
        },
      }
    );

    if (!getResponse.ok) {
      return {
        success: false,
        carrier: courier,
        carrierName: courier.toUpperCase(),
        trackingNumber,
        status: "unknown",
        statusMessage: `API error: ${getResponse.status}`,
        eta: null,
        deliveredAt: null,
        origin: null,
        destination: null,
        currentLocation: null,
        events: [],
        error: `TrackingMore API error: ${getResponse.status}`,
      };
    }

    const getData = await getResponse.json();

    if (getData.meta?.code !== 200 || !getData.data?.length) {
      return {
        success: false,
        carrier: courier,
        carrierName: courier.toUpperCase(),
        trackingNumber,
        status: "pending",
        statusMessage: "Tracking created, awaiting updates",
        eta: null,
        deliveredAt: null,
        origin: null,
        destination: null,
        currentLocation: null,
        events: [],
        error: "No tracking data available yet - check back later",
      };
    }

    const tracking = getData.data[0] as TrackingMoreResponse;
    return normalizeTrackingMoreResponse(tracking);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      carrier: courier || "unknown",
      carrierName: courier?.toUpperCase() || "Unknown",
      trackingNumber,
      status: "unknown",
      statusMessage: "Failed to fetch tracking",
      eta: null,
      deliveredAt: null,
      origin: null,
      destination: null,
      currentLocation: null,
      events: [],
      error: errorMessage,
    };
  }
}

function normalizeTrackingMoreResponse(tracking: TrackingMoreResponse): TrackingMoreResult {
  const status = mapStatus(tracking.delivery_status);
  
  const allEvents: TrackingMoreEvent[] = [
    ...(tracking.origin_info?.trackinfo || []),
    ...(tracking.destination_info?.trackinfo || []),
  ];

  allEvents.sort((a, b) => {
    const dateA = new Date(a.checkpoint_date).getTime();
    const dateB = new Date(b.checkpoint_date).getTime();
    return dateB - dateA;
  });

  const events = allEvents.map((event) => ({
    timestamp: event.checkpoint_date,
    location: [event.city, event.state, event.zip].filter(Boolean).join(", ") || event.location || null,
    description: event.tracking_detail,
    status: mapStatus(event.checkpoint_delivery_status),
  }));

  const latestEvent = events[0];
  
  let deliveredAt: string | null = null;
  if (status === "delivered") {
    deliveredAt = tracking.origin_info?.milestone_date?.delivery_date || latestEvent?.timestamp || null;
  }

  const origin = [tracking.origin_city, tracking.origin_country].filter(Boolean).join(", ") || null;
  const destination = [tracking.destination_city, tracking.destination_country].filter(Boolean).join(", ") || null;

  return {
    success: events.length > 0,
    carrier: tracking.courier_code,
    carrierName: tracking.courier_code.toUpperCase(),
    trackingNumber: tracking.tracking_number,
    status,
    statusMessage: tracking.latest_event || latestEvent?.description || "No status available",
    eta: tracking.scheduled_delivery_date,
    deliveredAt,
    origin,
    destination,
    currentLocation: latestEvent?.location || null,
    events,
    carrierTrackingUrl: tracking.origin_info?.weblink || undefined,
  };
}

export async function getTrackingFromTrackingMore(
  trackingNumber: string,
  courierCode?: string
): Promise<TrackingMoreResult> {
  return createAndGetTracking(trackingNumber, courierCode);
}
