import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Sparkles,
  Loader2,
  ArrowLeft,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldOff,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { confirmDialog } from "@/components/system-feedback";
import { checkIsAdmin } from "@/lib/admin.functions";
import {
  ILLUSTRATION_THEMES,
  REPORT_KINDS,
  listReportIllustrations,
  generateReportIllustration,
  toggleReportIllustration,
  deleteReportIllustration,
  getIllustrationImage,
  seedIllustrationsForAllKinds,
  purgeAllReportIllustrations,
} from "@/lib/report-illustrations.functions";

export const Route = createFileRoute("/_authenticated/admin/ilustracoes")({
  component: IllustrationsPage,
  head: () => ({ meta: [{ title: "Ilustrações dos Relatórios — Admin" }] }),
});

function IllustrationsPage() {
  const qc = useQueryClient();
  const isAdminFn = useServerFn(checkIsAdmin);
  const listFn = useServerFn(listReportIllustrations);
  const genFn = useServerFn(generateReportIllustration);
  const toggleFn = useServerFn(toggleReportIllustration);
  const delFn = useServerFn(deleteReportIllustration);
  const getImgFn = useServerFn(getIllustrationImage);
  const seedFn = useServerFn(seedIllustrationsForAllKinds);
  const purgeFn = useServerFn(purgeAllReportIllustrations);

  const [theme, setTheme] = useState<string>(ILLUSTRATION_THEMES[0].value);
  const [reportKind, setReportKind] = useState<string>("");
  const [title, setTitle] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [count, setCount] = useState(1);
  const [filterTheme, setFilterTheme] = useState<string>("all");

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => isAdminFn(),
  });

  const listQuery = useQuery({
    queryKey: ["report-illustrations", filterTheme],
    queryFn: () =>
      listFn({
        data: {
          theme: filterTheme === "all" ? undefined : filterTheme,
          includeInactive: true,
        },
      }),
    enabled: !!role?.isAdmin,
  });

  const genMut = useMutation({
    mutationFn: () =>
      genFn({
        data: {
          theme,
          report_kind: reportKind || undefined,
          title: title || undefined,
          customPrompt: customPrompt || undefined,
          count,
        },
      }),
    onSuccess: (res) => {
      toast.success(`${res.created.length} ilustração(ões) gerada(s)`);
      setTitle("");
      setCustomPrompt("");
      qc.invalidateQueries({ queryKey: ["report-illustrations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao gerar"),
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; active: boolean }) =>
      toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["report-illustrations"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Ilustração removida");
      qc.invalidateQueries({ queryKey: ["report-illustrations"] });
    },
  });

  const seedMut = useMutation({
    mutationFn: () => seedFn({ data: { perKind: 12 } }),
    onSuccess: (res) => {
      toast.success(`Seed concluído: ${res.total} banners gerados`);
      qc.invalidateQueries({ queryKey: ["report-illustrations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha no seed"),
  });

  const purgeMut = useMutation({
    mutationFn: () => purgeFn(),
    onSuccess: (res) => {
      toast.success(
        `Biblioteca limpa: ${res.deletedRows} registros e ${res.removedFiles} arquivos removidos`,
      );
      qc.invalidateQueries({ queryKey: ["report-illustrations"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao limpar"),
  });

  if (roleLoading) return <div className="p-8 text-muted-foreground">Carregando…</div>;

  if (!role?.isAdmin) {
    return (
      <Card className="max-w-xl m-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="size-5 text-destructive" />
            Acesso restrito
          </CardTitle>
          <CardDescription>Apenas administradores podem acessar esta página.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const items = listQuery.data?.items ?? [];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-gold"
          >
            <ArrowLeft className="size-3" /> Voltar ao admin
          </Link>
          <p className="text-xs uppercase tracking-[0.3em] text-gold mt-2">Admin</p>
          <h1 className="font-serif text-3xl lg:text-4xl mt-2 shimmer-text">
            Biblioteca de Ilustrações
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Enriqueça o banco de ilustrações temáticas usadas dentro dos relatórios. O sistema
            rotaciona automaticamente entre as opções ativas do mesmo tema.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            onClick={async () => {
              const ok = await confirmDialog({
                title: "Apagar todas as ilustrações?",
                description:
                  "Isso removerá TODAS as ilustrações do banco e do storage. Esta ação é irreversível.",
                type: "warning",
                destructive: true,
                confirmText: "Apagar tudo",
              });
              if (ok) purgeMut.mutate();
            }}
            disabled={purgeMut.isPending}
          >
            {purgeMut.isPending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="size-4 mr-2" />
            )}
            Apagar tudo
          </Button>
          <Button
            onClick={async () => {
              const ok = await confirmDialog({
                title: "Gerar banners para todos os relatórios?",
                description:
                  "Serão gerados 12 banners variados para CADA tipo de relatório (12 produtos = 144 imagens). Pode levar vários minutos.",
                type: "info",
                confirmText: "Gerar agora",
              });
              if (ok) seedMut.mutate();
            }}
            disabled={seedMut.isPending}
            className="bg-gradient-to-r from-gold to-amber-500 text-black hover:opacity-90"
          >
            {seedMut.isPending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="size-4 mr-2" />
            )}
            Gerar 12 para cada produto
          </Button>
          <Button
            variant="outline"
            onClick={() => listQuery.refetch()}
            disabled={listQuery.isFetching}
            className="border-gold/40 text-gold hover:bg-gold/10"
          >
            {listQuery.isFetching ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="size-4 mr-2" />
            )}
            Atualizar
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest text-gold flex items-center gap-2">
            <Sparkles className="size-4" /> Gerar mais ilustrações por tema
          </CardTitle>
          <CardDescription>
            Escolha o tema e (opcionalmente) o tipo de relatório. Podemos gerar até 4 variações
            por vez — o sistema sorteia entre elas quando montar o PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs">Tema *</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ILLUSTRATION_THEMES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo de relatório (opcional)</Label>
            <Select value={reportKind || "any"} onValueChange={(v) => setReportKind(v === "any" ? "" : v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Qualquer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualquer</SelectItem>
                {REPORT_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{k}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Título interno (opcional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Casal sob estrelas"
              maxLength={120}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Quantidade</Label>
            <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 6, 8, 10, 12].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <Label className="text-xs">
              Prompt customizado (opcional — substitui o padrão do tema)
            </Label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Descreva a cena que deseja gerar…"
              rows={3}
              maxLength={2000}
              className="mt-1"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4 flex justify-end">
            <Button
              onClick={() => genMut.mutate()}
              disabled={genMut.isPending}
              className="bg-gradient-to-r from-gold to-amber-500 text-black hover:opacity-90"
            >
              {genMut.isPending ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="size-4 mr-2" />
              )}
              Gerar {count > 1 ? `${count} ilustrações` : "ilustração"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm uppercase tracking-widest text-gold flex items-center gap-2">
              <ImageIcon className="size-4" /> Biblioteca ({items.length})
            </CardTitle>
            <CardDescription>Ilustrações ativas entram no sorteio dos relatórios.</CardDescription>
          </div>
          <Select value={filterTheme} onValueChange={setFilterTheme}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os temas</SelectItem>
              {ILLUSTRATION_THEMES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {listQuery.isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="size-6 mx-auto animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              Nenhuma ilustração ainda. Gere as primeiras acima.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((it) => (
                <IllustrationCard
                  key={it.id}
                  item={it}
                  onToggle={(active) => toggleMut.mutate({ id: it.id, active })}
                  onDelete={() => {
                    if (confirm("Remover esta ilustração permanentemente?")) {
                      delMut.mutate(it.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IllustrationCard({
  item,
  onToggle,
  onDelete,
}: {
  item: {
    id: string;
    theme: string;
    report_kind: string | null;
    title: string | null;
    usage_count: number;
    active: boolean;
    created_at: string;
    dataUrl?: string;
  };
  onToggle: (active: boolean) => void;
  onDelete: () => void;
}) {
  const img = item.dataUrl || "";


  const themeLabel =
    ILLUSTRATION_THEMES.find((t) => t.value === item.theme)?.label ?? item.theme;

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden bg-card/40">
      <div className="aspect-[3/2] bg-muted/30 flex items-center justify-center">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={item.title ?? themeLabel} className="w-full h-full object-cover" />
        ) : (
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-xs">{themeLabel}</Badge>
          <span className="text-[10px] text-muted-foreground">usos: {item.usage_count}</span>
        </div>
        {item.title && <p className="text-sm font-medium truncate">{item.title}</p>}
        {item.report_kind && (
          <p className="text-[10px] text-muted-foreground">Kind: {item.report_kind}</p>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8"
            onClick={() => onToggle(!item.active)}
          >
            {item.active ? (
              <><Eye className="size-3 mr-1" /> Ativa</>
            ) : (
              <><EyeOff className="size-3 mr-1" /> Inativa</>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
