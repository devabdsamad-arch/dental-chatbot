"use client";

import { Message } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: Message;
  accentColor: string;
  onChipClick: (text: string) => void;
}

export function MessageBubble({ message, accentColor }: MessageBubbleProps) {
  const isBot = message.role === "assistant";

  return (
    <div className={cn(
      "flex flex-col gap-1 max-w-[82%]",
      isBot ? "self-start" : "self-end"
    )}>
      <div
        className={cn(
          "px-4 py-3 rounded-2xl text-sm leading-relaxed",
          isBot
            ? "bg-gray-100 text-gray-900 rounded-bl-md"
            : "text-white rounded-br-md"
        )}
        style={!isBot ? { backgroundColor: accentColor } : {}}
      >
        {message.content.split("\n").map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>

      <span className={cn(
        "text-[10px] text-gray-400 px-1",
        isBot ? "text-left" : "text-right"
      )}>
        {format(message.timestamp, "h:mm a")}
      </span>
    </div>
  );
}