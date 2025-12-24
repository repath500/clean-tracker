import * as cheerio from "cheerio";
import type { TrackingStatus } from "./types";
import {
  type CarrierConfig,
  CARRIERS,
  detectCarrier,
  getCarrierById,
  buildTrackingUrl,
  inferStatusFromText,
} from "./carriers";
import {
  getCacheKey,
  getFromCache,
  setInCache,
} from "./cache";

export interface ScrapedEvent {
  timestamp: string | null;
  location: string | null;
  description: string;
  status: TrackingStatus;
}

export interface ScraperResult {
  success: boolean;
  blocked: boolean;
  carrier: string;
  carrierName: string;
  carrierTrackingUrl: string;
  trackingNumber: string;
  status: TrackingStatus;
  statusMessage: string;
  eta: string | null;
  deliveredAt: string | null;
  origin: string | null;
  destination: string | null;
  currentLocation: string | null;
  events: ScrapedEvent[];
  error?: string;
  cached?: boolean;
}

const BOT_DETECTION_PATTERNS = [
  "verify you are human",
  "captcha",
  "challenge-running",
  "cf-browser-verification",
  "attention required",
  "access denied",
  "please enable javascript",
  "just a moment",
  "checking your browser",
  "ddos protection",
  "security check",
  "bot detection",
  "are you a robot",
  "prove you're human",
  "human verification",
  "cloudflare",
  "incapsula",
  "distil networks",
  "perimeterx",
  "datadome",
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function isBlocked(html: string): boolean {
  const lower = html.toLowerCase();
  return BOT_DETECTION_PATTERNS.some(pattern => lower.includes(pattern));
}

function extractEmbeddedJson(html: string): Record<string, unknown> | null {
  const patterns = [
    /<script[^>]*>.*?window\.__INITIAL_STATE__\s*=\s*({.*?});?\s*<\/script>/is,
    /<script[^>]*>.*?window\.__STATE__\s*=\s*({.*?});?\s*<\/script>/is,
    /<script[^>]*>.*?window\.__PRELOADED_STATE__\s*=\s*({.*?});?\s*<\/script>/is,
    /<script[^>]*>.*?window\.trackingData\s*=\s*({.*?});?\s*<\/script>/is,
    /<script[^>]*>.*?var\s+trackDetails\s*=\s*({.*?});?\s*<\/script>/is,
    /<script[^>]*type="application\/json"[^>]*>({.*?})<\/script>/is,
    /<script[^>]*id="__NEXT_DATA__"[^>]*>({.*?})<\/script>/is,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch {
        continue;
      }
    }
  }

  return null;
}

function parseHtmlTimeline($: cheerio.CheerioAPI, carrier: CarrierConfig): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  
  const timelineSelectors = [
    carrier.timelineSelector,
    ".tracking-history tr",
    ".tracking-events .event",
    ".timeline-event",
    ".track-history-row",
    ".shipment-progress-step",
    "table.tracking tbody tr",
    ".tracking-result .event",
    "[data-tracking-event]",
    ".parcel-tracking-event",
  ].filter(Boolean);

  for (const selector of timelineSelectors) {
    const elements = $(selector!);
    if (elements.length > 0) {
      elements.each((_, el) => {
        const $el = $(el);
        
        let date = "";
        let time = "";
        let location = "";
        let description = "";

        if (carrier.eventSelectors) {
          if (carrier.eventSelectors.date) {
            date = $el.find(carrier.eventSelectors.date).text().trim();
          }
          if (carrier.eventSelectors.time) {
            time = $el.find(carrier.eventSelectors.time).text().trim();
          }
          if (carrier.eventSelectors.location) {
            location = $el.find(carrier.eventSelectors.location).text().trim();
          }
          if (carrier.eventSelectors.description) {
            description = $el.find(carrier.eventSelectors.description).text().trim();
          }
        }

        if (!description) {
          const descSelectors = [
            ".description", ".status", ".event-description",
            ".message", "td:last-child", ".details",
          ];
          for (const sel of descSelectors) {
            const text = $el.find(sel).text().trim();
            if (text) {
              description = text;
              break;
            }
          }
        }

        if (!description) {
          description = $el.text().replace(/\s+/g, " ").trim();
        }

        if (!location) {
          const locSelectors = [".location", "td:nth-child(2)", ".place"];
          for (const sel of locSelectors) {
            const text = $el.find(sel).text().trim();
            if (text && text !== description) {
              location = text;
              break;
            }
          }
        }

        if (!date) {
          const dateSelectors = [".date", "td:first-child", ".time", ".timestamp"];
          for (const sel of dateSelectors) {
            const text = $el.find(sel).text().trim();
            if (text) {
              date = text;
              break;
            }
          }
        }

        if (description) {
          const timestamp = parseTimestamp(date, time);
          events.push({
            timestamp,
            location: location || null,
            description,
            status: inferStatusFromText(description),
          });
        }
      });

      if (events.length > 0) break;
    }
  }

  return events;
}

function parseTimestamp(date: string, time?: string): string | null {
  if (!date) return null;

  const combined = time ? `${date} ${time}` : date;
  
  const formats = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/,
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})\s*(\d{1,2}):(\d{2})/i,
    /(\d{1,2})\s+(\w+)\s+(\d{4})\s*(\d{1,2}):(\d{2})/i,
  ];

  for (const format of formats) {
    if (format.test(combined)) {
      try {
        const parsed = new Date(combined);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      } catch {
        continue;
      }
    }
  }

  try {
    const parsed = new Date(combined);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch {
    // ignore
  }

  return null;
}

function extractStatusFromEvents(events: ScrapedEvent[]): {
  status: TrackingStatus;
  statusMessage: string;
  deliveredAt: string | null;
} {
  if (events.length === 0) {
    return { status: "unknown", statusMessage: "No tracking information available", deliveredAt: null };
  }

  const latestEvent = events[0];
  const status = latestEvent.status;
  
  return {
    status,
    statusMessage: latestEvent.description,
    deliveredAt: status === "delivered" ? latestEvent.timestamp : null,
  };
}

function extractFromJson(
  json: Record<string, unknown>,
  carrier: CarrierConfig
): { events: ScrapedEvent[]; eta: string | null } {
  const events: ScrapedEvent[] = [];
  let eta: string | null = null;

  const findEvents = (obj: unknown, depth = 0): unknown[] => {
    if (depth > 10) return [];
    if (Array.isArray(obj)) {
      const hasEventLikeItems = obj.some(
        item => typeof item === "object" && item !== null &&
        (("description" in item) || ("status" in item) || ("message" in item) || ("event" in item))
      );
      if (hasEventLikeItems) return obj;
      
      for (const item of obj) {
        const result = findEvents(item, depth + 1);
        if (result.length > 0) return result;
      }
    }
    if (typeof obj === "object" && obj !== null) {
      const keys = ["events", "trackEvents", "shipmentEvents", "history", "timeline", "activities", "scans"];
      for (const key of keys) {
        if (key in obj) {
          const val = (obj as Record<string, unknown>)[key];
          if (Array.isArray(val)) return val;
        }
      }
      for (const val of Object.values(obj)) {
        const result = findEvents(val, depth + 1);
        if (result.length > 0) return result;
      }
    }
    return [];
  };

  const rawEvents = findEvents(json);
  
  for (const raw of rawEvents) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    
    const description = String(
      r.description || r.status || r.message || r.event || r.eventDescription || ""
    );
    
    if (!description) continue;

    const timestamp = r.timestamp || r.date || r.dateTime || r.time || r.eventTime || null;
    const location = r.location || r.city || r.address || null;

    events.push({
      timestamp: timestamp ? parseTimestamp(String(timestamp)) : null,
      location: location ? String(location) : null,
      description,
      status: inferStatusFromText(description),
    });
  }

  const findEta = (obj: unknown, depth = 0): string | null => {
    if (depth > 5) return null;
    if (typeof obj === "object" && obj !== null) {
      const keys = ["estimatedDelivery", "eta", "expectedDelivery", "deliveryDate", "scheduledDelivery"];
      for (const key of keys) {
        if (key in obj) {
          const val = (obj as Record<string, unknown>)[key];
          if (val && typeof val === "string") {
            return parseTimestamp(val);
          }
        }
      }
      for (const val of Object.values(obj)) {
        const result = findEta(val, depth + 1);
        if (result) return result;
      }
    }
    return null;
  };

  eta = findEta(json);

  return { events, eta };
}

export async function scrapeTracking(
  trackingNumber: string,
  carrierIdHint?: string
): Promise<ScraperResult> {
  const normalized = trackingNumber.trim().toUpperCase().replace(/\s+/g, "");
  
  let carrier: CarrierConfig | null = null;
  
  if (carrierIdHint) {
    carrier = getCarrierById(carrierIdHint);
  }
  
  if (!carrier) {
    carrier = detectCarrier(normalized);
  }

  if (!carrier) {
    return {
      success: false,
      blocked: false,
      carrier: "unknown",
      carrierName: "Unknown Carrier",
      carrierTrackingUrl: "",
      trackingNumber: normalized,
      status: "unknown",
      statusMessage: "Could not detect carrier from tracking number",
      eta: null,
      deliveredAt: null,
      origin: null,
      destination: null,
      currentLocation: null,
      events: [],
      error: "Unknown carrier - please specify carrier manually",
    };
  }

  const trackingUrl = buildTrackingUrl(carrier, normalized);
  const cacheKey = getCacheKey(carrier.id, normalized);

  const cached = getFromCache<ScraperResult>(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(trackingUrl, {
      method: "GET",
      headers: {
        "User-Agent": getRandomUserAgent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        blocked: false,
        carrier: carrier.id,
        carrierName: carrier.name,
        carrierTrackingUrl: trackingUrl,
        trackingNumber: normalized,
        status: "unknown",
        statusMessage: `HTTP error: ${response.status}`,
        eta: null,
        deliveredAt: null,
        origin: null,
        destination: null,
        currentLocation: null,
        events: [],
        error: `Failed to fetch tracking page (HTTP ${response.status})`,
      };
    }

    const html = await response.text();

    if (isBlocked(html)) {
      return {
        success: false,
        blocked: true,
        carrier: carrier.id,
        carrierName: carrier.name,
        carrierTrackingUrl: trackingUrl,
        trackingNumber: normalized,
        status: "unknown",
        statusMessage: "Carrier requires human verification",
        eta: null,
        deliveredAt: null,
        origin: null,
        destination: null,
        currentLocation: null,
        events: [],
        error: "Bot detection triggered - please open carrier tracking page directly",
      };
    }

    let events: ScrapedEvent[] = [];
    let eta: string | null = null;

    if (carrier.parseStrategy === "json_embedded") {
      const json = extractEmbeddedJson(html);
      if (json) {
        const extracted = extractFromJson(json, carrier);
        events = extracted.events;
        eta = extracted.eta;
      }
    }

    if (events.length === 0) {
      const $ = cheerio.load(html);
      events = parseHtmlTimeline($, carrier);
    }

    const { status, statusMessage, deliveredAt } = extractStatusFromEvents(events);

    const result: ScraperResult = {
      success: events.length > 0,
      blocked: false,
      carrier: carrier.id,
      carrierName: carrier.name,
      carrierTrackingUrl: trackingUrl,
      trackingNumber: normalized,
      status,
      statusMessage,
      eta,
      deliveredAt,
      origin: null,
      destination: null,
      currentLocation: events[0]?.location || null,
      events,
    };

    if (result.success) {
      setInCache(cacheKey, result, status);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return {
      success: false,
      blocked: false,
      carrier: carrier.id,
      carrierName: carrier.name,
      carrierTrackingUrl: trackingUrl,
      trackingNumber: normalized,
      status: "unknown",
      statusMessage: "Failed to fetch tracking information",
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

export async function scrapeMultiple(
  trackingNumbers: Array<{ trackingNumber: string; carrier?: string }>
): Promise<ScraperResult[]> {
  const results = await Promise.allSettled(
    trackingNumbers.map(({ trackingNumber, carrier }) =>
      scrapeTracking(trackingNumber, carrier)
    )
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      success: false,
      blocked: false,
      carrier: "unknown",
      carrierName: "Unknown",
      carrierTrackingUrl: "",
      trackingNumber: trackingNumbers[index].trackingNumber,
      status: "unknown" as TrackingStatus,
      statusMessage: "Failed to scrape",
      eta: null,
      deliveredAt: null,
      origin: null,
      destination: null,
      currentLocation: null,
      events: [],
      error: result.reason?.message || "Unknown error",
    };
  });
}

export async function probeAllCarriers(trackingNumber: string): Promise<ScraperResult> {
  const normalized = trackingNumber.trim().toUpperCase().replace(/\s+/g, "");
  
  // Try detected carrier first if any
  const detectedCarrier = detectCarrier(normalized);
  if (detectedCarrier) {
    const result = await scrapeTracking(normalized, detectedCarrier.id);
    if (result.success && result.events.length > 0) {
      return result;
    }
  }

  // Probe all carriers in parallel
  const carriersToProbe = CARRIERS.filter((c: CarrierConfig) => c.id !== detectedCarrier?.id);
  
  const probeResults = await Promise.allSettled(
    carriersToProbe.map(async (carrier: CarrierConfig) => {
      const url = buildTrackingUrl(carrier, normalized);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
          signal: controller.signal,
          redirect: "follow",
        });

        clearTimeout(timeout);

        if (!response.ok) return null;

        const html = await response.text();
        
        // Check for bot detection
        const lower = html.toLowerCase();
        const blocked = ["captcha", "verify you are human", "challenge-running", "cloudflare"].some(p => lower.includes(p));
        if (blocked) return null;

        // Try to parse
        const $ = cheerio.load(html);
        const events = parseHtmlTimeline($, carrier);
        
        if (events.length === 0) {
          // Try JSON extraction
          const json = extractEmbeddedJson(html);
          if (json) {
            const extracted = extractFromJson(json, carrier);
            if (extracted.events.length > 0) {
              return { carrier, events: extracted.events, eta: extracted.eta, html };
            }
          }
          return null;
        }

        return { carrier, events, eta: null, html };
      } catch {
        return null;
      }
    })
  );

  // Find first successful result
  for (const result of probeResults) {
    if (result.status === "fulfilled" && result.value && result.value.events.length > 0) {
      const { carrier, events, eta } = result.value;
      const { status, statusMessage, deliveredAt } = extractStatusFromEvents(events);
      
      return {
        success: true,
        blocked: false,
        carrier: carrier.id,
        carrierName: carrier.name,
        carrierTrackingUrl: buildTrackingUrl(carrier, normalized),
        trackingNumber: normalized,
        status,
        statusMessage,
        eta,
        deliveredAt,
        origin: null,
        destination: null,
        currentLocation: events[0]?.location || null,
        events,
      };
    }
  }

  // All probes failed
  return {
    success: false,
    blocked: false,
    carrier: detectedCarrier?.id || "unknown",
    carrierName: detectedCarrier?.name || "Unknown Carrier",
    carrierTrackingUrl: detectedCarrier ? buildTrackingUrl(detectedCarrier, normalized) : "",
    trackingNumber: normalized,
    status: "unknown",
    statusMessage: "Could not find tracking information from any carrier",
    eta: null,
    deliveredAt: null,
    origin: null,
    destination: null,
    currentLocation: null,
    events: [],
    error: "No carrier returned tracking data for this number",
  };
}
