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
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card
        className="overflow-hidden hover:border-gold/50 transition-colors cursor-pointer group"
        onClick={() => setOpen(true)}
      >
        {m.thumb_url && isImage && <img src={m.thumb_url} alt={m.title} className="w-full h-40 object-cover" />}
        {isVideo && m.url && <video src={m.url} className="w-full h-40 object-cover bg-black" />}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base truncate group-hover:text-gold transition-colors">{m.title}</CardTitle>
            <Badge variant="outline" className="text-[10px] shrink-0">{m.kind}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {m.description && <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>}
          <div className="flex items-center gap-1 text-xs text-gold/80">
            <Sparkles className="size-3" /> Clique para ver copy + hashtags
          </div>
        </CardContent>
      </Card>
      <MaterialDialog m={m} open={open} onOpenChange={setOpen} />
    </>
  );
}

function CopyButton({ label, text, icon: Icon }: { label: string; text: string; icon: any }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(`${label} copiado`);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3 mr-1" /> : <Icon className="size-3 mr-1" />}
      {copied ? "Copiado" : `Copiar ${label.toLowerCase()}`}
    </Button>
  );
}

function MaterialDialog({ m, open, onOpenChange }: { m: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  const isCopy = m.kind === "copy";
  const isImage = ["banner", "story", "carousel", "logo"].includes(m.kind);
  const isVideo = ["video", "reel"].includes(m.kind);
  const pack = useMemo(() => buildCopyPack(m), [m]);
  const hashtagStr = pack.hashtags.join(" ");
  const fullPost = `${pack.title}\n\n${pack.copy}\n\n${hashtagStr}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gold">
            <Sparkles className="size-5" /> {m.title}
          </DialogTitle>
          <DialogDescription>
            Copy persuasiva com gatilhos mentais gerada para este material.
          </DialogDescription>
        </DialogHeader>

        {m.thumb_url && isImage && (
          <img src={m.thumb_url} alt={m.title} className="w-full max-h-64 object-contain rounded-md bg-black/20" />
        )}
        {isVideo && m.url && <video src={m.url} className="w-full max-h-64 rounded-md bg-black" controls />}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-1"><Type className="size-4 text-gold" /> Título</h3>
            <CopyButton label="Título" text={pack.title} icon={Copy} />
          </div>
          <div className="text-sm bg-muted/40 rounded-md p-3 border">{pack.title}</div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-1"><FileText className="size-4 text-gold" /> Copy</h3>
            <CopyButton label="Copy" text={pack.copy} icon={Copy} />
          </div>
          <div className="text-sm bg-muted/40 rounded-md p-3 border whitespace-pre-wrap max-h-64 overflow-auto">{pack.copy}</div>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-1"><Hash className="size-4 text-gold" /> Hashtags</h3>
            <CopyButton label="Hashtags" text={hashtagStr} icon={Copy} />
          </div>
          <div className="flex flex-wrap gap-1 bg-muted/40 rounded-md p-3 border">
            {pack.hashtags.map((h) => (
              <span key={h} className="text-xs px-2 py-0.5 rounded bg-gold/10 text-gold border border-gold/30">{h}</span>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <CopyButton label="Post completo" text={fullPost} icon={Copy} />
          {m.url && (
            <>
              <Button size="sm" variant="outline" asChild>
                <a href={m.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3 mr-1" /> Abrir</a>
              </Button>
              <Button size="sm" asChild>
                <a href={m.url} download><Download className="size-3 mr-1" /> Baixar</a>
              </Button>
            </>
          )}
          {isCopy && m.content && <CopyButton label="Conteúdo original" text={m.content} icon={Copy} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
