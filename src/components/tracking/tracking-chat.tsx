"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { usePackageStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn, generateId, formatRelativeTime } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import { Send, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface TrackingChatProps {
  packageId: string;
}

const QUICK_QUESTIONS = [
  "When will it arrive?",
  "Why was it delayed?",
  "Where is it now?",
  "What should I do?",
];

export function TrackingChat({ packageId }: TrackingChatProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { getPackageById, updatePackage } = usePackageStore();
  const pkg = getPackageById(packageId);
  
  const chatHistory = useMemo(() => pkg?.chatHistory || [], [pkg?.chatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !pkg) return;

    // Handle /clear command
    if (input.trim().toLowerCase() === "/clear") {
      updatePackage(packageId, { chatHistory: [] });
      setInput("");
      return;
    }

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    updatePackage(packageId, {
      chatHistory: [...chatHistory, userMessage],
    });

    setInput("");
    setIsLoading(true);

    try {
      // Call the chat API
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          packageData: {
            trackingNumber: pkg.trackingNumber,
            status: pkg.status,
            statusMessage: pkg.statusMessage,
            carrierName: pkg.carrierName,
            merchantName: pkg.merchantName,
            itemDescription: pkg.itemDescription,
            currentLocation: pkg.currentLocation,
            eta: pkg.eta,
            deliveredAt: pkg.deliveredAt,
            timeline: pkg.timeline,
          },
        }),
      });

      const data = await res.json();
      const aiResponse = data.response || "Sorry, I couldn't generate a response.";
      
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      updatePackage(packageId, {
        chatHistory: [...chatHistory, userMessage, assistantMessage],
      });
    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
      };
      updatePackage(packageId, {
        chatHistory: [...chatHistory, userMessage, errorMessage],
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => {
      inputRef.current?.form?.requestSubmit();
    }, 0);
  };

  // Generate auto-summary based on package status
  const getAutoSummary = () => {
    if (!pkg) return null;
    
    const status = pkg.status;
    const eta = pkg.eta ? new Date(pkg.eta).toLocaleDateString() : null;
    const lastEvent = pkg.timeline?.[pkg.timeline.length - 1];
    
    if (status === "delivered") {
      return `Delivered ${pkg.deliveredAt ? formatRelativeTime(pkg.deliveredAt) : "recently"}. Check your delivery location if not received.`;
    }
    if (status === "out_for_delivery") {
      return `Out for delivery today! Expected to arrive soon.`;
    }
    if (status === "in_transit" && eta) {
      return `In transit. Expected arrival: ${eta}. ${lastEvent?.message || ""}`;
    }
    if (status === "exception" || status === "failed") {
      return `Delivery issue detected. Contact ${pkg.carrierName} for assistance.`;
    }
    if (status === "pending" || status === "info_received") {
      return `Waiting for carrier pickup. Tracking will update once in transit.`;
    }
    return `Status: ${pkg.statusMessage || "Unknown"}. Ask a question for more details.`;
  };


  return (
    <div className="mt-4">
      {/* Auto Summary */}
      <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/10">
        <Sparkles className="h-4 w-4 text-[var(--accent)] mt-0.5 flex-shrink-0" />
        <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed">
          {getAutoSummary()}
        </p>
      </div>

      {/* Messages */}
      {chatHistory.length > 0 && (
        <div className="space-y-4 mb-6">
          {chatHistory.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                  message.role === "user"
                    ? "bg-[var(--accent)] text-white rounded-br-sm"
                    : "bg-[var(--background-secondary)] text-[var(--foreground)] border border-[var(--border)] rounded-bl-sm"
                )}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none text-[var(--foreground)] prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-headings:text-[var(--foreground)] prose-strong:text-[var(--foreground)]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-2">
                            <table className="min-w-full border-collapse text-xs">{children}</table>
                          </div>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-[var(--background-secondary)]">{children}</thead>
                        ),
                        th: ({ children }) => (
                          <th className="border border-[var(--border)] px-2 py-1.5 text-left font-medium text-[var(--foreground)]">{children}</th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-[var(--border)] px-2 py-1.5 text-[var(--foreground-secondary)]">{children}</td>
                        ),
                        tr: ({ children }) => (
                          <tr className="even:bg-[var(--background-secondary)]/50">{children}</tr>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className;
                          return isInline ? (
                            <code className="bg-[var(--background-secondary)] px-1 py-0.5 rounded text-xs text-[var(--accent)]">{children}</code>
                          ) : (
                            <code className="block bg-[var(--background-secondary)] p-2 rounded text-xs overflow-x-auto">{children}</code>
                          );
                        },
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-[var(--accent)] pl-3 my-2 text-[var(--foreground-secondary)] italic">{children}</blockquote>
                        ),
                        hr: () => <hr className="border-[var(--border)] my-3" />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
                <p
                  className={cn(
                    "text-xs mt-1",
                    message.role === "user"
                      ? "text-white/70"
                      : "text-[var(--foreground-tertiary)]"
                  )}
                >
                  {formatRelativeTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 text-sm text-[var(--foreground-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Quick questions when no chat history */}
      {chatHistory.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {QUICK_QUESTIONS.map((question) => (
            <button
              key={question}
              onClick={() => handleQuickQuestion(question)}
              className="px-4 py-2 text-xs font-medium rounded-full bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all duration-200 shadow-sm"
            >
              {question}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="sticky bottom-0 bg-[var(--background)] pt-2 pb-1">
        <div className="flex gap-2 items-center p-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-sm focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:border-[var(--accent)] transition-all duration-200">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question... (Type /clear to clear chat)"
            disabled={isLoading}
            className="flex-1 border-0 shadow-none focus-visible:ring-0 bg-transparent h-10 px-3"
            autoFocus
          />
          <Button 
            type="submit" 
            size="icon-sm" 
            disabled={!input.trim() || isLoading}
            className={cn(
              "h-8 w-8 rounded-lg transition-all duration-200",
              input.trim() ? "bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white" : "bg-[var(--background-secondary)] text-[var(--foreground-tertiary)]"
            )}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-[var(--foreground-tertiary)] text-center mt-2">
          AI can make mistakes. Check tracking details for accuracy.
        </p>
      </form>
    </div>
  );
}
