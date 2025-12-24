import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

const shareStore = new Map<string, {
  packageData: {
    trackingNumber?: string;
    carrier?: string;
    carrierName?: string;
    status?: string;
    statusMessage?: string;
    timeline?: Array<{
      id: string;
      timestamp: string;
      status: string;
      message: string;
      location?: string;
    }>;
    [key: string]: unknown;
  };
  createdAt: string;
}>();

export async function POST(request: NextRequest) {
  try {
    const { packageData } = await request.json();

    if (!packageData) {
      return NextResponse.json(
        { error: "Package data is required" },
        { status: 400 }
      );
    }

    const shareId = nanoid(10);
    
    shareStore.set(shareId, {
      packageData,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ shareId });
  } catch (error) {
    console.error("Share creation error:", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const shareId = searchParams.get("id");

    if (!shareId) {
      return NextResponse.json(
        { error: "Share ID is required" },
        { status: 400 }
      );
    }

    const shareData = shareStore.get(shareId);

    if (!shareData) {
      return NextResponse.json(
        { error: "Share not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(shareData);
  } catch (error) {
    console.error("Share retrieval error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve share" },
      { status: 500 }
    );
  }
}
