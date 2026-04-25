import { ImageResponse } from "@vercel/og";

let cachedFonts: { regular: ArrayBuffer; semibold: ArrayBuffer } | null = null;
let fontPromise: Promise<{
  regular: ArrayBuffer;
  semibold: ArrayBuffer;
}> | null = null;

async function loadFonts(origin: string) {
  if (cachedFonts) return cachedFonts;
  if (!fontPromise) {
    fontPromise = (async () => {
      const [regular, semibold] = await Promise.all([
        fetch(new URL("/fonts/Geist-Regular.ttf", origin)).then((r) =>
          r.arrayBuffer(),
        ),
        fetch(new URL("/fonts/Geist-SemiBold.ttf", origin)).then((r) =>
          r.arrayBuffer(),
        ),
      ]);
      cachedFonts = { regular, semibold };
      return cachedFonts;
    })();
  }
  return fontPromise;
}

export type OgParams = {
  title: string;
  kicker?: string;
  description?: string;
  origin: string;
};

export async function renderOg(params: OgParams): Promise<Response> {
  const { regular, semibold } = await loadFonts(params.origin);
  const { title, kicker, description } = params;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 20% 0%, #1a1a2e 0%, #0a0a0a 50%)",
          color: "#fafafa",
          fontFamily: "Geist",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "22px",
            color: "#a1a1aa",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "9999px",
              backgroundColor: "#fafafa",
            }}
          />
          {kicker ?? "Orbit"}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            marginTop: "auto",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              fontSize: title.length > 40 ? "60px" : "72px",
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: "1000px",
            }}
          >
            {title}
          </div>
          {description ? (
            <div
              style={{
                fontSize: "26px",
                color: "#a1a1aa",
                lineHeight: 1.4,
                maxWidth: "950px",
              }}
            >
              {description.length > 140
                ? `${description.slice(0, 137)}…`
                : description}
            </div>
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "24px",
            color: "#71717a",
            borderTop: "1px solid #27272a",
            paddingTop: "24px",
          }}
        >
          <div>Orbit</div>
          <div>move together</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
