export const metadata = {
  title: "Offline",
  robots: { index: false },
};

// This page is served from the service-worker cache while offline, where the
// hashed CSS chunks it references may NOT be cached. Everything visual is
// therefore inlined so it renders correctly even with zero stylesheets.
const wrap: React.CSSProperties = {
  padding: "5rem 1rem",
  maxWidth: "28rem",
  margin: "0 auto",
  textAlign: "center",
  fontFamily:
    "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

export default function OfflinePage() {
  return (
    <div style={wrap}>
      <div style={{ fontSize: "3rem" }} aria-hidden>
        ⌖
      </div>
      <h1 style={{ marginTop: "1rem", fontSize: "1.5rem", fontWeight: 600 }}>
        You&apos;re offline
      </h1>
      <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", opacity: 0.75, lineHeight: 1.5 }}>
        NicFinder needs a connection to show current prices — we never show
        cached prices as if they were live. Reconnect and try again.
      </p>
      <p style={{ marginTop: "1.5rem" }}>
        {/* Deliberately a plain anchor: this page is served from the service
            worker cache while offline, and retrying must be a full network
            navigation, not a client-side route transition. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{
            display: "inline-block",
            borderRadius: "0.75rem",
            background: "#0d9488",
            color: "white",
            padding: "0.625rem 1.25rem",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Retry
        </a>
      </p>
    </div>
  );
}
