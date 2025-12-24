"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  HelpCircle,
  Package,
  MessageSquare,
  Languages,
  Search,
  Sparkles,
} from "lucide-react";

const FAQ_ITEMS = [
  {
    icon: Package,
    question: "How do I track a package?",
    answer: "Paste a tracking number (or a whole email!) into the box. We'll figure out the carrier automatically—UPS, FedEx, China Post, you name it.",
  },
  {
    icon: MessageSquare,
    question: "Can I ask questions?",
    answer: "Yep. Ask things like \"Where is my package?\" or \"Why is it stuck?\" and we'll analyze the tracking history to give you a plain English answer.",
  },
  {
    icon: Languages,
    question: "Chinese tracking updates?",
    answer: "Click 'Translate' on any package to make sense of them. Essential for orders from AliExpress, Temu, or Shein.",
  },
  {
    icon: Sparkles,
    question: "What are Smart Summaries?",
    answer: "We summarize complex tracking logs into one simple sentence, so you know exactly what's going on without decoding the jargon.",
  },
  {
    icon: Search,
    question: "Search & Organize",
    answer: "Hit ⌘K to find any package instantly. You can also filter by 'In Transit' or 'Delivered' on the left sidebar.",
  },
];

export function FAQModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-[var(--accent)]" />
            Tips & Tricks
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-2">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="flex gap-4 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 flex-shrink-0 mt-0.5 transition-colors group-hover:bg-[var(--accent)]/20">
                <item.icon className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-[var(--foreground)] leading-none pt-1.5 tracking-tight">
                  {item.question}
                </h3>
                <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed text-balance">
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
          
          <div className="pt-6 mt-2 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--foreground-tertiary)] text-center">
              Pro tip: Your data is stored locally on your device. <br/>
              We don&apos;t track you.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
