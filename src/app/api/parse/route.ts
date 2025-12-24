import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // In production, this would use OpenAI to parse the email
    // For now, use regex-based parsing
    const parsed = parseEmailContent(content);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Parse API error:", error);
    return NextResponse.json(
      { error: "Failed to parse content" },
      { status: 500 }
    );
  }
}

function parseEmailContent(content: string) {
  const trackingPatterns = [
    { carrier: "ups", pattern: /1Z[A-Z0-9]{16}/gi },
    { carrier: "fedex", pattern: /\b(\d{12}|\d{15}|\d{20}|\d{22})\b/g },
    { carrier: "usps", pattern: /\b(94|93|92|95)\d{20,22}\b/g },
    { carrier: "usps", pattern: /\b[A-Z]{2}\d{9}US\b/gi },
    { carrier: "amazon", pattern: /TBA\d{12,}/gi },
    { carrier: "dhl", pattern: /\b\d{10,11}\b/g },
    { carrier: "anpost", pattern: /\b[A-Z]{2}\d{9}(IE|CN|GB|DE|FR|NL)\b/gi },
    { carrier: "royalmail", pattern: /\b[A-Z]{2}\d{9}GB\b/gi },
    { carrier: "postnl", pattern: /\b(3S[A-Z0-9]{15,18}|[A-Z]{2}\d{9}NL)\b/gi },
    { carrier: "canadapost", pattern: /\b(\d{16}|[A-Z]{2}\d{9}CA)\b/gi },
    { carrier: "auspost", pattern: /\b[A-Z]{2}\d{9}AU\b/gi },
    { carrier: "dpd", pattern: /\b\d{14}\b/g },
  ];

  const trackingNumbers: Array<{ number: string; carrier: string }> = [];

  for (const { carrier, pattern } of trackingPatterns) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach((match) => {
        if (!trackingNumbers.some((t) => t.number === match)) {
          trackingNumbers.push({ number: match, carrier });
        }
      });
    }
  }

  // Extract merchant name from common patterns
  const merchantPatterns = [
    /(?:from|by|order from)\s+([A-Za-z0-9\s]+?)(?:\.|,|!|\n)/i,
    /([A-Za-z]+)\s+(?:order|shipment|delivery)/i,
    /shipped\s+(?:by|from|via)\s+([A-Za-z0-9\s]+)/i,
  ];

  let merchantName: string | null = null;
  for (const pattern of merchantPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      merchantName = match[1].trim();
      break;
    }
  }

  // Extract order number
  const orderPattern = /(?:order|confirmation|reference)\s*(?:#|number|:)?\s*([A-Z0-9-]+)/i;
  const orderMatch = content.match(orderPattern);
  const orderNumber = orderMatch ? orderMatch[1] : null;

  // Extract item description
  const itemPatterns = [
    /(?:item|product|ordered):\s*(.+?)(?:\n|$)/i,
    /shipping\s+(.+?)(?:\n|$)/i,
  ];

  let itemDescription: string | null = null;
  for (const pattern of itemPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      itemDescription = match[1].trim().slice(0, 100);
      break;
    }
  }

  return {
    trackingNumbers,
    merchantName,
    orderNumber,
    itemDescription,
    rawContent: content.slice(0, 500),
  };
}
