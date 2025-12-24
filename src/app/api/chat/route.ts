import { NextRequest, NextResponse } from "next/server";
import { env, isOpenRouterConfigured } from "@/lib/env";

interface PackageData {
  status?: string;
  deliveredAt?: string;
  eta?: string;
  carrierName?: string;
  currentLocation?: string;
  statusMessage?: string;
  trackingNumber?: string;
  merchantName?: string;
  itemDescription?: string;
  origin?: string;
  destination?: string;
  timeline?: Array<{ location?: string; message?: string; timestamp?: string }>;
}

// Detect tracking numbers in user message
function extractTrackingNumber(message: string): string | null {
  const patterns = [
    /\b1Z[A-Z0-9]{16}\b/i, // UPS
    /\b\d{12,22}\b/, // FedEx, USPS numeric
    /\b(94|93|92|95)\d{20,22}\b/, // USPS
    /\bTBA\d{12,}\b/i, // Amazon
    /\b[A-Z]{2}\d{9}[A-Z]{2}\b/i, // International (China Post, etc)
    /\b[A-Z]{2}\d{9}(US|GB|CN|IE|AU|CA|NL)\b/i, // Country-specific
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[0];
  }
  return null;
}

// Fetch tracking data if tracking number found
async function fetchTrackingData(trackingNumber: string): Promise<PackageData | null> {
  try {
    const baseUrl = env.APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber }),
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.error("Failed to fetch tracking for chat:", err);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { message, packageData: providedPackageData } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Check if user included a tracking number in their question
    let packageData = providedPackageData;
    const extractedTracking = extractTrackingNumber(message);
    
    if (extractedTracking && (!packageData || !packageData.trackingNumber)) {
      console.log(`Detected tracking number in question: ${extractedTracking}`);
      const fetchedData = await fetchTrackingData(extractedTracking);
      if (fetchedData) {
        packageData = fetchedData;
      }
    }

    // Use OpenRouter if configured, otherwise use fallback
    if (isOpenRouterConfigured()) {
      const response = await callOpenRouter(message, packageData);
      return NextResponse.json({ response });
    } else {
      // Fallback to local response generation
      const response = generateFallbackResponse(message, packageData);
      return NextResponse.json({ response });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}

async function callOpenRouter(message: string, packageData: PackageData): Promise<string> {
  // Check if we have package context or this is a general question
  const hasPackageContext = packageData && (packageData.trackingNumber || packageData.status);
  
  let systemPrompt: string;
  
  if (hasPackageContext) {
    // Package-specific question
    systemPrompt = `You are ParcelAI, a helpful friend who explains shipping updates.
    
    CONTEXT:
    Tracking: ${packageData.trackingNumber || "Unknown"}
    Status: ${packageData.status || "Unknown"} - ${packageData.statusMessage || ""}
    Carrier: ${packageData.carrierName || "Unknown"}
    Route: ${packageData.origin || "?"} → ${packageData.destination || "?"}
    ETA: ${packageData.eta ? new Date(packageData.eta).toLocaleDateString() : "Not set"}
    
    Recent events (newest first):
    ${packageData.timeline?.slice(0, 5).map(e => `- ${e.message}${e.location ? ` at ${e.location}` : ""}`).join("\n") || "No events yet"}

    INSTRUCTIONS:
    - Answer the user's question directly and simply.
    - Avoid shipping jargon. Use plain English (e.g., instead of "customs clearance completed", say "It made it through customs!").
    - Be brief. 1-2 short paragraphs max.
    - If the status is good (moving, delivered), sound positive.
    - If there's a delay, be reassuring but honest.
    - Do not list all events unless asked.
    - Do not use markdown headers (###). Just use bold text for emphasis.
    - Focus on "What does this mean for me?" and "When will I get it?".`;
  } else {
    // General shipping/logistics question
    systemPrompt = `You are ParcelAI, a helpful shipping expert.
    
    INSTRUCTIONS:
    - Explain shipping concepts in simple, everyday language.
    - Avoid technical jargon.
    - Keep answers short and practical.
    - Use bold text for key points.
    - Be friendly and direct.`;
  }

  const response = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": env.APP_URL,
      "X-Title": env.APP_NAME,
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("OpenRouter API error:", errorData);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";
}

function generateFallbackResponse(message: string, packageData: PackageData): string {
  const msg = message.toLowerCase();

  if (msg.includes("when") || msg.includes("arrive") || msg.includes("eta")) {
    if (packageData?.status === "delivered") {
      return `Your package was delivered ${packageData.deliveredAt ? `on ${new Date(packageData.deliveredAt).toLocaleDateString()}` : "recently"}.`;
    }
    if (packageData?.eta) {
      return `Expected arrival: **${new Date(packageData.eta).toLocaleDateString()}**. This estimate may change based on carrier conditions.`;
    }
    return `No delivery estimate available yet. Check back once the package is in transit.`;
  }

  if (msg.includes("where") || msg.includes("location")) {
    if (packageData?.currentLocation) {
      return `Current location: **${packageData.currentLocation}**`;
    }
    return `Location information not available. Status: ${packageData?.statusMessage || "Unknown"}`;
  }

  if (msg.includes("status") || msg.includes("update")) {
    return `**Status**: ${packageData?.statusMessage || packageData?.status || "Unknown"}\n**Carrier**: ${packageData?.carrierName || "Unknown"}`;
  }

  return `Package ${packageData?.trackingNumber || ""} is currently: ${packageData?.statusMessage || packageData?.status || "Unknown"}. Ask me about delivery time, location, or any concerns!`;
}
