import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type QrEntityType = "place" | "event";

/** Logs one scan when `src` is "qr" — the marker generatePlaceQrCode /
 * generateEventQrCode bake into the QR's target URL (`?src=qr`), so a plain
 * link click or a shared URL never counts as a scan, only actually scanning
 * the printed code does. Best-effort and silent: this runs on every public
 * place/event page load, and a logging hiccup (RLS edge case, a transient
 * network error) must never be the reason a real visitor's page fails to
 * render. */
export async function recordQrScan(
  supabase: SupabaseClient<Database>,
  entityType: QrEntityType,
  entityId: string,
  src: string | string[] | undefined,
) {
  if (src !== "qr") return;
  try {
    await supabase.from("qr_scans").insert({ entity_type: entityType, entity_id: entityId });
  } catch {
    // Never worth failing the page over.
  }
}

export type QrScanStats = {
  total: number;
  last7Days: number;
};

/** Scan counts for one place/event's dashboard card: a lifetime total, plus
 * the trailing 7 days — the number a gérant checking in regularly actually
 * cares about, since the lifetime count only ever goes up and says nothing
 * about whether this week's poster is working. RLS (qr_scans_owner_read)
 * already scopes reads to the caller's own places/events, same as every
 * other dashboard query in this app — no extra ownership check needed here. */
export async function getQrScanStats(
  supabase: SupabaseClient<Database>,
  entityType: QrEntityType,
  entityId: string,
): Promise<QrScanStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [totalRes, recentRes] = await Promise.all([
    supabase
      .from("qr_scans")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", entityType)
      .eq("entity_id", entityId),
    supabase
      .from("qr_scans")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .gte("scanned_at", sevenDaysAgo),
  ]);

  return {
    total: totalRes.count ?? 0,
    last7Days: recentRes.count ?? 0,
  };
}
