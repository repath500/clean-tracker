"use client";

import { useState, useRef, useCallback } from "react";
import { usePackageStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { generateId, detectCarrier, extractTrackingNumbers } from "@/lib/utils";
import { CARRIER_NAMES, type TrackingPackage, type TrackingStatus } from "@/lib/types";
import { ArrowRight, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function isLikelyQuestion(input: string): boolean {
  const trimmed = input.trim().toLowerCase();
  
  // Check for question indicators
  const questionStarters = [
    "what", "why", "how", "when", "where", "who", "which", "can", "could", 
    "would", "should", "is", "are", "does", "do", "will", "tell me", "explain",
    "help", "i need", "i want", "please", "?"
  ];
  
  // If it ends with a question mark, it's likely a question
  if (trimmed.endsWith("?")) return true;
  
  // If it starts with common question words
  for (const starter of questionStarters) {
    if (trimmed.startsWith(starter + " ") || trimmed.startsWith(starter + ",")) {
      return true;
    }
  }
  
  // If it contains multiple spaces and words (likely a sentence, not a tracking number)
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount >= 4) {
    // Check if it looks like a tracking number (alphanumeric, no spaces in middle)
    const noSpaces = trimmed.replace(/\s+/g, "");
    if (!/^[A-Z0-9]{8,35}$/i.test(noSpaces)) {
      return true;
    }
  }
  
  return false;
}

export function TrackingInput() {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiMode, setIsAiMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addPackage, getPackageByTrackingNumber, updatePackage } = usePackageStore();

  const askAI = useCallback(async (question: string) => {
    setIsProcessing(true);
    setError(null);
    setAiResponse(null);
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: question,
          packageData: {} // General question, no package context
        }),
      });
      
      if (!response.ok) throw new Error("Failed to get AI response");
      
      const data = await response.json();
      setAiResponse(data.response);
      setIsAiMode(true);
    } catch (err) {
      setError("Failed to get AI response. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const processInput = useCallback(async (rawInput: string) => {
    if (!rawInput.trim()) return;
    
    // Handle /clear command
    if (rawInput.trim().toLowerCase() === "/clear") {
      setAiResponse(null);
      setIsAiMode(false);
      setInput("");
      setError(null);
      return;
    }
    
    // Check if this is a question for AI
    if (isLikelyQuestion(rawInput)) {
      await askAI(rawInput);
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setAiResponse(null);
    setIsAiMode(false);

    try {
      const trackingNumbers = extractTrackingNumbers(rawInput);
      
      if (trackingNumbers.length === 0) {
        const trimmed = rawInput.trim().replace(/\s+/g, "");
        if (trimmed.length >= 8 && trimmed.length <= 40 && /^[A-Z0-9]+$/i.test(trimmed)) {
          trackingNumbers.push(trimmed);
        }
      }

      if (trackingNumbers.length === 0) {
        // Maybe it's a question after all
        if (rawInput.trim().length > 15) {
          await askAI(rawInput);
          return;
        }
        setError("No valid tracking numbers found. Try pasting a tracking number or ask a question.");
        setIsProcessing(false);
        return;
      }

      for (const trackingNumber of trackingNumbers) {
        const normalizedNumber = trackingNumber.toUpperCase();
        
        // Check if package already exists
        const existingPackage = getPackageByTrackingNumber(normalizedNumber);
        
        const carrier = detectCarrier(trackingNumber) || existingPackage?.carrier || "unknown";
        const carrierName = CARRIER_NAMES[carrier] || "Unknown Carrier";

        // Fetch tracking info from API
        let trackingData = null;
        try {
          const response = await fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trackingNumber, carrier, forceRefresh: !!existingPackage }),
          });
          if (response.ok) {
            trackingData = await response.json();
          }
        } catch (e) {
          console.error("Failed to fetch tracking:", e);
        }

        // If package exists, update it instead of creating new
        if (existingPackage) {
          updatePackage(existingPackage.id, {
            carrier: trackingData?.carrier || carrier,
            carrierName: trackingData?.carrierName || carrierName,
            status: (trackingData?.status || existingPackage.status) as TrackingStatus,
            statusMessage: trackingData?.statusMessage || existingPackage.statusMessage,
            eta: trackingData?.eta || existingPackage.eta,
            deliveredAt: trackingData?.deliveredAt || existingPackage.deliveredAt,
            origin: trackingData?.origin || existingPackage.origin,
            destination: trackingData?.destination || existingPackage.destination,
            currentLocation: trackingData?.currentLocation || existingPackage.currentLocation,
            timeline: trackingData?.timeline?.length > 0 
              ? trackingData.timeline 
              : existingPackage.timeline,
          });
          continue; // Skip creating new package
        }

        const newPackage: TrackingPackage = {
          id: generateId(),
          trackingNumber: normalizedNumber,
          carrier: trackingData?.carrier || carrier,
          carrierName: trackingData?.carrierName || carrierName,
          status: (trackingData?.status || "pending") as TrackingStatus,
          statusMessage: trackingData?.statusMessage || "Waiting for carrier update",
          eta: trackingData?.eta,
          deliveredAt: trackingData?.deliveredAt,
          origin: trackingData?.origin,
          destination: trackingData?.destination,
          currentLocation: trackingData?.currentLocation,
          timeline: trackingData?.timeline?.length > 0 
            ? trackingData.timeline 
            : [{
                id: generateId(),
                timestamp: new Date().toISOString(),
                status: "info_received",
                message: "Tracking information received",
              }],
          chatHistory: [],
          tags: [],
          isArchived: false,
          rawInput,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        addPackage(newPackage);
      }

      setInput("");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [addPackage, askAI]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processInput(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      processInput(input);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text");
    if (pastedText.includes("\n") || pastedText.length > 100) {
      e.preventDefault();
      setInput(pastedText);
      setTimeout(() => processInput(pastedText), 100);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Paste tracking number, email, link, or question... (Type /clear to reset)"
          className="min-h-[60px] pr-24 text-base resize-none"
          disabled={isProcessing}
          autoFocus
        />
        
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <AnimatePresence>
            {input.trim() && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Button
                  type="submit"
                  size="sm"
                  disabled={isProcessing}
                  className="gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Track
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 text-sm text-[var(--status-failed)]"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aiResponse && isAiMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
          >
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-[var(--foreground-secondary)]">
              <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
              AI Response
            </div>
            <div className="text-sm text-[var(--foreground)] prose prose-sm prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-2 prose-strong:text-[var(--foreground)]">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-2">
                      <table className="min-w-full border-collapse text-xs">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-[var(--background)]">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="border border-[var(--border)] px-2 py-1.5 text-left font-medium text-[var(--foreground)]">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-[var(--border)] px-2 py-1.5 text-[var(--foreground-secondary)]">{children}</td>
                  ),
                  tr: ({ children }) => (
                    <tr className="even:bg-[var(--background)]/50">{children}</tr>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-[var(--background)] px-1 py-0.5 rounded text-xs text-[var(--accent)]">{children}</code>
                    ) : (
                      <code className="block bg-[var(--background)] p-2 rounded text-xs overflow-x-auto">{children}</code>
                    );
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-[var(--accent)] pl-3 my-2 text-[var(--foreground-secondary)] italic">{children}</blockquote>
                  ),
                  hr: () => <hr className="border-[var(--border)] my-3" />,
                }}
              >
                {aiResponse}
              </ReactMarkdown>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAiResponse(null);
                setIsAiMode(false);
                setInput("");
              }}
              className="mt-3 text-xs"
            >
              Clear
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex items-center gap-2 text-xs text-[var(--foreground-tertiary)]">
        <Sparkles className="h-3 w-3" />
        <span>Track packages or ask questions about shipping, tariffs, customs & more</span>
      </div>
    </form>
  );
}
