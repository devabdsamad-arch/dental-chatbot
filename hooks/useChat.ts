"use client";

import { useCallback, useRef } from "react";
import { useChatStore } from "./useChatStore";
import { ClientConfig } from "@/types";
const uuidv4 = () => crypto.randomUUID();

export function useChat(config: ClientConfig) {
  const {
    messages,
    lead,
    addMessage,
    setLoading,
    updateLead,
    setUrgency,
  } = useChatStore();

  // Unique session ID per page load — anonymous, no personal data
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
            clientId:  config.id,
            sessionId: sessionId.current,
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

        if (data.urgency) setUrgency(data.urgency);

        addMessage("assistant", data.reply);

        // Track locally for UX purposes only — never sent to our DB
        const lastBotMsg = messages
          .filter((m) => m.role === "assistant")
          .at(-1)?.content ?? "";

        const isNameRequest  = /your name|name please/i.test(lastBotMsg);
        const looksLikeName  = userText.trim().split(" ").length <= 4 &&
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
    [messages, lead, config, addMessage, setLoading, updateLead, setUrgency]
  );

  return { sendMessage };
}