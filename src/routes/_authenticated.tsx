import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Starfield } from "@/components/Starfield";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard, CircleDot, Hash, MessageCircle, LogOut, Menu, X, ScrollText, Shield, Settings, Coins, Wand2, TreePine, Crown, Infinity as InfinityIcon, FileBadge, User as UserIcon, Palette, Users, UserCircle2, Loader2, Sun, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { showFeedback } from "@/components/system-feedback";
import { getMyAdminStatus } from "@/lib/roles.functions";

import { listClientProfiles, setActiveClientProfile } from "@/lib/client-profiles.functions";

const SELF_VALUE = "__self__";

export const Route = createFileRoute("/_authenticated")({
  component: AuthedLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  addonId?: string;
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clientes", label: "Clientes", icon: Users, addonId: "sub_astrologer_numerologist" },
  { to: "/mapa-astral", label: "Mapa Astral", icon: CircleDot },
  { to: "/numerologia", label: "Numerologia", icon: Hash },
  { to: "/numerologia-cabalistica", label: "Numerologia Cabalística", icon: Hash, addonId: "sub_kabbalistic_numerology" },
  { to: "/tarot", label: "Tarot", icon: Wand2, addonId: "sub_tarot_unlimited" },
  { to: "/meditacao", label: "Meditação Cabalística", icon: TreePine, addonId: "sub_kabbalah_unlimited" },
  { to: "/horoscopo", label: "Horóscopo Diário", icon: Sun, addonId: "sub_daily_horoscope" },
  { to: "/mapa-empresarial", label: "Mapa Empresarial", icon: Building2, addonId: "sub_business_map" },
  { to: "/oraculo", label: "Oráculo IA", icon: MessageCircle },
  { to: "/relatorios", label: "Relatórios", icon: ScrollText },
  { to: "/addons", label: "Add-ons", icon: Coins },
];

const ADDON_MENU: Record<string, { label: string; to: string; icon: typeof LayoutDashboard }> = {
  sub_branding_pdf: { label: "Branding PDF", to: "/configuracoes", icon: FileBadge },
  sub_pdf_css: { label: "PDF CSS Avançado", to: "/pdf-css", icon: Palette },
};

const MAIN_MENU_BADGES: Record<string, { label: string; addonId: string }> = {
  "/relatorios": { label: "Relatórios Ilimitados", addonId: "sub_unlimited_reports" },
  "/oraculo": { label: "Oráculo Premium", addonId: "sub_oracle_premium" },
  "/numerologia-cabalistica": { label: "Numerologia Cabalística", addonId: "sub_kabbalistic_numerology" },
  "/tarot": { label: "Tarot", addonId: "sub_tarot_unlimited" },
  "/meditacao": { label: "Meditação Cabalística", addonId: "sub_kabbalah_unlimited" },
  "/horoscopo": { label: "Horóscopo Diário", addonId: "sub_daily_horoscope" },
  "/mapa-empresarial": { label: "Mapa Empresarial", addonId: "sub_business_map" },
};


function AuthedLayout() {
  const { signOut, user, loading } = useAuth();
  const router = useRouter();
  const checkAdminFn = useServerFn(getMyAdminStatus);
  const [open, setOpen] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeAddons, setActiveAddons] = useState<Set<string>>(new Set());
  const [activePlanName, setActivePlanName] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  


  // Saldo de créditos + pico histórico para calcular a barra
  const { data: credits } = useQuery({
    queryKey: ["sidebar-credits", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: bal }, { data: peak }] = await Promise.all([
        supabase.from("user_credits").select("balance").eq("user_id", user!.id).maybeSingle(),
        supabase
          .from("credit_transactions")
          .select("balance_after")
          .eq("user_id", user!.id)
          .order("balance_after", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      return {
        balance: bal?.balance ?? 0,
        peak: Math.max(peak?.balance_after ?? 0, bal?.balance ?? 0, 5),
      };
    },
    refetchOnWindowFocus: false,
  });

  const balance = credits?.balance ?? 0;
  const peak = credits?.peak ?? 5;
  const pct = Math.max(0, Math.min(100, (balance / peak) * 100));

  useEffect(() => {
    if (!loading || !user) {
      setProfileChecked(false);
    }
  }, [loading, user]);

  useEffect(() => {
    if (!loading && !user) {
      router.navigate({ to: "/auth", replace: true });
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (loading || !user) return;
    (async () => {
      const [{ data: profile }, adminCheck, { data: subs }] = await Promise.all([
        supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle(),
        checkAdminFn().catch(() => ({ isAdmin: false })),
        supabase.from("user_subscriptions").select("addon_id, status, current_period_end").eq("user_id", user.id).eq("status", "active"),
      ]);
      const userIsAdmin = !!adminCheck?.isAdmin;
      setIsAdmin(userIsAdmin);
      const now = Date.now();
      const activeSubs = (subs ?? []).filter(
        (s) => !s.current_period_end || new Date(s.current_period_end).getTime() > now,
      );
      setActiveAddons(new Set(activeSubs.map((s) => s.addon_id)));
      const slugs = activeSubs.map((s) => s.addon_id);
      if (slugs.length > 0) {
        const { data: pkgs } = await supabase
          .from("landing_packages")
          .select("slug, name")
          .in("slug", slugs);
        const plan = (pkgs ?? []).find((p) => slugs.includes(p.slug));
        setActivePlanName(plan?.name ?? null);
      } else {
        setActivePlanName(null);
      }
      const path = router.state.location.pathname;
      if (profile && !profile.onboarding_completed && path !== "/onboarding") {
        router.navigate({ to: "/onboarding" });
        return;
      }
      // Gate de pacote: sem pacote ativo, envia para a página de ativação.
      // Admins têm acesso liberado; onboarding é permitido para coletar dados.
      if (activeSubs.length === 0 && !userIsAdmin && path !== "/onboarding") {
        router.navigate({ to: "/ativacao", replace: true });
        return;
      }
      setProfileChecked(true);
    })();
  }, [loading, user, router, checkAdminFn]);

  async function handleSignOut() {
    await signOut();
    router.navigate({ to: "/" });
  }

  if (loading || !user || !profileChecked) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Logo sizeClassName="size-24" animation="loading" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Starfield count={60} className="fixed" />

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <Logo sizeClassName="size-10" animation="float" />
          <span className="font-serif text-lg shimmer-text">Código Cósmico</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </header>

      <div className="relative z-10 flex">
        {/* Sidebar */}
        <aside className={`${open ? "flex" : "hidden"} lg:flex flex-col fixed lg:sticky inset-0 lg:inset-auto lg:top-0 z-20 lg:z-auto h-screen w-full lg:w-64 border-r border-border bg-background/90 backdrop-blur-xl`}>
          <div className="hidden lg:flex items-center gap-2.5 px-6 py-6 border-b border-border shrink-0">
            <Logo sizeClassName="size-12" animation="float" />
            <span className="font-serif text-xl shimmer-text">Código Cósmico</span>
          </div>
          <div className="px-4 pt-3">
            <ActiveClientSwitcher />
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-gold">

            {NAV.filter((item) => !item.addonId || activeAddons.has(item.addonId)).map((item) => {
              const badge = MAIN_MENU_BADGES[item.to];
              const isBadgeActive = badge && activeAddons.has(badge.addonId);
              
              return (
                <Link
                  key={item.to} to={item.to} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-gold hover:bg-secondary/40 transition-colors"
                  activeProps={{ className: "bg-secondary text-gold border border-gold/20" }}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {isBadgeActive && (
                    <span className="text-[8px] font-bold uppercase leading-none px-1 py-0.5 rounded bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.3)] animate-pulse">
                      ATIVO
                    </span>
                  )}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin" onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-gold hover:bg-secondary/40 transition-colors"
                activeProps={{ className: "bg-secondary text-gold border border-gold/20" }}
              >
                <Shield className="size-4" /> Admin
              </Link>
            )}
            <div className="pt-4 mt-2 border-t border-border/60">
              <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-gold/70">
                Meus Add-ons
              </div>
              {Object.entries(ADDON_MENU).map(([id, entry]) => {
                const Icon = entry.icon;
                const isActive = activeAddons.has(id);
                return (
                  <Link
                    key={id}
                    to={entry.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-gold hover:bg-secondary/40 transition-colors"
                    activeProps={{ className: "bg-secondary text-gold border border-gold/20" }}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{entry.label}</span>
                    {isActive && (
                      <span className="text-[8px] font-semibold uppercase leading-none px-1 py-0.5 rounded bg-green-600 text-white">
                        Ativo
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="shrink-0 p-4 border-t border-border bg-background/90 space-y-3">
            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/40 transition-colors text-left group"
              aria-label="Abrir configurações do perfil"
            >
              <span className="grid place-items-center size-9 rounded-full bg-gold/15 border border-gold/30 text-gold group-hover:bg-gold/25 transition-colors shrink-0">
                <UserIcon className="size-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-stardust truncate">{user?.email}</div>
                {activePlanName && (
                  <div className="text-[10px] uppercase tracking-wider text-gold/80 truncate mt-0.5">
                    {activePlanName}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold to-amber-300 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-gold font-medium shrink-0">
                    {balance}
                  </span>
                </div>
              </div>
            </button>
            <Button onClick={handleSignOut} variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive">
              <LogOut className="size-4 mr-2" /> Sair
            </Button>
          </div>
        </aside>

        <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />

        <main className="flex-1 min-h-screen lg:pl-0">
          <div className="p-4 lg:p-8 max-w-7xl mx-auto">
            <ActiveContextBanner />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function ActiveContextBanner() {
  const listFn = useServerFn(listClientProfiles);
  const { data } = useQuery({
    queryKey: ["client-profiles-switcher"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });
  const activeId = data?.active_client_profile_id ?? null;
  const profile = activeId ? data?.profiles.find((p) => p.id === activeId) : null;
  const name = profile?.full_name ?? "Eu mesmo";
  const isSelf = !activeId;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-gold/30 bg-secondary/40 backdrop-blur px-3 py-2">
      {isSelf ? (
        <UserCircle2 className="size-4 text-gold shrink-0" />
      ) : (
        <Users className="size-4 text-gold shrink-0" />
      )}
      <span className="text-[10px] uppercase tracking-[0.2em] text-gold/70">
        Contexto ativo:
      </span>
      <span className="text-sm font-serif text-gold truncate">{name}</span>
      <span className="ml-auto text-[10px] font-mono text-muted-foreground truncate">
        ID: {activeId ?? "self"}
      </span>
    </div>
  );
}

function ActiveClientSwitcher() {
  const qc = useQueryClient();
  const listFn = useServerFn(listClientProfiles);
  const setActiveFn = useServerFn(setActiveClientProfile);
  const [confirmName, setConfirmName] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["client-profiles-switcher"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const profiles = data?.profiles ?? [];
  const activeId = data?.active_client_profile_id ?? null;
  const currentValue = activeId ?? SELF_VALUE;

  const mutation = useMutation({
    mutationFn: (id: string | null) => setActiveFn({ data: { id } }),
    onSuccess: async (_r, id) => {
      const name = id
        ? profiles.find((p) => p.id === id)?.full_name ?? "Cliente"
        : "Eu mesmo";
      // Atualiza o switcher imediatamente para refletir o novo contexto
      qc.setQueryData(["client-profiles-switcher"], (old: typeof data) =>
        old ? { ...old, active_client_profile_id: id } : old,
      );
      qc.setQueryData(["client-profiles"], (old: typeof data) =>
        old ? { ...old, active_client_profile_id: id } : old,
      );
      await qc.cancelQueries({ queryKey: ["active-subject"] });
      qc.removeQueries({ queryKey: ["active-subject"] });
      // Aguarda o reprocessamento de todas as telas (re-fetch global) antes de confirmar
      await qc.invalidateQueries();
      setConfirmName(name);
    },
      onError: (e: Error) => showFeedback({ title: "Erro ao trocar contexto", description: e.message, type: "error" }),
  });

  if (profiles.length === 0 && !activeId) return null;

  const isSwitching = mutation.isPending || !!confirmName;

  function handleChange(value: string) {
    const id = value === SELF_VALUE ? null : value;
    mutation.mutate(id);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-gold/80">
          Contexto ativo
        </span>
        <Link to="/clientes" className="text-[10px] text-muted-foreground hover:text-gold transition-colors">
          gerenciar
        </Link>
      </div>
      <div className="relative">
        <Select value={currentValue} onValueChange={handleChange} disabled={isSwitching}>
          <SelectTrigger className="w-full h-9 text-xs bg-background/60 border-gold/30 hover:border-gold/60 disabled:opacity-100 disabled:cursor-wait">
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={SELF_VALUE}>
                <span className="flex items-center gap-2">
                  <UserCircle2 className="size-3.5 text-gold" /> Eu mesmo
                </span>
              </SelectItem>
            </SelectGroup>
            {profiles.length > 0 && (
              <>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase tracking-wider text-gold/70">
                    Meus clientes
                  </SelectLabel>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <Users className="size-3.5 text-gold" /> {p.full_name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            )}
          </SelectContent>
        </Select>
        {mutation.isPending && (
          <div className="pointer-events-none absolute inset-y-0 right-8 flex items-center">
            <Loader2 className="size-3.5 text-gold animate-spin" />
          </div>
        )}
      </div>
      {mutation.isPending && (
        <p className="flex items-center gap-1.5 text-[10px] text-gold/80">
          <Loader2 className="size-3 animate-spin" />
          Reprocessando contexto...
        </p>
      )}

      <Dialog open={!!confirmName} onOpenChange={(o) => !o && setConfirmName(null)}>
        <DialogContent className="border-gold/30 bg-background/95 backdrop-blur">
          <DialogHeader>
            <DialogTitle className="font-serif shimmer-text flex items-center gap-2">
              <UserCircle2 className="size-5 text-gold" /> Contexto alterado
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm">
              A partir de agora, todo o sistema (Mapa Astral, Numerologia, Relatórios, Oráculo, etc.)
              passará a operar no contexto de:
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-gold/30 bg-secondary/40 px-4 py-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-gold/70">Contexto ativo</div>
            <div className="mt-1 text-lg font-serif text-gold">{confirmName}</div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setConfirmName(null)}
              className="bg-gradient-to-r from-gold to-amber-300 text-background hover:opacity-90"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
