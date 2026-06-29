import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAIInsights } from "@/lib/insights.functions";
import { Sparkles, Loader2, RefreshCw, Briefcase, Heart, Flame, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionLamp } from "@/components/SectionLamp";
import { InsufficientCreditsNotice } from "@/components/InsufficientCreditsNotice";


const AREA_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "Trabalho & Propósito": Briefcase,
  "Trabalho": Briefcase,
  "Relacionamentos": Heart,
  "Relações": Heart,
  "Energia & Corpo": Flame,
  "Energia interna": Flame,
};

export function AIInsights() {
  const fetchInsights = useServerFn(getAIInsights);
  const [nonce, setNonce] = useState(0);

  const { data, isLoading, isFetching, refetch, isError } = useQuery({
    queryKey: ["ai-insights", nonce],
    queryFn: () => fetchInsights({ data: undefined }),
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });

  return (
    <section className="glass-card rounded-2xl p-6 lg:p-8 gold-glow relative overflow-hidden">
      <div className="absolute inset-0 nebula-bg opacity-40 pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold flex items-center gap-2">
              <Sparkles className="size-3.5" /> Insights da IA
              <SectionLamp
              sectionKey="ai-insights"
                title="Insights da IA"
                why="Cada dia traz uma combinação única de trânsitos, fases lunares e vibrações numéricas. A IA conecta tudo isso ao seu mapa pessoal para gerar um resumo prático aplicável agora."
                how="Leia o texto de abertura, depois os três cards por área (Trabalho, Relacionamentos, Energia). Em cada um, observe 'Como está agora', 'Faça agora' e 'Evite'. Use 'Atualizar' para regerar quando quiser uma nova leitura."
                purpose="Transformar a complexidade do céu e dos números em ações concretas para o seu dia."
              />
            </p>
            <h2 className="font-serif text-2xl lg:text-3xl text-stardust mt-2">
              Como aplicar seu resumo prático <span className="text-gold">no agora</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Uma leitura curta que conecta sua essência ao momento atual.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={isLoading || isFetching}
            onClick={() => { setNonce((n) => n + 1); refetch(); }}
            className="border-gold/40 text-gold hover:bg-gold/10"
          >
            {isFetching ? <Loader2 className="size-3.5 animate-spin mr-2" /> : <RefreshCw className="size-3.5 mr-2" />}
            Atualizar
          </Button>
        </div>

        {isLoading && (
          <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-gold" />
            Lendo as correntes do dia...
          </div>
        )}

        {data?.notice && (
          <NoticeBanner message={data.notice} />
        )}

        {isError && !data?.notice && (
          <p className="mt-6 text-sm text-destructive">
            Não foi possível gerar os insights agora. Tente novamente em instantes.
          </p>
        )}


        {data && (
          <div className="mt-6 space-y-5">
            {data.context && (
              <div className="flex flex-wrap gap-2 text-[11px]">
                {data.context.sunSign && <Tag>Sol {data.context.sunSign}</Tag>}
                {data.context.moonSign && <Tag>Lua {data.context.moonSign}</Tag>}
                {data.context.ascSign && <Tag>Asc {data.context.ascSign}</Tag>}
                {data.context.lifePath && <Tag>Caminho {data.context.lifePath}</Tag>}
                {data.context.personalDay && <Tag>Dia pessoal {data.context.personalDay}</Tag>}
                <Tag>{data.context.moon}</Tag>
              </div>
            )}

            {data.intro && (
              <p className="font-serif text-lg text-stardust leading-relaxed">{data.intro}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.cards.map((c, i) => {
                const Icon = AREA_ICON[c.area] ?? Compass;
                return (
                  <div key={i} className="rounded-xl bg-secondary/30 border border-gold/15 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-gold/10 p-1.5"><Icon className="size-4 text-gold" /></div>
                      <h3 className="font-serif text-base text-stardust">{c.area}</h3>
                    </div>
                    <Block label="Como está agora" text={c.pulse} />
                    <Block label="Faça agora" text={c.doNow} accent />
                    <Block label="Evite" text={c.watchOut} />
                  </div>
                );
              })}
            </div>

            {data.closing && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-gold/40 pl-4">
                {data.closing}
              </p>
            )}

            {!data.hasData && (
              <p className="text-xs text-muted-foreground">
                Estas são orientações gerais. Complete seus dados de nascimento para personalizar.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-gold/30 bg-gold/5 px-2.5 py-0.5 text-gold uppercase tracking-wider">
      {children}
    </span>
  );
}

function Block({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <div>
      <span className={`uppercase tracking-wider text-[10px] ${accent ? "text-gold" : "text-muted-foreground"}`}>
        {label}
      </span>
      <p className="text-xs text-stardust mt-0.5 leading-relaxed">{text}</p>
    </div>
  );
}
