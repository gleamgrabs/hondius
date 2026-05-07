import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const title = searchParams.get("title") ?? "Outbreak Tracker";
  const cases = searchParams.get("cases") ?? "—";
  const deaths = searchParams.get("deaths") ?? "—";
  const updated = searchParams.get("updated") ?? "7 May 2026";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          padding: "60px",
          fontFamily: "system-ui, sans-serif",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              fontSize: "13px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#9a9a9a",
              fontFamily: "monospace",
            }}
          >
            Outbreak Tracker
          </div>
          <div
            style={{
              fontSize: "42px",
              fontWeight: "600",
              color: "#1a1a1a",
              lineHeight: "1.1",
              maxWidth: "800px",
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "60px",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: "60px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div
                style={{
                  fontSize: "64px",
                  fontWeight: "600",
                  color: "#1a1a1a",
                  fontFamily: "monospace",
                  lineHeight: "1",
                }}
              >
                {cases}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#9a9a9a",
                  fontFamily: "monospace",
                }}
              >
                Confirmed cases
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div
                style={{
                  fontSize: "64px",
                  fontWeight: "600",
                  color: "#c8322a",
                  fontFamily: "monospace",
                  lineHeight: "1",
                }}
              >
                {deaths}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#9a9a9a",
                  fontFamily: "monospace",
                }}
              >
                Deaths
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "4px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#c8322a",
                fontFamily: "monospace",
                border: "1px solid #c8322a",
                padding: "3px 8px",
                marginBottom: "8px",
              }}
            >
              Active
            </div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.08em",
                color: "#9a9a9a",
                fontFamily: "monospace",
                textTransform: "uppercase",
              }}
            >
              Updated {updated}
            </div>
            <div
              style={{
                fontSize: "11px",
                letterSpacing: "0.08em",
                color: "#9a9a9a",
                fontFamily: "monospace",
                textTransform: "uppercase",
              }}
            >
              hondius-watch.com
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "4px",
            backgroundColor: "#c8322a",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
