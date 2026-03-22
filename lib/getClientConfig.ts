import { ClientConfig } from "@/types";
import brightsmile from "@/config/clients/brightsmile-dental";
import sydneySmiles from "@/config/clients/sydney-smiles";

// ================================================
// CLIENT REGISTRY
// ------------------------------------------------
// Add every new client here.
// The key is the clientId used in the widget URL:
//   /widget/brightsmile-dental
// ================================================

const clients: Record<string, ClientConfig> = {
  "brightsmile-dental": brightsmile,
  "sydney-smiles": sydneySmiles,
  // Add more clients here as you onboard them:
  // "sydney-smiles": sydneySmiles,
  // "london-dental": londonDental,
};

export function getClientConfig(clientId: string): ClientConfig | null {
  const config = clients[clientId];
  if (!config) return null;
  if (!config.active) return null; // suspended clients get null = dead widget
  return config;
}

export function getAllClientIds(): string[] {
  return Object.keys(clients);
}
