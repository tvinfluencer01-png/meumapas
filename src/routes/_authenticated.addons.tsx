import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Coins,
  Sparkles,
  Check,
  ShoppingCart,
  RefreshCw,
  AlertTriangle,
  CalendarClock,
  History,
} from "lucide-react";
import { SectionLamp } from "@/components/SectionLamp";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showFeedback } from "@/components/system-feedback";
import {
  getAddonsOverview,
  createMercadoPagoCheckout,
} from "@/lib/addons.functions";
import {
  CREDIT_PACKAGES,
  SUBSCRIPTION_ADDONS,
  formatBRL,
  type CreditPackage,
  type SubscriptionAddon,
} from "@/lib/addons.catalog";
import { listMyCreditHistory } from "@/lib/credits.functions";
import {
  CreditHistoryFilters,
  CreditHistoryTable,
  type CreditTx,
  toIsoRange,
  useHistoryFiltersState,
} from "@/components/CreditHistoryTable";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/addons")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      plan: (search.plan as string) || undefined,
      status: (search.status as string) || undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Add-ons e Créditos — Código Cósmico" },
      {
        name: "description",
        content:
          "Compre créditos avulsos ou assine planos mensais para desbloquear recursos premium do Código Cósmico.",
      },
    ],
  }),
  component: AddonsPage,
});

function AddonsPage() {
  const { user, loading: authLoading } = useAuth();
  const search = useSearch({ from: "/_authenticated/addons" });
  const overviewFn = useServerFn(getAddonsOverview);
  const checkoutFn = useServerFn(createMercadoPagoCheckout);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["addons-overview"],
    queryFn: () => overviewFn(),
    enabled: !!user && !authLoading,
  });

  const [pendingId, setPendingId] = useState<string | null>(null);
  const [dialogSub, setDialogSub] = useState<SubscriptionAddon | null>(null);

  // React to MP back_urls (?status=success|pending|failure)
  useEffect(() => {
    const status = search.status;
    if (!status) return;
    if (status === "success") {
      showFeedback({ title: "Pagamento aprovado!", description: "Seu saldo será atualizado em instantes.", type: "success" });
    } else if (status === "pending") {
      showFeedback({ title: "Pagamento pendente", description: "Avisaremos quando for confirmado.", type: "info" });
    } else if (status === "failure") {
      showFeedback({ title: "Pagamento não concluído", description: "Tente novamente mais tarde.", type: "error" });
    }
    window.history.replaceState({}, "", window.location.pathname);
    refetch();
    // Saldo/custos podem ter mudado após o checkout — força refresh do badge
    import("@/lib/credits-events").then((m) => m.emitCreditsChanged());
  }, [refetch]);

  const checkoutMut = useMutation({
    mutationFn: (vars: { kind: "credits" | "subscription" | "landing_package"; product_id: string }) =>
      checkoutFn({ data: vars }),
    onMutate: (vars) => setPendingId(vars.product_id),
    onSuccess: (res) => {
      window.location.href = res.checkout_url;
    },
    onError: (e: Error) => {
      showFeedback({ title: "Erro no checkout", description: e.message, type: "error" });
      setPendingId(null);
    },
  });

  const activeSubIds = new Set(
    (data?.subscriptions ?? [])
      .filter((s) => s.status === "active")
      .map((s) => s.addon_id),
  );

  const { data: landingPackages } = useQuery({
    queryKey: ["public-landing-packages"],
    queryFn: async () => {
      const { listPublicLandingPackages } = await import("@/lib/landing-packages.functions");
      return listPublicLandingPackages();
    },
  });

  function handleBuy(kind: "credits" | "subscription" | "landing_package", product_id: string) {
    if (!data?.payments_enabled) {
      showFeedback({ title: "Pagamentos indisponíveis", description: "Tente novamente em instantes.", type: "warning" });
      return;
    }
    checkoutMut.mutate({ kind, product_id });
  }

  useEffect(() => {
    if (!isLoading && data && search.plan && landingPackages) {
      const pkg = landingPackages.find((p) => p.slug === search.plan);
      if (pkg) {
        handleBuy("landing_package", pkg.slug);
      }
    }
  }, [isLoading, data, search.plan, landingPackages]);

  return (
    <div className="space-y-8">
      {/* Header + balance */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="size-6 text-gold" />
          <div>
            <h1 className="text-2xl font-serif shimmer-text inline-flex items-center gap-3 flex-wrap">
              Add-ons & Créditos
              <SectionLamp
                title="Add-ons & Créditos"
                why="A IA tem custo. Os créditos garantem uso justo e os add-ons habilitam recursos extras (Clientes, Horóscopo, Mapa Empresarial etc.)."
                how="Compre pacotes avulsos para usar quando quiser ou assine add-ons mensais. Acompanhe o saldo, o histórico e as renovações nesta página."
                purpose="Você controla quanto investir em IA: paga só pelo que usa e ativa apenas os módulos que fazem sentido para o seu trabalho."
              />
            </h1>
            <p className="text-sm text-muted-foreground">
              Amplie sua experiência com créditos avulsos ou assinaturas mensais.
            </p>
          </div>
        </div>

        <BalanceCard
          loading={isLoading}
          balance={data?.balance ?? 0}
          updatedAt={data?.balance_updated_at ?? null}
        />

        {!isLoading && data && !data.payments_enabled && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            <AlertTriangle className="size-4 shrink-0" />
            <span>
              Os pagamentos estão temporariamente indisponíveis. A equipe está finalizando a integração.
            </span>
          </div>
        )}
      </header>

      {/* Credit packages */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-serif flex items-center gap-2">
              <Coins className="size-5 text-gold" /> Pacotes de créditos
            </h2>
            <p className="text-sm text-muted-foreground">
              Compra única. Créditos não expiram.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CREDIT_PACKAGES.map((pkg) => (
            <CreditCard
              key={pkg.id}
              pkg={pkg}
              loading={checkoutMut.isPending && pendingId === pkg.id}
              disabled={checkoutMut.isPending}
              onBuy={() => handleBuy("credits", pkg.id)}
            />
          ))}
        </div>
      </section>

      {/* Subscriptions */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-serif flex items-center gap-2">
            <RefreshCw className="size-5 text-gold" /> Assinaturas mensais
          </h2>
          <p className="text-sm text-muted-foreground">
            Cobrança recorrente todo mês. Cancele quando quiser.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUBSCRIPTION_ADDONS.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              active={activeSubIds.has(sub.id)}
              loading={checkoutMut.isPending && pendingId === sub.id}
              disabled={checkoutMut.isPending}
              onBuy={() => setDialogSub(sub)}
            />
          ))}
        </div>
      </section>

      <MyCreditHistorySection />

      <Dialog open={!!dialogSub} onOpenChange={(o) => !o && setDialogSub(null)}>
        <DialogContent>
          {dialogSub && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">{dialogSub.name}</DialogTitle>
                <DialogDescription>{dialogSub.description}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-3xl font-serif">
                    {formatBRL(dialogSub.price_cents)}
                    <span className="text-base text-muted-foreground font-sans">
                      /mês
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <CalendarClock className="size-3" /> Cobrança recorrente mensal · cancele quando quiser
                  </p>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {dialogSub.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogSub(null)}
                  disabled={checkoutMut.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  className="gap-2"
                  disabled={checkoutMut.isPending}
                  onClick={() => {
                    const id = dialogSub.id;
                    setDialogSub(null);
                    handleBuy("subscription", id);
                  }}
                >
                  <ShoppingCart className="size-4" />
                  {checkoutMut.isPending && pendingId === dialogSub.id
                    ? "Redirecionando…"
                    : "Comprar agora"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MyCreditHistorySection() {
  const historyFn = useServerFn(listMyCreditHistory);
  const [filters, setFilters] = useHistoryFiltersState();
  const { data, isLoading } = useQuery({
    queryKey: ["my-credit-history", filters],
    queryFn: () => historyFn({ data: { ...toIsoRange(filters), limit: 200 } }),
  });
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="size-4 text-gold" />
        <h2 className="text-xl font-serif">Histórico de cobranças</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Veja todas as movimentações de créditos: oráculo, relatórios em PDF, tarot,
        mapa astral e ajustes manuais, com saldo antes e depois de cada operação.
      </p>
      <CreditHistoryFilters
        value={filters}
        onChange={setFilters}
        actions={(data?.transactions ?? []).map((t: CreditTx) => t.action || t.kind)}
      />
      <CreditHistoryTable
        transactions={data?.transactions ?? []}
        loading={isLoading}
      />
    </section>
  );
}

function BalanceCard({
  loading,
  balance,
  updatedAt,
}: {
  loading: boolean;
  balance: number;
  updatedAt: string | null;
}) {
  return (
    <Card className="border-gold/30 bg-gradient-to-br from-card to-card/40">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-gold/10 p-3">
            <Coins className="size-6 text-gold" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Saldo atual
            </p>
            <p className="text-3xl font-serif shimmer-text">
              {loading ? "…" : balance.toLocaleString("pt-BR")}{" "}
              <span className="text-base text-muted-foreground">créditos</span>
            </p>
            {updatedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Atualizado em {new Date(updatedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreditCard({
  pkg,
  loading,
  disabled,
  onBuy,
}: {
  pkg: CreditPackage;
  loading: boolean;
  disabled: boolean;
  onBuy: () => void;
}) {
  const perCredit = pkg.price_cents / pkg.credits / 100;
  return (
    <Card
      className={
        pkg.highlight
          ? "relative border-gold/40 shadow-lg shadow-gold/10"
          : "relative"
      }
    >
      {pkg.highlight && (
        <Badge className="absolute -top-2 right-4 bg-gold text-background hover:bg-gold">
          Mais vendido
        </Badge>
      )}
      <CardHeader>
        <CardTitle className="font-serif">{pkg.name}</CardTitle>
        <CardDescription>{pkg.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-3xl font-serif">{formatBRL(pkg.price_cents)}</p>
          <p className="text-xs text-muted-foreground">pagamento único</p>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Créditos</span>
            <span className="font-medium">{pkg.credits}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-muted-foreground">Por crédito</span>
            <span className="font-medium">
              {perCredit.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={onBuy}
          disabled={disabled}
          className="w-full gap-2"
          variant={pkg.highlight ? "default" : "outline"}
        >
          <ShoppingCart className="size-4" />
          {loading ? "Redirecionando…" : "Comprar"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function SubscriptionCard({
  sub,
  active,
  loading,
  disabled,
  onBuy,
}: {
  sub: SubscriptionAddon;
  active: boolean;
  loading: boolean;
  disabled: boolean;
  onBuy: () => void;
}) {
  return (
    <Card
      className={
        sub.highlight
          ? "relative border-gold/40 shadow-lg shadow-gold/10"
          : "relative"
      }
    >
      {sub.highlight && !active && (
        <Badge className="absolute -top-2 right-4 bg-gold text-background hover:bg-gold">
          Recomendado
        </Badge>
      )}
      {active && (
        <Badge className="absolute -top-2 right-4 bg-green-600 hover:bg-green-600 text-white text-[10px] font-semibold uppercase px-2 py-0.5 tracking-wide">
          Ativo
        </Badge>
      )}

      <CardHeader>
        <CardTitle className="font-serif">{sub.name}</CardTitle>
        <CardDescription>{sub.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-3xl font-serif">
            {formatBRL(sub.price_cents)}
            <span className="text-base text-muted-foreground font-sans">/mês</span>
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarClock className="size-3" /> Cobrança recorrente mensal
          </p>
        </div>
        <ul className="space-y-1.5 text-sm">
          {sub.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          onClick={onBuy}
          disabled={disabled || active}
          className="w-full gap-2"
          variant={sub.highlight && !active ? "default" : "outline"}
        >
          {active ? (
            <>
              <Check className="size-4" /> Assinatura ativa
            </>
          ) : (
            <>
              <ShoppingCart className="size-4" />
              {loading ? "Redirecionando…" : "Assinar"}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
