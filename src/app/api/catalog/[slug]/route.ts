import { NextResponse } from "next/server";
import { getCatalogLocale, readPublicProduct } from "@/lib/catalog/service";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext<"/api/catalog/[slug]">) {
  try {
    const { slug } = await context.params;
    const client = await getSupabaseServerClient();
    const product = await readPublicProduct(
      client,
      slug,
      getCatalogLocale(new URL(request.url).searchParams.get("locale")),
    );
    if (!product) return NextResponse.json({ error: "product_not_found" }, { status: 404 });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "catalog_unavailable" }, { status: 503 });
  }
}
