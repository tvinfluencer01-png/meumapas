import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatBirthDateBR } from "@/lib/numerology";
import { Hash, Heart, Eye, Sparkles, TreePine, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildSimplePdf, type SimplePdfBlock } from "@/lib/simple-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/numerologia-cabalistica")({
  component: NumerologiaCabalisticaPage,
  head: () => ({ meta: [{ title: "Numerologia Cabalística — Cosmic AI" }] }),
});

// Tabela cabalística (tradição hebraica adaptada ao alfabeto latino).
// Não utiliza o número 9 (considerado sagrado).
const CABALISTIC: Record<string, number> = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
  F: 8, P: 8,
};

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

// Redução cabalística: soma os dígitos até ficar entre 1 e 9.
// O 9 é considerado sagrado — devolvemos como 9 e a UI trata como caso especial.
const reduceCab = (n: number): number => {
  while (n > 9) n = String(n).split("").reduce((a, b) => a + Number(b), 0);
  return n;
};

const sumLetters = (name: string, filter: (ch: string) => boolean) => {
  const clean = stripDiacritics(name).replace(/[^A-Z]/g, "");
  let total = 0;
  for (const ch of clean) if (filter(ch) && CABALISTIC[ch]) total += CABALISTIC[ch];
  return total;
};

const reduceName = (sum: number): number | null => (sum > 0 ? reduceCab(sum) : null);

function computeCabalistic(fullName: string | null | undefined) {
  const safe = typeof fullName === "string" ? fullName.trim() : "";
  return {
    destiny: reduceName(sumLetters(safe, () => true)),         // nome completo
    soul: reduceName(sumLetters(safe, (c) => VOWELS.has(c))),  // vogais
    impression: reduceName(sumLetters(safe, (c) => !VOWELS.has(c))), // consoantes
  };
}

const CAB_MEANINGS: Record<number, { title: string; essence: string; guidance: string }> = {
  1: { title: "Aleph — O Iniciador", essence: "Energia divina criadora, unidade e liderança espiritual.", guidance: "Confie no impulso original; você é canal para começar algo novo." },
  2: { title: "Bet — O Receptáculo", essence: "Dualidade, parceria sagrada e equilíbrio entre opostos.", guidance: "Cultive escuta e cooperação; o sagrado se manifesta no encontro." },
  3: { title: "Guimel — A Manifestação", essence: "Verbo criador, expressão e fertilidade da palavra.", guidance: "Use a palavra com consciência: ela materializa realidades." },
  4: { title: "Dalet — A Porta", essence: "Estrutura, lei e construção do templo interior.", guidance: "Discipline corpo e mente; bases sólidas abrem portas reais." },
  5: { title: "Hé — O Sopro", essence: "Vida, liberdade e movimento do espírito sobre a matéria.", guidance: "Permita a mudança; o sopro divino renova o que precisa morrer." },
  6: { title: "Vav — A Conexão", essence: "União do céu e da terra, amor responsável e serviço.", guidance: "Sirva com amor sem se anular; harmonia nasce do limite justo." },
  7: { title: "Zain — A Espada", essence: "Discernimento, vitória interior e busca da verdade.", guidance: "Separe o essencial do supérfluo; o silêncio é seu mestre." },
  8: { title: "Chet — O Sagrado", essence: "Transcendência, poder espiritual e abundância iluminada.", guidance: "Eleve seu propósito material a serviço de algo maior." },
  9: { title: "Tet — A Luz Oculta", essence: "Número sagrado da plenitude divina; sabedoria que transcende a forma.", guidance: "Acolha o mistério: você canaliza uma vibração de serviço universal e compaixão." },
};

const CARDS = [
  { key: "destiny" as const, label: "Destino", icon: Sparkles, desc: "Vibração total do seu nome completo." },
  { key: "soul" as const, label: "Alma (Vogais)", icon: Heart, desc: "O que move seu interior sagrado." },
  { key: "impression" as const, label: "Impressão (Consoantes)", icon: Eye, desc: "A imagem que o mundo capta de você." },
];

function NumerologiaCabalisticaPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["cab-name", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const primary = await supabase.from("birth_data")
        .select("*").eq("user_id", user!.id).eq("is_primary", true).maybeSingle();
      let birth = primary.data;
      if (!birth) {
        const fallback = await supabase.from("birth_data")
          .select("*").eq("user_id", user!.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        birth = fallback.data;
      }
      const profile = await supabase.from("profiles")
        .select("full_name").eq("id", user!.id).maybeSingle();
      return { birth, profile: profile.data };
    },
    staleTime: 60_000,
  });

  const birth = data?.birth;
  const fullName =
    (birth?.full_name?.trim?.() ||
      data?.profile?.full_name?.trim?.() ||
      (user?.user_metadata as any)?.full_name?.trim?.() ||
      (user?.user_metadata as any)?.name?.trim?.() ||
      "");
  const nums = fullName ? computeCabalistic(fullName) : null;

  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!nums || !fullName) return;
    setDownloading(true);
    try {
      const labelOf = (k: "destiny" | "soul" | "impression") =>
        k === "destiny" ? "Destino" : k === "soul" ? "Alma (Vogais)" : "Impressão (Consoantes)";
      const descOf = (k: "destiny" | "soul" | "impression") =>
        k === "destiny"
          ? "Vibração total do seu nome completo — a missão que sua alma trouxe nesta encarnação."
          : k === "soul"
          ? "Soma das vogais — o que move seu interior sagrado, seus desejos mais profundos."
          : "Soma das consoantes — a imagem que o mundo capta de você, sua aura externa.";

      const blocks: SimplePdfBlock[] = [
        { type: "h2", text: "Introdução à Numerologia Cabalística" },
        {
          type: "p",
          text:
            "A numerologia cabalística é uma tradição milenar oriunda da Kabbalah hebraica. " +
            "Diferente da pitagórica, ela trabalha exclusivamente com o nome — a vibração sonora " +
            "que acompanha a alma desde o nascimento — e utiliza uma tabela inspirada no alfabeto " +
            "hebraico que vai de 1 a 8. O número 9 é considerado sagrado, ligado à plenitude divina, " +
            "e quando aparece é tratado como um sinal especial de serviço espiritual.",
        },
        {
          type: "p",
          text:
            "Cada letra do seu nome carrega uma vibração energética. Ao somar essas vibrações e " +
            "reduzi-las, revelamos três aspectos centrais do seu ser: o Destino (nome completo), " +
            "a Alma (vogais) e a Impressão (consoantes).",
        },
        { type: "h2", text: "Seus números" },
        {
          type: "kv",
          rows: [
            { k: "Nome analisado", v: fullName },
            ...(birth?.birth_date ? [{ k: "Data de nascimento", v: formatBirthDateBR(birth.birth_date) }] : []),
            { k: "Destino", v: String(nums.destiny ?? "—") },
            { k: "Alma (Vogais)", v: String(nums.soul ?? "—") },
            { k: "Impressão (Consoantes)", v: String(nums.impression ?? "—") },
          ],
        },
      ];

      (["destiny", "soul", "impression"] as const).forEach((k) => {
        const n = nums[k];
        const m = typeof n === "number" && n > 0 ? CAB_MEANINGS[n] : undefined;
        blocks.push({ type: "h2", text: `${labelOf(k)} — Número ${n ?? "—"}` });
        blocks.push({ type: "p", text: descOf(k) });
        if (m) {
          blocks.push({ type: "quote", text: m.title });
          blocks.push({ type: "p", text: `Essência: ${m.essence}` });
          blocks.push({ type: "p", text: `Orientação: ${m.guidance}` });
        }
      });

      blocks.push({ type: "h2", text: "Síntese cabalística" });
      blocks.push({
        type: "p",
        text:
          `Seu nome "${fullName}" vibra na frequência ${nums.destiny ?? "—"} como Destino, ` +
          `${nums.soul ?? "—"} como Alma e ${nums.impression ?? "—"} como Impressão. ` +
          `Esta combinação revela como a sua essência interior se manifesta no mundo e qual o ` +
          `chamado espiritual que acompanha sua jornada. Use estas vibrações como bússola — ` +
          `não como destino fechado, mas como mapa de potenciais a serem cultivados.`,
      });
      blocks.push({
        type: "list",
        items: [
          "Medite sobre a letra hebraica do seu número de Destino — ela carrega a chave da sua missão.",
          "Observe quando sua Alma se manifesta com mais força (relações íntimas, criação, silêncio).",
          "A Impressão é como o mundo te recebe — alinhe-a à sua verdade interior para evitar máscaras.",
          "Quando o número 9 aparece, acolha-o como um chamado ao serviço e à compaixão universal.",
        ],
      });

      const bytes = await buildSimplePdf({
        brand: "Cosmic AI",
        eyebrow: "Numerologia Cabalística",
        title: "A vibração hebraica do seu nome",
        subtitle: "Relatório completo da tradição cabalística",
        consultantName: fullName,
        meta: [
          `Emitido em ${new Date().toLocaleDateString("pt-BR")}`,
          ...(birth?.birth_date ? [`Nascimento: ${formatBirthDateBR(birth.birth_date)}`] : []),
        ],
        blocks,
      });

      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `numerologia-cabalistica-${fullName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Relatório gerado com sucesso");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar o relatório");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-gold flex items-center gap-2">
          <TreePine className="size-3.5" /> Numerologia Cabalística
        </p>
        <h1 className="font-serif text-3xl lg:text-5xl mt-2 shimmer-text">A vibração hebraica do seu nome</h1>
        <p className="mt-3 text-muted-foreground max-w-3xl">
          Diferente da pitagórica, a numerologia cabalística trabalha apenas com o nome (não com a data de nascimento)
          e utiliza uma tabela inspirada no alfabeto hebraico, reduzindo os valores entre 1 e 8 — o número 9 é
          considerado sagrado e não entra no resultado final.
        </p>
        {fullName && (
          <p className="mt-2 text-muted-foreground">{fullName}{birth?.birth_date ? ` — nascido em ${formatBirthDateBR(birth.birth_date)}` : ""}</p>
        )}
        {nums && (
          <div className="mt-4">
            <Button onClick={handleDownload} disabled={downloading} className="gap-2">
              {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {downloading ? "Gerando relatório…" : "Baixar relatório completo (PDF)"}
            </Button>
          </div>
        )}
      </header>

      {isLoading && (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          Carregando seus dados…
        </div>
      )}

      {!isLoading && error && (
        <div className="glass-card rounded-2xl p-12 text-center text-destructive">
          Não foi possível carregar seus dados. Tente novamente.
        </div>
      )}

      {!isLoading && !error && !nums && (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          {birth
            ? "Seu cadastro está sem o nome completo. Atualize em Configurações para revelar a vibração cabalística."
            : "Adicione seus dados de nascimento (com nome completo) para revelar a vibração cabalística."}
        </div>
      )}

      {nums && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CARDS.map((c) => {
              const n = nums[c.key];
              const meaning = typeof n === "number" && n > 0 ? CAB_MEANINGS[n] : undefined;
              const display = typeof n === "number" && n > 0 ? n : "—";
              return (
                <div key={c.key} className="glass-card rounded-2xl p-6 hover:gold-glow transition-all">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                    <c.icon className="size-3.5 text-gold" /> {c.label}
                  </div>
                  <div className="font-serif text-6xl text-stardust mt-3 shimmer-text">{display}</div>
                  <div className="mt-3">
                    <div className="font-serif text-lg text-gold">{meaning?.title ?? "—"}</div>
                    <p className="text-sm text-muted-foreground mt-1">{meaning?.essence ?? "Informe seu nome completo."}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 italic">{c.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="glass-card gold-glow rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 nebula-bg opacity-50 pointer-events-none" />
            <div className="relative space-y-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold">
                <Sparkles className="size-3.5" /> Orientação cabalística
              </div>
              {(["destiny", "soul", "impression"] as const).map((k) => {
                const n = nums[k];
                const m = typeof n === "number" && n > 0 ? CAB_MEANINGS[n] : undefined;
                if (!m) return null;
                const label = k === "destiny" ? "Destino" : k === "soul" ? "Alma" : "Impressão";
                return (
                  <div key={k} className="rounded-xl border border-gold/20 bg-background/30 p-4">
                    <div className="text-xs uppercase tracking-widest text-gold">{label} {n} — {m.title}</div>
                    <p className="text-sm text-stardust/90 mt-2">{m.guidance}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Hash className="size-3.5 text-gold" /> Tabela cabalística usada
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-sm">
              {Object.entries({
                "1": "A, I, J, Q, Y",
                "2": "B, K, R",
                "3": "C, G, L, S",
                "4": "D, M, T",
                "5": "E, H, N, X",
                "6": "U, V, W",
                "7": "O, Z",
                "8": "F, P",
              }).map(([n, letters]) => (
                <div key={n} className="rounded-lg border border-gold/15 bg-background/30 p-3">
                  <div className="font-serif text-2xl text-gold">{n}</div>
                  <div className="text-stardust/80">{letters}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
