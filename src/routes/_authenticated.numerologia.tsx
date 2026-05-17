import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { computeNumerology, NUMBER_MEANINGS, formatBirthDateBR } from "@/lib/numerology";
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
          <p className="mt-2 text-muted-foreground">{birth.full_name} — nascido em {formatBirthDateBR(birth.birth_date)}</p>
        )}
      </header>

      {!nums && (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          Adicione seus dados de nascimento para revelar os números.
        </div>
      )}

      {nums && (
        <>
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

          <NumerologySynthesis nums={nums} />
        </>
      )}
    </div>
  );
}

type Guidance = { expect: string; doNow: string; avoid: string; strength: string };

const GUIDANCE: Record<number, Guidance> = {
  1: { expect: "Oportunidades de assumir a frente e iniciar projetos próprios.", doNow: "Comece aquele projeto parado. Tome uma decisão sozinho esta semana.", avoid: "Esperar consenso, depender de aprovação, terceirizar a iniciativa.", strength: "Coragem, originalidade e foco." },
  2: { expect: "Parcerias importantes, contratos e situações que pedem escuta.", doNow: "Cultive uma relação-chave. Negocie com paciência em vez de impor.", avoid: "Comparações, indecisão crônica e absorver emoção alheia.", strength: "Diplomacia, sensibilidade e cooperação." },
  3: { expect: "Visibilidade, convites sociais e ideias criativas em abundância.", doNow: "Publique, fale, escreva. Mostre seu trabalho em vez de guardá-lo.", avoid: "Dispersão, fofoca e começar tudo sem terminar nada.", strength: "Expressão, alegria e magnetismo." },
  4: { expect: "Resultados via disciplina e construção lenta de bases sólidas.", doNow: "Organize finanças, rotina e contratos. Documente processos.", avoid: "Rigidez, teimosia e querer atalhos que sabotam o alicerce.", strength: "Método, lealdade e resistência." },
  5: { expect: "Mudanças, viagens, novos contatos e quebra de rotina.", doNow: "Diga sim ao novo, mas escolha uma direção principal.", avoid: "Excessos, impulsividade e fugir de compromissos.", strength: "Adaptabilidade, curiosidade e carisma." },
  6: { expect: "Responsabilidades de cuidado: família, lar, equipe, comunidade.", doNow: "Resolva uma pendência afetiva. Crie beleza no seu ambiente.", avoid: "Carregar o que não é seu, controlar o outro, martírio.", strength: "Amor, harmonia e senso de justiça." },
  7: { expect: "Períodos de introspecção, estudo e respostas internas.", doNow: "Reserve silêncio diário. Estude um tema profundo que te chama.", avoid: "Isolamento excessivo, frieza e ceticismo paralisante.", strength: "Sabedoria, análise e intuição refinada." },
  8: { expect: "Movimentos de dinheiro, poder e reconhecimento profissional.", doNow: "Negocie seu valor. Estruture um plano financeiro claro.", avoid: "Ganância, autoritarismo e atalhos éticos.", strength: "Visão estratégica, autoridade e abundância." },
  9: { expect: "Encerramentos, despedidas e chamados para servir o coletivo.", doNow: "Solte o que terminou. Doe tempo ou recurso a uma causa.", avoid: "Apego ao passado, vitimismo e drama emocional.", strength: "Compaixão, arte e visão ampla." },
  11: { expect: "Insights fortes, sincronicidades e papel de inspirar outros.", doNow: "Confie na intuição e compartilhe sua visão publicamente.", avoid: "Ansiedade, autocrítica e fugir do palco que te é dado.", strength: "Inspiração, canal espiritual e magnetismo sutil." },
  22: { expect: "Projetos grandes que podem virar legado concreto.", doNow: "Transforme uma visão em plano com prazos e parceiros.", avoid: "Pensar pequeno ou se perder em detalhes que travam a obra.", strength: "Manifestação prática de ideais elevados." },
  33: { expect: "Convites para ensinar, curar e cuidar em larga escala.", doNow: "Sirva com limite saudável. Ensine algo que dominou.", avoid: "Salvacionismo, exaustão e culpa por descansar.", strength: "Amor incondicional e serviço com sabedoria." },
};

function NumerologySynthesis({ nums }: { nums: ReturnType<typeof computeNumerology> }) {
  const lp = NUMBER_MEANINGS[nums.life_path];
  const ds = NUMBER_MEANINGS[nums.destiny];
  const gLp = GUIDANCE[nums.life_path];
  const gDs = GUIDANCE[nums.destiny];
  const gSu = GUIDANCE[nums.soul_urge];

  return (
    <div className="glass-card gold-glow rounded-2xl p-6 mt-6 relative overflow-hidden">
      <div className="absolute inset-0 nebula-bg opacity-50 pointer-events-none" />
      <div className="relative space-y-5">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold">
            <Sparkles className="size-3.5" /> Síntese prática
          </div>
          <p className="mt-3 text-stardust font-serif text-lg leading-relaxed">
            Seu Caminho de Vida <span className="text-gold">{nums.life_path} — {lp?.title}</span>{" "}
            te coloca para realizar o Destino{" "}
            <span className="text-gold">{nums.destiny} — {ds?.title}</span>. Abaixo, o que isso
            significa na prática: o que esperar, o que fazer agora e o que evitar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: `Caminho de Vida ${nums.life_path}`, g: gLp, hint: "O cenário da sua jornada" },
            { label: `Destino ${nums.destiny}`, g: gDs, hint: "O que você veio realizar" },
            { label: `Alma ${nums.soul_urge}`, g: gSu, hint: "O que te move por dentro" },
          ].filter((x) => x.g).map((x) => (
            <div key={x.label} className="rounded-xl border border-gold/20 bg-background/30 p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-gold">{x.label}</div>
              <div className="text-[11px] text-muted-foreground italic">{x.hint}</div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-stardust/70">O que esperar</div>
                <p className="text-sm text-stardust/90">{x.g!.expect}</p>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-stardust/70">Faça agora</div>
                <p className="text-sm text-stardust/90">{x.g!.doNow}</p>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-stardust/70">Evite</div>
                <p className="text-sm text-stardust/90">{x.g!.avoid}</p>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-stardust/70">Sua força</div>
                <p className="text-sm text-stardust/90">{x.g!.strength}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Use o Caminho de Vida como bússola de longo prazo, o Destino como roteiro de carreira
          e propósito, e a Alma como termômetro do que te dá sentido. Quando os três se alinham
          em uma mesma decisão, é sinal verde para agir.
        </p>
      </div>
    </div>
  );
}
