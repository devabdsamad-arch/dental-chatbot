import { notFound } from "next/navigation";
import { getClientConfig } from "@/lib/getClientConfig";
import { ChatWidget } from "@/components/chat/ChatWidget";

interface WidgetPageProps {
  params: { clientId: string };
}

// ================================================
// WIDGET PAGE
// ------------------------------------------------
// Accessed at: /widget/brightsmile-dental
//
// In production the client embeds this as:
// <script src="https://yourapp.com/widget/brightsmile-dental/embed.js">
// For the demo we load the full page directly.
// ================================================

export default async function WidgetPage({ params }: WidgetPageProps) {
  const { clientId } = await params;
  const config = getClientConfig(clientId);

  if (!config) notFound();

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">

      {/* Demo background — simulates a client's website */}
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Demo preview</p>
          <h1 className="text-3xl font-light text-gray-900 mb-2">{config.name}</h1>
          <p className="text-gray-500 mb-6">{config.location}</p>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p className="font-medium text-gray-900 mb-1">Hours</p>
              <p>{config.hours}</p>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Phone</p>
              <p>{config.phone}</p>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Demo mode:</strong> Click the chat bubble in the bottom-right corner.
          Add <code className="bg-amber-100 px-1 rounded">OPENAI_API_KEY</code> to{" "}
          <code className="bg-amber-100 px-1 rounded">.env.local</code> to go live.
        </div>
      </div>

      {/* The actual widget */}
      <ChatWidget config={config} />
    </main>
  );
}

export async function generateMetadata({ params }: WidgetPageProps) {
  const { clientId } = await params;
  const config = getClientConfig(clientId);
  return {
    title: config ? `${config.name} — Chat` : "Chat Widget",
  };
}
