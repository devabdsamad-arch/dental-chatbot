import { notFound } from "next/navigation";
import { getClientConfig } from "@/lib/getClientConfig";
import { WidgetView } from "@/components/chat/WidgetView";

// ================================================
// WIDGET VIEW PAGE
// ------------------------------------------------
// Loaded inside the iframe on the client's website.
// Transparent background — only the chat bubble
// and window are visible.
// ================================================

interface Props {
  params: Promise<{ clientId: string }>;
}

export default async function WidgetViewPage({ params }: Props) {
  const { clientId } = await params;
  const config       = getClientConfig(clientId);
  if (!config) notFound();

  return <WidgetView config={config} />;
}