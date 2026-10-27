import { NextResponse } from "next/server";
import {
  filtersFromSearchParams,
  getCatalogLocale,
  readPublicCatalog,
} from "@/lib/catalog/service";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = filtersFromSearchParams(url.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: "invalid_filters", reason: parsed.reason }, { status: 400 });
  }

  try {
    const client = await getSupabaseServerClient();
    const products = await readPublicCatalog(
      client,
      parsed.filters,
      getCatalogLocale(url.searchParams.get("locale")),
    );
    return NextResponse.json({ products });
  } catch (error) {
    console.error("CATALOG_API_ERROR", error);
    return NextResponse.json({ error: "catalog_unavailable" }, { status: 503 });
  }
}
