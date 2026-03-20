import { create } from "zustand";
import { Message, Lead, ConversationStage } from "@/types";
import { generateId } from "@/lib/utils";

// ================================================
// CHAT STORE — Zustand global state
// Manages messages, lead data, and conversation stage
// ================================================

interface ChatStore {
  // State
  isOpen: boolean;
  isLoading: boolean;
  messages: Message[];
  lead: Partial<Lead>;
  stage: ConversationStage;
  urgency: "routine" | "soon" | "emergency";
  hasGreeted: boolean;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  addMessage: (role: "user" | "assistant", content: string, chips?: string[]) => void;
  setLoading: (loading: boolean) => void;
  updateLead: (data: Partial<Lead>) => void;
  setStage: (stage: ConversationStage) => void;
  setUrgency: (urgency: "routine" | "soon" | "emergency") => void;
  setHasGreeted: (val: boolean) => void;
  reset: () => void;
}

const initialState = {
  isOpen: false,
  isLoading: false,
  messages: [],
  lead: {},
  stage: "greeting" as ConversationStage,
  urgency: "routine" as const,
  hasGreeted: false,
};

export const useChatStore = create<ChatStore>((set) => ({
  ...initialState,

  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),
  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),

  addMessage: (role, content, chips) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: generateId(),
          role,
          content,
          timestamp: new Date(),
          chips,
        },
      ],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  updateLead: (data) =>
    set((s) => ({ lead: { ...s.lead, ...data } })),

  setStage: (stage) => set({ stage }),

  setUrgency: (urgency) => set({ urgency }),

  setHasGreeted: (val) => set({ hasGreeted: val }),

  reset: () => set(initialState),
}));
