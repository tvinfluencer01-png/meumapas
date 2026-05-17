import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { computeNumerology, NUMBER_MEANINGS } from "@/lib/numerology";
import { Hash, Heart, Eye, User as UserIcon, Cake, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/numerologia")({
  component: NumerologiaPage,
  head: () => ({ meta: [{ title: "Numerologia — Cosmic AI" }] }),
});

const CARDS = [
  { key: "life_path", label: "Caminho de Vida", icon: Sparkles, desc: "A trilha mestra desta encarnação." },
  { key: "destiny", label: "Destino / Expressão", icon: Hash, desc: "O que você veio realizar." },
  { key: "soul_urge", label: "Número da Alma", icon: Heart, desc: "O que sua essência mais deseja." },
  { key: "personality", label: "Personalidade", icon: Eye, desc: "Como o mundo te percebe." },
  { key: "birthday", label: "Aniversário", icon: Cake, desc: "Talento natural inscrito no dia." },
  { key: "expression", label: "Expressão", icon: UserIcon, desc: "Vibração do seu nome completo." },
] as const;

function NumerologiaPage() {
  const { user } = useAuth();
  const { data: birth } = useQuery({
    queryKey: ["birth", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("birth_data")
        .select("*").eq("user_id", user!.id).eq("is_primary", true).maybeSingle();
      return data;
    },
  });

  const nums = birth ? computeNumerology(birth.full_name, birth.birth_date) : null;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Numerologia Cabalística</p>
        <h1 className="font-serif text-3xl lg:text-5xl mt-2 shimmer-text">Os números da sua alma</h1>
        {birth && (
          <p className="mt-2 text-muted-foreground">{birth.full_name} — nascido em {new Date(birth.birth_date).toLocaleDateString("pt-BR")}</p>
        )}
      </header>

      {!nums && (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          Adicione seus dados de nascimento para revelar os números.
        </div>
      )}

      {nums && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((c) => {
            const n = (nums as any)[c.key] as number;
            const meaning = NUMBER_MEANINGS[n];
            return (
              <div key={c.key} className="glass-card rounded-2xl p-6 hover:gold-glow transition-all">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <c.icon className="size-3.5 text-gold" /> {c.label}
                </div>
                <div className="font-serif text-6xl text-stardust mt-3 shimmer-text">{n}</div>
                <div className="mt-3">
                  <div className="font-serif text-lg text-gold">{meaning?.title}</div>
                  <p className="text-sm text-muted-foreground mt-1">{meaning?.essence}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-3 italic">{c.desc}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
