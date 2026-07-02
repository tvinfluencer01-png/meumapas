import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getAffiliateContext } from "@/modules/affiliate/lib/client-tracking";

/**
 * Debug panel: shown only when the URL contains ?debug=1.
 * Reads current ref/UTMs from the URL and localStorage, and lets you fire
 * visit + click manually against the same public tracking endpoints used
 * by the real flow (writes to affiliate_tracking_sessions + affiliate_clicks).
 */
export function AffiliateDebugPanel({ landingUrl }: { landingUrl: string }) {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  if (url.searchParams.get("debug") !== "1") return null;

  const [log, setLog] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const urlRef = url.searchParams.get("ref");
  const urlUtm: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = url.searchParams.get(k);
    if (v) urlUtm[k] = v;
  }
  const ctx = getAffiliateContext();
  const affiliateCode = urlRef ?? ctx.affiliateCode;
  const utm = Object.keys(urlUtm).length ? urlUtm : ctx.utm;

  const append = (label: string, data: unknown) =>
    setLog((prev) => `${prev}\n[${new Date().toLocaleTimeString()}] ${label}: ${JSON.stringify(data)}`.trim());

  async function post(path: string, body: unknown) {
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      return { status: res.status, json };
    } catch (e: any) {
      return { status: 0, json: { error: e?.message ?? "network" } };
    }
  }

  async function fireVisitClick() {
    if (!affiliateCode) {
      append("erro", "Sem ?ref na URL nem ref persistido no localStorage");
      return;
    }
    setBusy(true);
    const visit = await post("/api/public/affiliate/track/visit", {
      affiliateCode,
      sessionToken: ctx.sessionToken ?? undefined,
    });
    append("visit", visit);
    const token = (visit.json?.sessionToken as string | undefined) ?? ctx.sessionToken ?? undefined;
    const click = await post("/api/public/affiliate/track/click", {
      affiliateCode,
      sessionToken: token,
      landingUrl,
      utm,
    });
    append("click", click);
    setBusy(false);
  }

  return (
    <div className="my-6 rounded-lg border border-dashed border-primary/40 bg-muted/30 p-4 text-xs space-y-3">
      <div className="flex items-center justify-between">
        <strong className="text-sm">Affiliate Debug</strong>
        <span className="text-muted-foreground">?debug=1</span>
      </div>
      <div className="grid md:grid-cols-2 gap-2 font-mono">
        <div><span className="text-muted-foreground">ref (URL): </span>{urlRef ?? "—"}</div>
        <div><span className="text-muted-foreground">ref (storage): </span>{ctx.affiliateCode ?? "—"}</div>
        <div><span className="text-muted-foreground">sessionToken: </span>{ctx.sessionToken ?? "—"}</div>
        <div><span className="text-muted-foreground">landingUrl: </span>{landingUrl}</div>
        <div className="md:col-span-2"><span className="text-muted-foreground">utm: </span>{JSON.stringify(utm)}</div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={fireVisitClick} disabled={busy}>
          {busy ? "Enviando…" : "Disparar visit + click"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setLog("")}>Limpar log</Button>
      </div>
      {log && (
        <pre className="whitespace-pre-wrap break-all bg-background/60 border rounded p-2 max-h-64 overflow-auto font-mono text-[11px]">
{log}
        </pre>
      )}
    </div>
  );
}
