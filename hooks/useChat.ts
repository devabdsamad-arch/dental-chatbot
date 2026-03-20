"use client";

import { useCallback, useRef } from "react";
import { useChatStore } from "./useChatStore";
import { ClientConfig } from "@/types";
import { v4 as uuidv4 } from "uuid";

export function useChat(config: ClientConfig) {
  const {
    messages,
    lead,
    offeredSlots,
    addMessage,
    setLoading,
    updateLead,
    setUrgency,
    setOfferedSlots,
  } = useChatStore();

  const sessionId = useRef<string>(uuidv4());

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim()) return;

      addMessage("user", userText);
      setLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId:     config.id,
            sessionId:    sessionId.current,
            offeredSlots, // persisted in Zustand — survives re-renders
            messages: [
              ...messages.map((m) => ({
                role:    m.role,
                content: m.content,
              })),
              { role: "user", content: userText },
            ],
          }),
        });

        if (!res.ok) throw new Error("API call failed");

        const data = await res.json();

        if (data.urgency)      setUrgency(data.urgency);

        // Store slots in Zustand — persists across all future calls
        if (data.offeredSlots && data.offeredSlots.length > 0) {
          setOfferedSlots(data.offeredSlots);
        }

        addMessage("assistant", data.reply);

        // Local UX tracking only
        const lastBotMsg = messages
          .filter((m) => m.role === "assistant")
          .at(-1)?.content ?? "";

        const isNameRequest = /your name|name to hold|name please/i.test(lastBotMsg);
        const looksLikeName = userText.trim().split(" ").length <= 5 &&
          !/\d/.test(userText) && userText.length < 40;

        if (isNameRequest && looksLikeName && !lead.name) {
          updateLead({ name: userText.trim() });
        }

        if (!lead.issue && userText.length > 10) {
          updateLead({ issue: userText.trim() });
        }

      } catch (err) {
        console.error("Chat error:", err);
        addMessage(
          "assistant",
          `Sorry, I'm having a connection issue. Please call us on ${config.phone}.`
        );
      } finally {
        setLoading(false);
      }
    },
    [messages, lead, offeredSlots, config, addMessage, setLoading, updateLead, setUrgency, setOfferedSlots]
  );

  return { sendMessage };
}