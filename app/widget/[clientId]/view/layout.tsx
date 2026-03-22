// ================================================
// WIDGET VIEW LAYOUT
// ------------------------------------------------
// Minimal layout for the iframe version.
// Transparent background, no padding, no wrapper.
// Sets X-Frame-Options to allow iframe embedding.
// ================================================

export default function WidgetViewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "transparent", width: "100%", height: "100vh", overflow: "hidden" }}>
      {children}
    </div>
  );
}