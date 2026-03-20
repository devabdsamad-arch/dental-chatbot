"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, MessageCircle } from "lucide-react";
import { useChatStore } from "@/hooks/useChatStore";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { EmergencyBanner } from "./EmergencyBanner";
import { ClientConfig } from "@/types";
import { cn } from "@/lib/utils";

interface ChatWidgetProps {
  config: ClientConfig;
}

export function ChatWidget({ config }: ChatWidgetProps) {
  const {
    isOpen, toggleChat, messages, isLoading,
    urgency, hasGreeted, setHasGreeted, addMessage,
  } = useChatStore();

  const { sendMessage } = useChat(config);
  const [input, setInput] = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Show notification dot after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen) setShowNotif(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  // Hide notif when opened
  useEffect(() => {
    if (isOpen) setShowNotif(false);
  }, [isOpen]);

  // Send greeting on first open
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setHasGreeted(true);
      setTimeout(() => {
        addMessage("assistant", config.greeting);
      }, 400);
    }
  }, [isOpen, hasGreeted]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ── NOTIFICATION DOT ─────────────────────── */}
      {showNotif && !isOpen && (
        <div
          className="fixed bottom-[86px] right-[26px] z-[10000] w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
        >
          1
        </div>
      )}

      {/* ── LAUNCHER BUTTON ──────────────────────── */}
      <button
        onClick={toggleChat}
        className="fixed bottom-7 right-7 z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl"
        style={{ backgroundColor: config.accentColor }}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        <div className="relative w-6 h-6">
          <MessageCircle
            className={cn(
              "absolute inset-0 text-white transition-all duration-200",
              isOpen ? "opacity-0 scale-75" : "opacity-100 scale-100"
            )}
          />
          <X
            className={cn(
              "absolute inset-0 text-white transition-all duration-200",
              isOpen ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}
          />
        </div>
      </button>

      {/* ── CHAT WINDOW ──────────────────────────── */}
      <div
        className={cn(
          "fixed bottom-[100px] right-7 z-[9998] w-[380px] max-w-[calc(100vw-32px)]",
          "bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden",
          "transition-all duration-300 origin-bottom-right",
          "max-h-[calc(100vh-130px)]",
          isOpen
            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
            : "opacity-0 scale-90 translate-y-4 pointer-events-none"
        )}
        style={{ height: "560px" }}
      >

        {/* ── HEADER ─────────────────────────────── */}
        <div
          className="flex-shrink-0 px-5 py-4"
          style={{ backgroundColor: config.accentColor }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                {config.avatar}
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">
                  {config.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/75 text-xs">Online now</span>
                </div>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* ── EMERGENCY BANNER ─────────────────────── */}
        {urgency === "emergency" && (
          <EmergencyBanner phone={config.phone} />
        )}

        {/* ── MESSAGES ───────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 scroll-smooth scrollbar-hide">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400 text-sm">Starting conversation...</p>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              accentColor={config.accentColor}
              onChipClick={() => {}}
            />
          ))}

          {isLoading && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* ── INPUT AREA ─────────────────────────── */}
        <div className="flex-shrink-0 px-4 pb-4 pt-3 border-t border-gray-100">
          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-2 border border-transparent focus-within:border-gray-200 focus-within:bg-white transition-all duration-150">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none resize-none max-h-20 py-1.5 leading-relaxed scrollbar-hide"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
              style={{ backgroundColor: config.accentColor }}
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          <p className="text-center text-[10px] text-gray-400 mt-2">
            Powered by <span className="font-medium">ChatFlow AI</span>
            {" · "}We never store personal health data
          </p>
        </div>

      </div>
    </>
  );
}