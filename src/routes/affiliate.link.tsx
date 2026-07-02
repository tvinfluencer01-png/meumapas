import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { getMyAffiliate } from "@/modules/affiliate/affiliate.functions";
import { listPublicLandings } from "@/lib/product-landings.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, ExternalLink, Share2, QrCode, Package } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/affiliate/link")({
  component: Page,
  head: () => ({ meta: [{ title: "Meu Link — Affiliate Center" }] }),
});

function Page() {
  return <AffiliateShell><Content /></AffiliateShell>;
}

function Content() {
  const fn = useServerFn(getMyAffiliate);
  const { data } = useQuery({ queryKey: ["my-affiliate"], queryFn: () => fn() });
  const [utm, setUtm] = useState({ source: "", medium: "", campaign: "" });

  const code = (data as any)?.profile?.affiliate_code;
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const refUrl = useMemo(() => {
    if (!code) return "";
    const url = new URL(`${base}/api/public/affiliate/r/${String(code).toLowerCase()}`);
    if (utm.source) url.searchParams.set("utm_source", utm.source);
    if (utm.medium) url.searchParams.set("utm_medium", utm.medium);
    if (utm.campaign) url.searchParams.set("utm_campaign", utm.campaign);
    return url.toString();
  }, [code, base, utm]);

  if (!code) return <div>Cadastro em análise…</div>;

  const copy = () => { navigator.clipboard.writeText(refUrl); toast.success("Link copiado!"); };
  const share = async () => {
    if (navigator.share) await navigator.share({ url: refUrl, title: "Confira!", text: "Descubra seu mapa astral." });
    else copy();
  };
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(refUrl)}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-serif shimmer-text">Meu Link</h1>
        <p className="text-sm text-muted-foreground">Compartilhe este link exclusivo e ganhe comissões.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Link de divulgação</CardTitle>
          <CardDescription>Código: <span className="font-mono">{code}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <code className="flex-1 text-xs break-all border rounded-md p-3 bg-muted/40">{refUrl}</code>
            <div className="flex gap-2">
              <Button onClick={copy} variant="outline"><Copy className="size-4 mr-2" />Copiar</Button>
              <Button onClick={share}><Share2 className="size-4 mr-2" />Compartilhar</Button>
              <Button asChild variant="outline"><a href={refUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /></a></Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-2">
            <Input placeholder="utm_source (ex: instagram)" value={utm.source} onChange={(e) => setUtm({ ...utm, source: e.target.value })} />
            <Input placeholder="utm_medium (ex: story)" value={utm.medium} onChange={(e) => setUtm({ ...utm, medium: e.target.value })} />
            <Input placeholder="utm_campaign (ex: black-friday)" value={utm.campaign} onChange={(e) => setUtm({ ...utm, campaign: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode className="size-4" /> QR Code</CardTitle>
          <CardDescription>Perfeito para materiais impressos e stories.</CardDescription>
        </CardHeader>
        <CardContent>
          <img src={qrUrl} alt="QR Code" className="rounded-md border" width={240} height={240} />
        </CardContent>
      </Card>
    </div>
  );
}
