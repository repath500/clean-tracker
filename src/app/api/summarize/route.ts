import { NextRequest, NextResponse } from "next/server";
import { env, isOpenRouterConfigured } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const { packageData } = await request.json();

    if (!packageData) {
      return NextResponse.json(
        { error: "Package data is required" },
        { status: 400 }
      );
    }

    if (!isOpenRouterConfigured()) {
      // Generate fallback summary without AI
      const summary = generateFallbackSummary(packageData);
      return NextResponse.json({ summary, aiGenerated: false });
    }

    const recentEvents = packageData.timeline?.slice(0, 5) || [];
    const eventDescriptions = recentEvents
      .map((e: { message: string; timestamp: string }) => `- ${e.message}`)
      .join("\n");

    const prompt = `Based on this tracking history, give me a helpful, conversational insight about what's happening with my package. Be like a friendly expert explaining what the status means and what to expect next.

Package Info:
- Carrier: ${packageData.carrierName}
- From: ${packageData.origin || "Unknown"} → To: ${packageData.destination || "Unknown"}
- Current Status: ${packageData.status}

Recent Tracking Events (newest first):
${eventDescriptions || "No events yet"}

Give a brief 1-2 sentence insight that explains what's happening in plain English. Be conversational and helpful. Examples:
- "Great news! Customs charges are paid, so your package should be out for delivery within a few days!"
- "Your package just landed in Ireland and cleared customs - delivery is getting close!"
- "It's moving through the sorting facility - everything's on track for delivery soon."

Do NOT just repeat the status. Explain what it MEANS for the customer.`;

    const response = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": env.APP_URL,
        "X-Title": env.APP_NAME,
      },
      body: JSON.stringify({
        model: "mistralai/ministral-8b",
        messages: [
          { role: "system", content: "You are a friendly shipping expert who explains package tracking in simple, helpful terms. Be conversational and reassuring. Keep responses to 1-2 sentences." },
          { role: "user", content: prompt }
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const summary = generateFallbackSummary(packageData);
      return NextResponse.json({ summary, aiGenerated: false });
    }

    const data = await response.json();
    let summary = data.choices?.[0]?.message?.content?.trim() || generateFallbackSummary(packageData);
    
    // Remove surrounding quotes if present
    summary = summary.replace(/^["']|["']$/g, "").trim();

    return NextResponse.json({ summary, aiGenerated: true });
  } catch (error) {
    console.error("Summarize API error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

function generateFallbackSummary(packageData: {
  status: string;
  statusMessage?: string;
  carrierName?: string;
  destination?: string;
  eta?: string;
}): string {
  const status = packageData.status;
  const destination = packageData.destination;
  const eta = packageData.eta ? new Date(packageData.eta).toLocaleDateString() : null;

  switch (status) {
    case "delivered":
      return "Your package has been delivered! 📦✓";
    case "out_for_delivery":
      return `Out for delivery today${destination ? ` to ${destination}` : ""}. 🚚`;
    case "in_transit":
      return `In transit${destination ? ` to ${destination}` : ""}${eta ? `. ETA: ${eta}` : ""} 📦`;
    case "exception":
      return `Delivery exception - check details. ${packageData.statusMessage || ""}`;
    case "pending":
    case "info_received":
      return "Waiting for carrier pickup. Label created.";
    default:
      return packageData.statusMessage || "Tracking your package...";
  }
}
