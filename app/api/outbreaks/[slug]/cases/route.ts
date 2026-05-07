import { NextResponse } from "next/server";
import { getOutbreakBySlug } from "@/lib/outbreaks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Публичный JSON-эндпойнт для клиентской подгрузки case-маркеров на карте.
 * Кешируется на edge (Cloudflare) на 60 секунд.
 */
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const data = getOutbreakBySlug(params.slug);
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Outbreak not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      slug: data.meta.slug,
      lastUpdated: data.meta.lastUpdated,
      cases: data.cases,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
