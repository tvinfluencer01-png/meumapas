import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SALE_TABLES = [
  "affiliate_conversions",
  "affiliate_commissions",
  "affiliate_orders",
  "affiliate_clicks",
] as const;

/**
 * Subscribe to realtime changes on affiliate sales tables and invalidate
 * the given react-query keys so dashboards refresh without a page reload.
 *
 * @param queryKeys list of query keys to invalidate on any change
 * @param affiliateId optional — filter changes to a single affiliate
 * @param channelKey unique name for the realtime channel
 */
export function useAffiliateRealtime(
  queryKeys: readonly (readonly unknown[])[],
  opts: { affiliateId?: string | null; channelKey: string; enabled?: boolean } = { channelKey: "affiliate-sales" },
) {
  const qc = useQueryClient();
  const { affiliateId, channelKey, enabled = true } = opts;

  useEffect(() => {
    if (!enabled) return;
    const suffix = affiliateId ? `-${affiliateId}` : "-all";
    const channel = supabase.channel(`${channelKey}${suffix}`);

    const invalidate = () => {
      for (const key of queryKeys) {
        qc.invalidateQueries({ queryKey: key as unknown[] });
      }
    };

    for (const table of SALE_TABLES) {
      const config: any = { event: "*", schema: "public", table };
      if (affiliateId) config.filter = `affiliate_id=eq.${affiliateId}`;
      channel.on("postgres_changes", config, invalidate);
    }

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affiliateId, channelKey, enabled]);
}
