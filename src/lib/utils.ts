import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function detectCarrier(trackingNumber: string): string | null {
  const patterns: Record<string, RegExp> = {
    ups: /^1Z[A-Z0-9]{16}$/i,
    fedex: /^(\d{12}|\d{15}|\d{20}|\d{22})$/,
    usps: /^(94|93|92|94|95)\d{20,22}$/,
    dhl: /^\d{10,11}$/,
    amazon: /^TBA\d{12,}$/i,
  };

  const normalized = trackingNumber.replace(/\s/g, "").toUpperCase();
  
  for (const [carrier, pattern] of Object.entries(patterns)) {
    if (pattern.test(normalized)) {
      return carrier;
    }
  }
  
  return null;
}

export function extractTrackingNumbers(text: string): string[] {
  const patterns = [
    /1Z[A-Z0-9]{16}/gi,
    /\b\d{12}\b/g,
    /\b\d{15}\b/g,
    /\b\d{20,22}\b/g,
    /TBA\d{12,}/gi,
    /\b(94|93|92|95)\d{20,22}\b/g,
  ];

  const matches: string[] = [];
  for (const pattern of patterns) {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  }

  return [...new Set(matches)];
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
