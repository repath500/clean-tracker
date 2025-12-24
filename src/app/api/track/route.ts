import { NextRequest, NextResponse } from "next/server";
import { scrapeTracking, probeAllCarriers, type ScraperResult } from "@/lib/scraper";
import { invalidateCacheForTracking } from "@/lib/cache";
import { detectCarrier } from "@/lib/carriers";
import { 
  getTrackingFromTrackingMore, 
  isTrackingMoreConfigured,
  type TrackingMoreResult 
} from "@/lib/trackingmore";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { trackingNumber, carrier, forceRefresh, useFallback } = await request.json();

    if (!trackingNumber) {
      return NextResponse.json(
        { error: "Tracking number is required" },
        { status: 400 }
      );
    }

    if (forceRefresh) {
      const detectedCarrier = carrier || detectCarrier(trackingNumber)?.id || "unknown";
      invalidateCacheForTracking(detectedCarrier, trackingNumber);
    }

    // If explicitly requesting fallback API, use TrackingMore directly
    if (useFallback && isTrackingMoreConfigured()) {
      const fallbackResult = await getTrackingFromTrackingMore(trackingNumber, carrier);
      return NextResponse.json({
        ...formatTrackingMoreResponse(fallbackResult),
        source: "trackingmore",
      });
    }

    // Try scraper first with detected/specified carrier
    const result = await scrapeTracking(trackingNumber, carrier);

    // If scraper succeeded, return the result
    if (result.success && result.events.length > 0) {
      return NextResponse.json({
        ...formatResponse(result),
        source: "scraper",
      });
    }

    // Step 2: Try probing ALL carriers in parallel
    console.log(`Initial scrape failed for ${trackingNumber}, probing all carriers...`);
    const probeResult = await probeAllCarriers(trackingNumber);
    
    if (probeResult.success && probeResult.events.length > 0) {
      return NextResponse.json({
        ...formatResponse(probeResult),
        source: "scraper-probe",
      });
    }

    // Step 3: Try TrackingMore API fallback
    if (isTrackingMoreConfigured()) {
      console.log(`All scrapers failed for ${trackingNumber}, trying TrackingMore API...`);
      
      const fallbackResult = await getTrackingFromTrackingMore(
        trackingNumber, 
        probeResult.carrier !== "unknown" ? probeResult.carrier : carrier
      );

      if (fallbackResult.success && fallbackResult.events.length > 0) {
        return NextResponse.json({
          ...formatTrackingMoreResponse(fallbackResult),
          source: "trackingmore",
        });
      }

      // All methods failed
      return NextResponse.json({
        ...formatResponse(probeResult),
        fallbackAttempted: true,
        fallbackError: fallbackResult.error,
        carrierTrackingUrl: probeResult.carrierTrackingUrl || fallbackResult.carrierTrackingUrl,
        message: "Could not retrieve tracking information from any source. The tracking number may be invalid or not yet in the system.",
      });
    }

    // No TrackingMore configured - return probe result
    return NextResponse.json({
      ...formatResponse(probeResult),
      fallbackAvailable: isTrackingMoreConfigured(),
      carrierTrackingUrl: probeResult.carrierTrackingUrl,
      message: probeResult.error || "Could not retrieve tracking information from any carrier.",
    });
  } catch (error) {
    console.error("Tracking API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracking information" },
      { status: 500 }
    );
  }
}

function formatResponse(result: ScraperResult) {
  return {
    trackingNumber: result.trackingNumber,
    carrier: result.carrier,
    carrierName: result.carrierName,
    carrierTrackingUrl: result.carrierTrackingUrl,
    status: result.status,
    statusMessage: result.statusMessage,
    eta: result.eta,
    deliveredAt: result.deliveredAt,
    origin: result.origin,
    destination: result.destination,
    currentLocation: result.currentLocation,
    cached: result.cached || false,
    timeline: result.events.map((event) => ({
      id: uuidv4(),
      timestamp: event.timestamp || new Date().toISOString(),
      status: event.status,
      message: event.description,
      location: event.location,
    })),
  };
}

function formatTrackingMoreResponse(result: TrackingMoreResult) {
  return {
    trackingNumber: result.trackingNumber,
    carrier: result.carrier,
    carrierName: result.carrierName,
    carrierTrackingUrl: result.carrierTrackingUrl || null,
    status: result.status,
    statusMessage: result.statusMessage,
    eta: result.eta,
    deliveredAt: result.deliveredAt,
    origin: result.origin,
    destination: result.destination,
    currentLocation: result.currentLocation,
    cached: false,
    timeline: result.events.map((event) => ({
      id: uuidv4(),
      timestamp: event.timestamp || new Date().toISOString(),
      status: event.status,
      message: event.description,
      location: event.location,
    })),
  };
}
