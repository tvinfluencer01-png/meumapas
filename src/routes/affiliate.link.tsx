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
import { Copy, ExternalLink, Share2, QrCode, Package, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/affiliate/link")({
  component: Page,
  head: () => ({ meta: [{ title: "Meu Link — Affiliate Center" }] }),
});

function Page() {
  return <AffiliateShell><Content /></AffiliateShell>;
}

function Content() {
  const fn = useServerFn(getMyAffiliate);
  const listFn = useServerFn(listPublicLandings);
  const { data } = useQuery({ queryKey: ["my-affiliate"], queryFn: () => fn() });
  const { data: landings } = useQuery({ queryKey: ["public-landings"], queryFn: () => listFn() });
  const [utm, setUtm] = useState({ source: "", medium: "", campaign: "" });
  const [productSlug, setProductSlug] = useState<string>("");
  const [saved, setSaved] = useState<SavedLink[]>(() => loadSaved());
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(saved.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedSaved = saved.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const code = (data as any)?.profile?.affiliate_code;
  const base = typeof window !== "undefined" ? window.location.origin : "";

  const buildWithUtm = (u: URL) => {
    if (utm.source) u.searchParams.set("utm_source", utm.source);
    if (utm.medium) u.searchParams.set("utm_medium", utm.medium);
    if (utm.campaign) u.searchParams.set("utm_campaign", utm.campaign);
    return u.toString();
  };

  const refUrl = useMemo(() => {
    if (!code) return "";
    return buildWithUtm(new URL(`${base}/api/public/affiliate/r/${String(code).toLowerCase()}`));
  }, [code, base, utm]);

  const productUrl = useMemo(() => {
    if (!code || !productSlug) return "";
    const u = new URL(`${base}/p/${productSlug}`);
    u.searchParams.set("ref", String(code));
    return buildWithUtm(u);
  }, [code, base, productSlug, utm]);

  if (!code) return <div>Cadastro em análise…</div>;

  const copy = (val: string) => { navigator.clipboard.writeText(val); toast.success("Link copiado!"); };
  const share = async (val: string) => {
    if (navigator.share) await navigator.share({ url: val, title: "Confira!", text: "Descubra seu mapa astral." });
    else copy(val);
  };
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(productUrl || refUrl)}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-serif shimmer-text">Meu Link</h1>
        <p className="text-sm text-muted-foreground">Compartilhe este link exclusivo e ganhe comissões.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Link de divulgação (geral)</CardTitle>
          <CardDescription>Código: <span className="font-mono">{code}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <code className="flex-1 text-xs break-all border rounded-md p-3 bg-muted/40">{refUrl}</code>
            <div className="flex gap-2">
              <Button onClick={() => copy(refUrl)} variant="outline"><Copy className="size-4 mr-2" />Copiar</Button>
              <Button onClick={() => share(refUrl)}><Share2 className="size-4 mr-2" />Compartilhar</Button>
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
          <CardTitle className="flex items-center gap-2"><Package className="size-4" /> Gerador de link por produto</CardTitle>
          <CardDescription>Escolha uma landing page de produto e gere seu link de afiliado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={productSlug} onValueChange={setProductSlug}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um produto…" />
            </SelectTrigger>
            <SelectContent>
              {(landings ?? []).map((l: any) => (
                <SelectItem key={l.slug} value={l.slug}>
                  {l.title} — R$ {(l.price_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </SelectItem>
              ))}
              {(!landings || landings.length === 0) && (
                <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum produto disponível.</div>
              )}
            </SelectContent>
          </Select>

          <div className="grid md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">utm_source</label>
              <Input placeholder="ex: instagram" value={utm.source} onChange={(e) => setUtm({ ...utm, source: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">utm_medium</label>
              <Input placeholder="ex: story" value={utm.medium} onChange={(e) => setUtm({ ...utm, medium: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">utm_campaign</label>
              <Input placeholder="ex: black-friday" value={utm.campaign} onChange={(e) => setUtm({ ...utm, campaign: e.target.value })} />
            </div>
          </div>

          {productUrl && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Preview da URL (UTMs destacados):</div>
              <div className="text-xs break-all border rounded-md p-3 bg-muted/40 font-mono">
                <HighlightedUrl url={productUrl} />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => copy(productUrl)} variant="outline"><Copy className="size-4 mr-2" />Copiar</Button>
                <Button onClick={() => share(productUrl)}><Share2 className="size-4 mr-2" />Compartilhar</Button>
                <Button asChild variant="outline"><a href={productUrl} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /></a></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><QrCode className="size-4" /> QR Code</CardTitle>
            <CardDescription>{productUrl ? "Do link do produto selecionado." : "Do link geral."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <img src={qrUrl} alt="QR Code" className="rounded-md border" width={240} height={240} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const url = productUrl || refUrl;
                const slug = productSlug || null;
                const title = slug
                  ? (landings ?? []).find((l: any) => l.slug === slug)?.title ?? slug
                  : "Link geral";
                setSaved((prev) => addSaved(prev, { url, title, slug, utm }));
                toast.success("Link salvo!");
              }}
            >
              Salvar este link
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="size-4" /> Links salvos</CardTitle>
            <CardDescription>Histórico local dos seus links gerados.</CardDescription>
          </CardHeader>
          <CardContent>
            {saved.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum link salvo ainda. Clique em <em>Salvar este link</em> para começar.
              </p>
            ) : (
              <ScrollArea className="h-[280px] pr-2">
                <ul className="space-y-2">
                  {saved.map((s) => (
                    <li key={s.id} className="rounded-md border p-2 bg-muted/30 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium truncate">{s.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(s.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <code className="block text-[10px] break-all text-muted-foreground">{s.url}</code>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => copy(s.url)}>
                          <Copy className="size-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2" asChild>
                          <a href={s.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3" /></a>
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => share(s.url)}>
                          <Share2 className="size-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 ml-auto text-destructive"
                          onClick={() => setSaved((prev) => removeSaved(prev, s.id))}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type SavedLink = {
  id: string;
  url: string;
  title: string;
  slug: string | null;
  utm: { source: string; medium: string; campaign: string };
  created_at: number;
};

const SAVED_KEY = "affiliate.saved-links.v1";

function loadSaved(): SavedLink[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]"); } catch { return []; }
}
function persist(list: SavedLink[]) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch {}
}
function addSaved(prev: SavedLink[], input: Omit<SavedLink, "id" | "created_at">): SavedLink[] {
  if (prev.some((s) => s.url === input.url)) return prev;
  const next = [{ ...input, id: crypto.randomUUID(), created_at: Date.now() }, ...prev].slice(0, 50);
  persist(next);
  return next;
}
function removeSaved(prev: SavedLink[], id: string): SavedLink[] {
  const next = prev.filter((s) => s.id !== id);
  persist(next);
  return next;
}


function HighlightedUrl({ url }: { url: string }) {
  try {
    const u = new URL(url);
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    const params = Array.from(u.searchParams.entries());
    const base = `${u.origin}${u.pathname}`;
    return (
      <span>
        <span className="text-foreground">{base}</span>
        {params.length > 0 && <span className="text-muted-foreground">?</span>}
        {params.map(([k, v], i) => {
          const isUtm = utmKeys.includes(k);
          const isRef = k === "ref";
          return (
            <span key={i}>
              {i > 0 && <span className="text-muted-foreground">&</span>}
              <span className={isUtm ? "bg-primary/20 text-primary px-1 rounded" : isRef ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1 rounded" : "text-muted-foreground"}>
                {k}={v}
              </span>
            </span>
          );
        })}
      </span>
    );
  } catch {
    return <span>{url}</span>;
  }
}
