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
  head: () => ({ meta: [{ title: "Numerologia Cabalística — Código Cósmico" }] }),
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

const CAB_MEANINGS: Record<number, { title: string; essence: string; guidance: string; hebrewLetter: string; letterName: string; deepMeaning: string }> = {
  1: { title: "Aleph — O Iniciador", hebrewLetter: "א", letterName: "Aleph", essence: "Energia divina criadora, unidade e liderança espiritual.", guidance: "Confie no impulso original; você é canal para começar algo novo.", deepMeaning: "Aleph é a primeira letra do alfabeto hebraico, silenciosa, representando o Sopro Divino antes da palavra. É a unidade absoluta (Echad), o ponto onde tudo começa. Quem vibra em 1 é pioneiro, traz fogo original, mas precisa cuidar do orgulho e da solidão do líder." },
  2: { title: "Bet — O Receptáculo", hebrewLetter: "ב", letterName: "Bet", essence: "Dualidade, parceria sagrada e equilíbrio entre opostos.", guidance: "Cultive escuta e cooperação; o sagrado se manifesta no encontro.", deepMeaning: "Bet significa 'casa' (Bayit) — é o útero, o templo, o espaço que acolhe. Inicia a Torá (Bereshit). Vibrar em 2 é ser ponte entre mundos, mediador, mas exige aprender a habitar o próprio centro antes de servir aos outros." },
  3: { title: "Guimel — A Manifestação", hebrewLetter: "ג", letterName: "Guimel", essence: "Verbo criador, expressão e fertilidade da palavra.", guidance: "Use a palavra com consciência: ela materializa realidades.", deepMeaning: "Guimel é o camelo (Gamal) — aquele que atravessa o deserto carregando água. Representa generosidade, movimento e a palavra que nutre. Em 3 vive o artista, o comunicador, o mestre — mas a palavra também fere quando desalinhada do coração." },
  4: { title: "Dalet — A Porta", hebrewLetter: "ד", letterName: "Dalet", essence: "Estrutura, lei e construção do templo interior.", guidance: "Discipline corpo e mente; bases sólidas abrem portas reais.", deepMeaning: "Dalet é a porta (Delet) — o limiar entre o profano e o sagrado. Carrega humildade (do pobre que pede passagem). Em 4 vibra o construtor, o engenheiro da alma, alguém que materializa o invisível. Cuidado com o excesso de rigidez." },
  5: { title: "Hé — O Sopro", hebrewLetter: "ה", letterName: "Hé", essence: "Vida, liberdade e movimento do espírito sobre a matéria.", guidance: "Permita a mudança; o sopro divino renova o que precisa morrer.", deepMeaning: "Hé é o sopro suave, presente no nome de Deus (YHVH) duas vezes. Representa a respiração divina que dá vida ao barro. Em 5 mora o viajante, o curioso, o que liberta — mas precisa aprender que liberdade verdadeira nasce do compromisso." },
  6: { title: "Vav — A Conexão", hebrewLetter: "ו", letterName: "Vav", essence: "União do céu e da terra, amor responsável e serviço.", guidance: "Sirva com amor sem se anular; harmonia nasce do limite justo.", deepMeaning: "Vav é o gancho que conecta — visualmente uma linha vertical unindo o alto e o baixo. É a conjunção 'e' que une todas as coisas. Em 6 vive o curador, o pai/mãe espiritual, aquele que sustenta. Lembre-se: servir não é se anular." },
  7: { title: "Zain — A Espada", hebrewLetter: "ז", letterName: "Zain", essence: "Discernimento, vitória interior e busca da verdade.", guidance: "Separe o essencial do supérfluo; o silêncio é seu mestre.", deepMeaning: "Zain é a espada/cetro — instrumento de discernimento e governo. Liga-se ao Shabat (sétimo dia), ao descanso sagrado. Em 7 vibra o místico, o pesquisador, o eremita. A solidão é seu templo, mas isolamento prolongado o afasta da missão." },
  8: { title: "Chet — O Sagrado", hebrewLetter: "ח", letterName: "Chet", essence: "Transcendência, poder espiritual e abundância iluminada.", guidance: "Eleve seu propósito material a serviço de algo maior.", deepMeaning: "Chet representa a vida (Chai = 18 = 8+10), o sopro vital que transcende o material. É a oitava que renova a oitava anterior. Em 8 vive o executivo iluminado, o que prospera servindo. Riqueza sem propósito vira prisão; com propósito, vira templo." },
  9: { title: "Tet — A Luz Oculta", hebrewLetter: "ט", letterName: "Tet", essence: "Número sagrado da plenitude divina; sabedoria que transcende a forma.", guidance: "Acolha o mistério: você canaliza uma vibração de serviço universal e compaixão.", deepMeaning: "Tet é o ventre, a luz escondida na matéria, o bem (Tov) que se revela após gestação. Na Cabala é o nono mês, a plenitude. Quem vibra em 9 é o humanitarista, o sábio anônimo. Sua missão é servir sem apego ao reconhecimento." },
};

// Alfabeto hebraico completo (22 letras) — para o relatório
const HEBREW_ALPHABET: { letter: string; name: string; value: number; meaning: string }[] = [
  { letter: "א", name: "Aleph", value: 1, meaning: "Boi / Sopro divino — unidade, início, mestre silencioso." },
  { letter: "ב", name: "Bet", value: 2, meaning: "Casa — receptáculo, lar, dualidade sagrada." },
  { letter: "ג", name: "Guimel", value: 3, meaning: "Camelo — generosidade, movimento, palavra que nutre." },
  { letter: "ד", name: "Dalet", value: 4, meaning: "Porta — humildade, limiar, abertura." },
  { letter: "ה", name: "Hé", value: 5, meaning: "Janela / Sopro — vida, revelação, presença divina." },
  { letter: "ו", name: "Vav", value: 6, meaning: "Gancho — conexão, união entre céu e terra." },
  { letter: "ז", name: "Zain", value: 7, meaning: "Espada — discernimento, descanso sagrado." },
  { letter: "ח", name: "Chet", value: 8, meaning: "Cerca / Vida — transcendência, vitalidade." },
  { letter: "ט", name: "Tet", value: 9, meaning: "Serpente / Ventre — luz oculta, bondade interior." },
  { letter: "י", name: "Yod", value: 10, meaning: "Mão — semente divina, ponto criador." },
  { letter: "כ", name: "Kaf", value: 20, meaning: "Palma da mão — potencial realizado, coroa." },
  { letter: "ל", name: "Lamed", value: 30, meaning: "Aguilhão — aprendizado, ensino, ascensão." },
  { letter: "מ", name: "Mem", value: 40, meaning: "Águas — sabedoria fluida, ventre cósmico." },
  { letter: "נ", name: "Nun", value: 50, meaning: "Peixe — fé, continuidade, queda e ressurreição." },
  { letter: "ס", name: "Samech", value: 60, meaning: "Apoio — sustentação divina, ciclo." },
  { letter: "ע", name: "Ayin", value: 70, meaning: "Olho — visão profunda, percepção espiritual." },
  { letter: "פ", name: "Pé", value: 80, meaning: "Boca — palavra falada, expressão." },
  { letter: "צ", name: "Tsadê", value: 90, meaning: "Anzol — justiça, retidão do justo." },
  { letter: "ק", name: "Qof", value: 100, meaning: "Nuca — santidade, ciclos, mistério." },
  { letter: "ר", name: "Resh", value: 200, meaning: "Cabeça — princípio, liderança, pobreza espiritual." },
  { letter: "ש", name: "Shin", value: 300, meaning: "Dente / Fogo — transformação, sopro divino, Shaddai." },
  { letter: "ת", name: "Tav", value: 400, meaning: "Cruz / Selo — verdade, completude, marca." },
];

// Transliteração Latim → Hebraico (aproximação fonética usada na cabala ocidental).
// Cada letra latina é mapeada para uma letra hebraica; X vira duas letras (קס).
const LATIN_TO_HEBREW: Record<string, string> = {
  A: "א", B: "ב", C: "כ", D: "ד", E: "ע", F: "פ", G: "ג", H: "ה",
  I: "י", J: "י", K: "כ", L: "ל", M: "מ", N: "נ", O: "ו", P: "פ",
  Q: "ק", R: "ר", S: "ס", T: "ת", U: "ו", V: "ו", W: "ו", X: "קס",
  Y: "י", Z: "ז",
};
// Formas finais (sofit) — aplicadas à última letra de cada palavra.
const FINAL_FORM: Record<string, string> = {
  "כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ",
};

function transliterateWord(latinWord: string): string {
  const clean = stripDiacritics(latinWord).replace(/[^A-Z]/g, "");
  let heb = "";
  for (const ch of clean) heb += LATIN_TO_HEBREW[ch] ?? "";
  // Aplica forma final na última letra (se existir variante sofit)
  if (heb.length > 0) {
    const last = heb[heb.length - 1];
    if (FINAL_FORM[last]) heb = heb.slice(0, -1) + FINAL_FORM[last];
  }
  return heb;
}

function transliterateName(fullName: string): { words: string[]; latinWords: string[]; uniqueLetters: string[] } {
  const latinWords = fullName.trim().split(/\s+/).filter(Boolean);
  const words = latinWords.map(transliterateWord);
  const seen = new Set<string>();
  const uniqueLetters: string[] = [];
  for (const w of words) {
    for (const ch of w) {
      // Normaliza forma final para a base ao listar letras únicas para meditação
      const base = Object.entries(FINAL_FORM).find(([, f]) => f === ch)?.[0] ?? ch;
      if (!seen.has(base)) {
        seen.add(base);
        uniqueLetters.push(base);
      }
    }
  }
  return { words, latinWords, uniqueLetters };
}

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

      // Dicas direcionais personalizadas por número de Destino (1-9)
      const ACTION_TIPS: Record<number, { focus: string; do: string[]; avoid: string[]; mantra: string }> = {
        1: {
          focus: "Liderar com originalidade e iniciar ciclos novos.",
          do: ["Inicie aquele projeto que vem adiando — você é o motor.", "Tome decisões sozinho quando necessário; confie no impulso pioneiro.", "Cultive disciplina física: caminhe, respire, ancore a energia."],
          avoid: ["Esperar consenso para agir.", "Orgulho que isola; lembre que liderança é serviço."],
          mantra: "Eu sou o início. O Eterno age através de mim.",
        },
        2: {
          focus: "Construir parcerias sagradas e mediar opostos.",
          do: ["Invista em uma relação-chave: escute mais do que fala.", "Trabalhe em dupla ou em conselhos; sua força nasce do encontro.", "Crie rotinas de pausa para se reconectar consigo antes de servir."],
          avoid: ["Anular-se para agradar.", "Decidir sob pressão emocional do outro."],
          mantra: "Sou ponte entre mundos, e habito meu próprio centro.",
        },
        3: {
          focus: "Expressar, criar e comunicar com o coração.",
          do: ["Escreva, cante, fale em público — sua palavra cura.", "Compartilhe sua arte mesmo sem se sentir 'pronto'.", "Filtre o que diz: cada palavra materializa realidades."],
          avoid: ["Dispersar energia em muitos projetos sem terminar nenhum.", "Crítica destrutiva (sua ou alheia)."],
          mantra: "Minha palavra é semente. Falo do coração e colho luz.",
        },
        4: {
          focus: "Construir bases sólidas e disciplinar corpo e mente.",
          do: ["Crie uma rotina diária inegociável (corpo, estudo, oração).", "Estruture finanças, agenda e ambiente — ordem externa cria paz interna.", "Termine projetos pendentes antes de iniciar novos."],
          avoid: ["Rigidez que sufoca o sagrado.", "Trabalho excessivo sem descanso."],
          mantra: "Sou construtor do templo. Cada tijolo é oração.",
        },
        5: {
          focus: "Movimento, liberdade consciente e renovação.",
          do: ["Permita mudanças: viaje, mude de cidade, experimente o novo.", "Escolha um compromisso essencial e honre-o — liberdade nasce do foco.", "Pratique respiração consciente (pranayama, meditação do sopro)."],
          avoid: ["Fugir das emoções por meio de excessos (comida, sexo, álcool, telas).", "Quebrar todos os vínculos em nome de uma 'liberdade' ilusória."],
          mantra: "Sou o sopro divino. Mudo, fluo e permaneço fiel à essência.",
        },
        6: {
          focus: "Amar com responsabilidade e servir com limites.",
          do: ["Cuide de quem ama — mas estabeleça limites claros.", "Crie beleza no seu lar: arte, plantas, harmonia visual.", "Procure mediação ou cura quando há conflito familiar."],
          avoid: ["Carregar o peso emocional de todos ao redor.", "Sacrifício que vira ressentimento."],
          mantra: "Amo de pé. Sirvo sem me anular.",
        },
        7: {
          focus: "Buscar a verdade e cultivar o silêncio místico.",
          do: ["Reserve tempo diário de silêncio, leitura sagrada ou meditação.", "Estude profundamente um único caminho espiritual.", "Confie em sua intuição mais do que em opiniões alheias."],
          avoid: ["Isolamento prolongado que vira fuga do mundo.", "Excesso de análise que paralisa a ação."],
          mantra: "No silêncio, o Eterno me fala. Discerno e ajo.",
        },
        8: {
          focus: "Prosperar materialmente a serviço do propósito espiritual.",
          do: ["Assuma cargos de liderança e responsabilidade financeira.", "Vincule sua prosperidade a uma causa maior (tzedacá, dízimo, mecenato).", "Cuide do corpo: o 8 exige vitalidade para sustentar o poder."],
          avoid: ["Apego ao status, ganância, poder sem ética.", "Confundir valor pessoal com saldo bancário."],
          mantra: "Recebo abundância para distribuir luz. Prospero servindo.",
        },
        9: {
          focus: "Servir à humanidade com compaixão e sabedoria universal.",
          do: ["Engaje-se em causas humanitárias, ensino ou cura.", "Pratique o desapego: o 9 finaliza ciclos para abrir o novo.", "Cultive a arte, a beleza e o perdão como práticas espirituais."],
          avoid: ["Martirização ou expectativa de reconhecimento.", "Apego ao passado ou a relações que já cumpriram seu ciclo."],
          mantra: "Sou luz oculta servindo o todo. Solto o que foi, abençoo o que vem.",
        },
      };

      const dn = typeof nums.destiny === "number" ? nums.destiny : null;
      const sn = typeof nums.soul === "number" ? nums.soul : null;
      const ino = typeof nums.impression === "number" ? nums.impression : null;
      const dMean = dn ? CAB_MEANINGS[dn] : null;
      const sMean = sn ? CAB_MEANINGS[sn] : null;
      const iMean = ino ? CAB_MEANINGS[ino] : null;
      const tips = dn ? ACTION_TIPS[dn] : null;

      const blocks: SimplePdfBlock[] = [
        // ───── Resumo executivo no topo ─────
        { type: "h2", text: "Resumo executivo" },
        {
          type: "p",
          text:
            `Olá, ${fullName}. Seu nome carrega três vibrações cabalísticas centrais: ` +
            `Destino ${dn ?? "—"}${dMean ? ` (${dMean.letterName} ${dMean.hebrewLetter})` : ""}, ` +
            `Alma ${sn ?? "—"}${sMean ? ` (${sMean.letterName})` : ""} e ` +
            `Impressão ${ino ?? "—"}${iMean ? ` (${iMean.letterName})` : ""}. ` +
            (tips ? `Seu foco existencial é: ${tips.focus} ` : "") +
            "Use as próximas páginas como bússola — leia o capítulo da tradição para contextualizar, " +
            "vá direto à análise prática se quiser as dicas, e volte à síntese sempre que precisar reencontrar o rumo.",
        },
        {
          type: "kv",
          rows: [
            { k: "Destino", v: `${dn ?? "—"} — ${dMean?.title ?? "não calculado"}` },
            { k: "Alma", v: `${sn ?? "—"} — ${sMean?.title ?? "não calculado"}` },
            { k: "Impressão", v: `${ino ?? "—"} — ${iMean?.title ?? "não calculado"}` },
            ...(tips ? [{ k: "Foco do ciclo", v: tips.focus }] : []),
            ...(tips ? [{ k: "Mantra-guia", v: tips.mantra }] : []),
          ],
        },

        { type: "h2", text: "I. A tradição cabalística" },
        {
          type: "p",
          text:
            "A numerologia cabalística nasce na Kabbalah hebraica, tradição mística milenar que estuda os " +
            "nomes divinos e os caminhos da Árvore da Vida (Etz Chaim). Para os cabalistas, o universo foi " +
            "criado por meio de letras e números — as 22 letras do alfabeto hebraico (Otiyot) são consideradas " +
            "ferramentas de criação, descritas no Sefer Yetzirah (Livro da Formação) como os 'tijolos' com que " +
            "o Eterno modelou todos os mundos.",
        },
        {
          type: "p",
          text:
            "Diferente da numerologia pitagórica, a vertente cabalística trabalha exclusivamente com o NOME " +
            "— a vibração sonora que acompanha a alma desde o nascimento e a identifica nos planos sutis. " +
            "A tabela usada no Ocidente adapta o alfabeto hebraico ao latino, reduzindo cada letra a um valor " +
            "entre 1 e 8. O número 9, ligado a Tet (ט) e à plenitude divina, é considerado sagrado e quando " +
            "aparece é interpretado como um chamado especial ao serviço espiritual.",
        },
        {
          type: "p",
          text:
            "Três aspectos centrais são revelados pelo seu nome: o NÚMERO DE DESTINO (soma de todas as letras) " +
            "representa a missão da alma nesta encarnação; o NÚMERO DA ALMA (soma das vogais) revela o que " +
            "vibra no íntimo, os desejos da centelha divina; o NÚMERO DA IMPRESSÃO (soma das consoantes) é " +
            "a aura externa, como o mundo percebe sua presença.",
        },

        { type: "h2", text: "II. Seus números cabalísticos" },
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

      // Hero box com a letra hebraica do Destino
      const destinyMeaning = typeof nums.destiny === "number" ? CAB_MEANINGS[nums.destiny] : undefined;
      if (destinyMeaning) {
        blocks.push({
          type: "hebrew-hero",
          letter: destinyMeaning.hebrewLetter,
          name: `Letra de Destino · ${destinyMeaning.letterName}`,
          transliteration: destinyMeaning.title,
          meaning: destinyMeaning.essence,
        });
      }

      (["destiny", "soul", "impression"] as const).forEach((k) => {
        const n = nums[k];
        const m = typeof n === "number" && n > 0 ? CAB_MEANINGS[n] : undefined;
        blocks.push({ type: "h2", text: `${labelOf(k)} — Número ${n ?? "—"}` });
        blocks.push({ type: "p", text: descOf(k) });
        if (m) {
          blocks.push({
            type: "hebrew-hero",
            letter: m.hebrewLetter,
            name: `${m.letterName} — letra hebraica regente`,
            transliteration: m.title,
            meaning: m.essence,
          });
          blocks.push({ type: "h3", text: "Essência vibracional" });
          blocks.push({ type: "p", text: m.essence });
          blocks.push({ type: "h3", text: "Significado profundo na tradição cabalística" });
          blocks.push({ type: "p", text: m.deepMeaning });
          blocks.push({ type: "h3", text: "Orientação prática" });
          blocks.push({ type: "quote", text: m.guidance });
        }
      });

      blocks.push({ type: "h2", text: "III. O alfabeto hebraico completo" });
      blocks.push({
        type: "p",
        text:
          "As 22 letras hebraicas (Otiyot) são a espinha dorsal da Kabbalah. Cada uma carrega um som, um " +
          "número (Guematria), uma forma visual e um significado simbólico. Estudá-las é entrar em diálogo " +
          "com a linguagem original da criação. Abaixo, todas as letras com seu valor numérico tradicional " +
          "e seu significado essencial:",
      });

      HEBREW_ALPHABET.forEach((l) => {
        blocks.push({
          type: "hebrew-row",
          letter: l.letter,
          name: l.name,
          value: l.value,
          meaning: l.meaning,
        });
      });

      blocks.push({ type: "h2", text: "IV. Síntese cabalística do seu nome" });
      blocks.push({
        type: "p",
        text:
          `Seu nome "${fullName}" vibra na frequência ${nums.destiny ?? "—"} (${destinyMeaning?.letterName ?? "—"} ${destinyMeaning?.hebrewLetter ?? ""}) ` +
          `como Destino, ${nums.soul ?? "—"} (${typeof nums.soul === "number" ? CAB_MEANINGS[nums.soul]?.letterName : "—"}) como Alma e ` +
          `${nums.impression ?? "—"} (${typeof nums.impression === "number" ? CAB_MEANINGS[nums.impression]?.letterName : "—"}) como Impressão. ` +
          `Esta tríade revela como sua essência divina (Alma) se manifesta no mundo concreto (Impressão) ` +
          `cumprindo seu chamado espiritual (Destino). Os cabalistas ensinam que o nome é a 'assinatura ` +
          `da alma' — não foi escolhido por acaso pelos seus pais, mas inspirado pela providência divina.`,
      });

      blocks.push({ type: "h3", text: "Como o Destino, Alma e Impressão dialogam" });
      blocks.push({
        type: "p",
        text:
          `Quando Alma (${nums.soul ?? "—"}) e Impressão (${nums.impression ?? "—"}) estão alinhadas, a pessoa ` +
          `vive em coerência: o que sente, expressa. Quando há grande distância entre os dois números, surge ` +
          `o desafio de unificar interior e exterior — autenticidade torna-se a prática espiritual central. ` +
          `O Destino (${nums.destiny ?? "—"}) é a síntese, a missão que se cumpre quando Alma e Impressão se ` +
          `harmonizam no serviço.`,
      });

      // ───── Nome em hebraico + letras para meditação ─────
      const trans = transliterateName(fullName);
      blocks.push({ type: "h2", text: "V. Seu nome em hebraico e letras para meditação" });
      blocks.push({
        type: "p",
        text:
          "Abaixo, seu nome completo transliterado para o alfabeto hebraico (Otiyot), seguindo a correspondência " +
          "fonética usada pela cabala ocidental. A leitura é da direita para a esquerda, como manda a tradição. " +
          "Esta não é a grafia oficial em hebraico — é uma ferramenta vibracional para meditação e contemplação " +
          "das letras que compõem o som do seu nome.",
      });
      blocks.push({
        type: "hebrew-name",
        latinName: fullName,
        hebrewWords: trans.words,
        caption: "Leia da direita para a esquerda. Cada letra carrega uma vibração — contemple a forma antes do som.",
      });
      blocks.push({ type: "h3", text: "Letras do seu nome — guia de meditação" });
      blocks.push({
        type: "p",
        text:
          "As letras a seguir aparecem no seu nome em hebraico. Medite uma letra por dia: visualize-a desenhada " +
          "em ouro sobre fundo violeta, pronuncie seu nome três vezes, e permaneça em silêncio por alguns minutos " +
          "absorvendo sua qualidade. Em poucos dias você terá percorrido a essência vibracional do seu nome.",
      });
      trans.uniqueLetters.forEach((heb) => {
        const info = HEBREW_ALPHABET.find((l) => l.letter === heb);
        if (!info) return;
        blocks.push({
          type: "hebrew-row",
          letter: info.letter,
          name: info.name,
          value: info.value,
          meaning: `${info.meaning} Meditação: contemple a forma da letra ${info.name} por 5 minutos, respirando seu som em silêncio.`,
        });
      });

      // ───── Análise prática e direção personalizada ─────
      blocks.push({ type: "h2", text: "VI. Análise prática — o que fazer com isto" });
      if (tips) {
        blocks.push({
          type: "p",
          text:
            `Com base na sua vibração de Destino ${dn} (${dMean?.letterName}), seu foco para este ciclo é: ` +
            `${tips.focus} A seguir, um plano direcional curto e aplicável.`,
        });
        blocks.push({ type: "h3", text: "Faça (ações que aceleram seu caminho)" });
        blocks.push({ type: "list", items: tips.do });
        blocks.push({ type: "h3", text: "Evite (armadilhas típicas do seu número)" });
        blocks.push({ type: "list", items: tips.avoid });
        blocks.push({ type: "h3", text: "Mantra-guia para o ciclo" });
        blocks.push({ type: "quote", text: tips.mantra });

        // Direção combinando Alma + Impressão
        if (sn && ino) {
          const gap = Math.abs(sn - ino);
          const alignText =
            gap <= 1
              ? "Sua Alma e Impressão estão muito próximas — você se mostra ao mundo praticamente como se sente por dentro. Use esta coerência para liderar com autenticidade."
              : gap <= 3
              ? "Há uma diferença saudável entre Alma e Impressão. Cultive momentos íntimos para ouvir sua Alma e momentos públicos para honrar sua Impressão — ambas são reais."
              : "Existe uma distância significativa entre Alma e Impressão. Esta é sua principal prática espiritual deste ciclo: integrar interior e exterior. Pergunte-se a cada decisão: 'isto vem da minha Alma ou da máscara?'.";
          blocks.push({ type: "h3", text: "Direção sobre Alma × Impressão" });
          blocks.push({ type: "p", text: alignText });
        }

        // Próximos 30 dias
        blocks.push({ type: "h3", text: "Próximos 30 dias — passos concretos" });
        blocks.push({
          type: "list",
          items: [
            `Semana 1: escolha UMA ação da lista 'Faça' e execute diariamente.`,
            `Semana 2: identifique UMA das 'Armadilhas' que mais se repete em você e crie um sinal de alerta interno.`,
            `Semana 3: pratique o mantra-guia ao acordar e ao dormir — 3 minutos cada vez.`,
            `Semana 4: revise o que mudou, anote sincronicidades e ajuste a direção para o próximo ciclo.`,
          ],
        });
      } else {
        blocks.push({
          type: "p",
          text: "Conclua seu nome completo no cadastro para receber a análise prática personalizada por número de Destino.",
        });
      }

      blocks.push({ type: "h2", text: "VII. Práticas cabalísticas recomendadas" });
      blocks.push({
        type: "list",
        items: [
          `Medite diariamente sobre a letra ${destinyMeaning?.hebrewLetter ?? ""} (${destinyMeaning?.letterName ?? "sua letra de Destino"}) — visualize-a em ouro sobre fundo violeta por 5 minutos.`,
          "Escreva seu nome em hebraico (peça a um estudioso a transliteração) e contemple a forma das letras — cada traço carrega uma vibração.",
          "Estude o Sefer Yetzirah e o Zohar — obras fundadoras que descrevem o poder criador das letras.",
          "Observe quando sua Alma se manifesta com mais força (relações íntimas, silêncio, criação artística) e cultive esses espaços.",
          "Alinhe sua Impressão à sua verdade interior: evite máscaras sociais que distorçam o som original do seu nome.",
          "Quando o número 9 (Tet ט) aparecer em sua vida, acolha-o como chamado ao serviço, à compaixão universal e à luz oculta na matéria.",
          "Pratique a Guematria: some o valor das palavras importantes da sua vida e contemple as conexões reveladas pelos números iguais.",
        ],
      });

      blocks.push({ type: "h2", text: "VIII. Considerações finais" });
      blocks.push({
        type: "p",
        text:
          "Este relatório é um mapa, não uma sentença. A Kabbalah ensina que o ser humano tem livre-arbítrio " +
          "(Bechirá Chofshit) e que toda vibração pode ser elevada por meio da intenção (Kavaná) e da ação " +
          "consciente. Use estes números como bússola para se conhecer mais profundamente, não como destino " +
          "fechado. Que a luz das 22 letras ilumine seu caminho.",
      });
      blocks.push({ type: "quote", text: "\"Em princípio, era o Verbo.\" — Ecos do Bereshit, onde cada letra hebraica é uma porta para o infinito." });


      const bytes = await buildSimplePdf({
        brand: "Código Cósmico",
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
                  <div className="flex items-baseline gap-4 mt-3">
                    <div className="font-serif text-6xl text-stardust shimmer-text">{display}</div>
                    {meaning && (
                      <div className="font-serif text-5xl text-gold" lang="he" dir="rtl">
                        {meaning.hebrewLetter}
                      </div>
                    )}
                  </div>
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

          {(() => {
            const trans = transliterateName(fullName);
            if (!trans.words.length) return null;
            return (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                  <TreePine className="size-3.5 text-gold" /> Seu nome em hebraico
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Transliteração fonética para meditação. Leia da direita para a esquerda.
                </p>
                <div
                  className="font-serif text-5xl md:text-6xl text-gold text-center mt-4 leading-tight"
                  lang="he"
                  dir="rtl"
                >
                  {trans.words.join(" ")}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2 italic">{fullName}</p>

                <div className="mt-6">
                  <div className="text-xs uppercase tracking-widest text-gold mb-3">
                    Letras para meditação
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {trans.uniqueLetters.map((heb) => {
                      const info = HEBREW_ALPHABET.find((l) => l.letter === heb);
                      if (!info) return null;
                      return (
                        <div key={heb} className="rounded-lg border border-gold/15 bg-background/30 p-3 flex items-center gap-3">
                          <div className="font-serif text-3xl text-gold leading-none" lang="he" dir="rtl">{info.letter}</div>
                          <div className="min-w-0">
                            <div className="text-stardust font-medium">{info.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{info.meaning.split("—")[0].trim()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

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

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <TreePine className="size-3.5 text-gold" /> Alfabeto hebraico (Otiyot)
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              As 22 letras sagradas — segundo o Sefer Yetzirah, os tijolos com que o Eterno criou os mundos.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-4 text-sm">
              {HEBREW_ALPHABET.map((l) => (
                <div key={l.name} className="rounded-lg border border-gold/15 bg-background/30 p-3 flex items-center gap-3">
                  <div className="font-serif text-3xl text-gold leading-none" lang="he" dir="rtl">{l.letter}</div>
                  <div className="min-w-0">
                    <div className="text-stardust font-medium">{l.name}</div>
                    <div className="text-xs text-muted-foreground">Valor: {l.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
