import { NextRequest, NextResponse } from "next/server";
import { getClientConfig } from "@/lib/getClientConfig";

// ================================================
// EMBED SCRIPT ROUTE
// ------------------------------------------------
// Served at: /widget/[clientId]/embed.js
// Client pastes into their website:
// <script src="https://dental-chatbots.vercel.app/widget/brightsmile-dental/embed.js"></script>
// ================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const config       = getClientConfig(clientId);

  if (!config) {
    return new NextResponse(`/* ChatFlow: inactive */`, {
      headers: { "Content-Type": "application/javascript" },
    });
  }

  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "https://dental-chatbots.vercel.app";
  const widgetUrl = `${appUrl}/widget/${clientId}/view`;
  const safeId    = clientId.replace(/-/g, "_");

  const script = `(function(){
  if(window.__cf_${safeId})return;
  window.__cf_${safeId}=true;

  var wrap=document.createElement("div");
  wrap.style.cssText="position:fixed;bottom:0;right:0;width:90px;height:90px;z-index:2147483647;border:none;transition:width 0.3s,height 0.3s";

  var iframe=document.createElement("iframe");
  iframe.src="${widgetUrl}";
  iframe.style.cssText="width:100%;height:100%;border:none;background:transparent";
  iframe.setAttribute("allowtransparency","true");
  iframe.setAttribute("title","Chat with us");

  wrap.appendChild(iframe);
  document.body.appendChild(wrap);

  window.addEventListener("message",function(e){
    if(e.origin!="${appUrl}")return;
    if(!e.data||e.data.type!=="chatflow_resize")return;
    if(e.data.open){
      wrap.style.width="420px";
      wrap.style.height="700px";
    } else {
      wrap.style.width="90px";
      wrap.style.height="90px";
    }
  });
})();`;

  return new NextResponse(script, {
    headers: {
      "Content-Type":  "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}