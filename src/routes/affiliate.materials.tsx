import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { listMaterials } from "@/modules/affiliate/panel.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, Download, ExternalLink, Search, Video, Image as ImageIcon, FileText, GraduationCap, Palette, Sparkles, Hash, Type, Check } from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { buildCopyPack } from "@/lib/marketing-copy";

export const Route = createFileRoute("/affiliate/materials")({
  component: Page,
  head: () => ({ meta: [{ title: "Central de Materiais — Affiliate Center" }] }),
});

const KINDS: Array<{ key: string; label: string; icon: any }> = [
  { key: "all", label: "Todos", icon: Palette },
  { key: "video", label: "Vídeos", icon: Video },
  { key: "banner", label: "Banners", icon: ImageIcon },
  { key: "reel", label: "Reels", icon: Video },
  { key: "story", label: "Stories", icon: ImageIcon },
  { key: "carousel", label: "Carrosséis", icon: ImageIcon },
  { key: "logo", label: "Logos", icon: ImageIcon },
  { key: "copy", label: "Copies", icon: FileText },
  { key: "pdf", label: "PDFs", icon: FileText },
  { key: "training", label: "Treinamentos", icon: GraduationCap },
];

function Page() { return <AffiliateShell><Content /></AffiliateShell>; }

function Content() {
  const fn = useServerFn(listMaterials);
  const { data } = useQuery({ queryKey: ["aff-materials"], queryFn: () => fn() });
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");

  const items = useMemo(() => {
    let arr = (data ?? []) as any[];
    if (tab !== "all") arr = arr.filter((m) => m.kind === tab);
    if (q) arr = arr.filter((m) => (m.title + " " + (m.description ?? "")).toLowerCase().includes(q.toLowerCase()));
    return arr;
  }, [data, tab, q]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-serif shimmer-text">Central de Materiais</h1>
          <p className="text-sm text-muted-foreground">Vídeos, banners, copies e mais — prontos para você divulgar.</p>
        </div>
        <div className="relative">
          <Search className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 w-full md:w-64" />
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          {KINDS.map((k) => (
            <TabsTrigger key={k.key} value={k.key} className="gap-1"><k.icon className="size-3" />{k.label}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              Nenhum material disponível ainda. Peça ao admin para publicar recursos.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((m: any) => <MaterialCard key={m.id} m={m} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MaterialCard({ m }: { m: any }) {
  const isImage = ["banner", "story", "carousel", "logo"].includes(m.kind);
  const isVideo = ["video", "reel"].includes(m.kind);
  const isCopy = m.kind === "copy";
  return (
    <Card className="overflow-hidden hover:border-gold/50 transition-colors">
      {m.thumb_url && isImage && <img src={m.thumb_url} alt={m.title} className="w-full h-40 object-cover" />}
      {isVideo && m.url && <video src={m.url} className="w-full h-40 object-cover bg-black" controls />}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base truncate">{m.title}</CardTitle>
          <Badge variant="outline" className="text-[10px] shrink-0">{m.kind}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {m.description && <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>}
        {isCopy && m.content && (
          <div className="text-xs bg-muted/40 rounded-md p-2 border max-h-40 overflow-auto whitespace-pre-wrap">{m.content}</div>
        )}
        <div className="flex gap-2 flex-wrap">
          {isCopy && m.content && (
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copiado"); }}>
              <Copy className="size-3 mr-1" /> Copiar
            </Button>
          )}
          {m.url && (
            <>
              <Button size="sm" variant="outline" asChild><a href={m.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3 mr-1" /> Abrir</a></Button>
              <Button size="sm" asChild><a href={m.url} download><Download className="size-3 mr-1" /> Baixar</a></Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
