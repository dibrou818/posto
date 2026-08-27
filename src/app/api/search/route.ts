import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ tags: [], results: [] });
  }

  const supabase = await createClient();

  const [tagsRes, resultsRes] = await Promise.all([
    supabase.rpc("search_tags", { search_query: q }),
    supabase.rpc("search_all", { search_query: q }),
  ]);

  if (tagsRes.error) {
    return NextResponse.json({ error: tagsRes.error.message }, { status: 500 });
  }
  if (resultsRes.error) {
    return NextResponse.json({ error: resultsRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    tags: tagsRes.data ?? [],
    results: resultsRes.data ?? [],
  });
}
