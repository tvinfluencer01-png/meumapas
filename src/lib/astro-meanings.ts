export const PLANET_MEANING: Record<string, { title: string; short: string }> = {
  Sol: { title: "Sol ☉", short: "Identidade, vitalidade e propósito central." },
  Lua: { title: "Lua ☽", short: "Emoções, necessidades íntimas e memória afetiva." },
  Mercúrio: { title: "Mercúrio ☿", short: "Mente, comunicação e modo de aprender." },
  Vênus: { title: "Vênus ♀", short: "Amor, prazer, valores e o que te atrai." },
  Marte: { title: "Marte ♂", short: "Ação, desejo, coragem e como você briga pelo que quer." },
  Júpiter: { title: "Júpiter ♃", short: "Expansão, fé, sorte e visão de futuro." },
  Saturno: { title: "Saturno ♄", short: "Estrutura, limites, maturidade e karma." },
  Urano: { title: "Urano ♅", short: "Liberdade, rupturas e originalidade." },
  Netuno: { title: "Netuno ♆", short: "Sonhos, espiritualidade e dissolução do ego." },
  Plutão: { title: "Plutão ♇", short: "Transformação profunda, poder e renascimento." },
};

export const SIGN_MEANING: Record<string, { glyph: string; short: string }> = {
  "Áries": { glyph: "♈", short: "Iniciativa, coragem e impulso pioneiro." },
  "Touro": { glyph: "♉", short: "Estabilidade, sensorialidade e construção paciente." },
  "Gêmeos": { glyph: "♊", short: "Curiosidade, troca e mente versátil." },
  "Câncer": { glyph: "♋", short: "Acolhimento, raízes e sensibilidade emocional." },
  "Leão": { glyph: "♌", short: "Brilho próprio, criatividade e generosidade." },
  "Virgem": { glyph: "♍", short: "Discernimento, serviço e refinamento prático." },
  "Libra": { glyph: "♎", short: "Equilíbrio, estética e arte do relacionamento." },
  "Escorpião": { glyph: "♏", short: "Intensidade, mistério e transformação." },
  "Sagitário": { glyph: "♐", short: "Liberdade, fé filosófica e horizontes amplos." },
  "Capricórnio": { glyph: "♑", short: "Disciplina, ambição e legado duradouro." },
  "Aquário": { glyph: "♒", short: "Visão coletiva, originalidade e quebra de padrões." },
  "Peixes": { glyph: "♓", short: "Compaixão, intuição e dissolução de fronteiras." },
};

export type SignGuidance = { expect: string; doNow: string; avoid: string; strength: string };

export const SIGN_GUIDANCE: Record<string, SignGuidance> = {
  "Áries": {
    expect: "Fases de impulso e começos rápidos — energia que pede movimento.",
    doNow: "Inicie aquele projeto parado. Tome a primeira decisão hoje mesmo.",
    avoid: "Reagir no calor do momento e abandonar antes de terminar.",
    strength: "Coragem para abrir caminhos onde outros hesitam.",
  },
  "Touro": {
    expect: "Construção lenta, porém sólida. Resultados vêm pela constância.",
    doNow: "Organize sua rotina, finanças e ambiente físico. Cuide do corpo.",
    avoid: "Teimosia e apego ao conforto que trava mudanças necessárias.",
    strength: "Paciência e capacidade de transformar esforço em segurança.",
  },
  "Gêmeos": {
    expect: "Muitas ideias, conversas e oportunidades chegando ao mesmo tempo.",
    doNow: "Escreva, pergunte, troque. Conecte pessoas e estude algo novo.",
    avoid: "Dispersão — começar dez coisas e não fechar nenhuma.",
    strength: "Inteligência ágil que aprende e adapta com leveza.",
  },
  "Câncer": {
    expect: "Ondas emocionais e necessidade de pertencimento e abrigo.",
    doNow: "Cuide da casa, da família e de quem te acolhe. Honre suas raízes.",
    avoid: "Se fechar em mágoas antigas e levar tudo para o lado pessoal.",
    strength: "Sensibilidade que protege e nutre quem está perto.",
  },
  "Leão": {
    expect: "Holofotes naturais — você é visto, queira ou não.",
    doNow: "Mostre seu trabalho, lidere com generosidade e crie algo autoral.",
    avoid: "Buscar aprovação a todo custo e levar críticas como afronta.",
    strength: "Carisma e coragem de brilhar com o coração aberto.",
  },
  "Virgem": {
    expect: "Atenção aos detalhes e vontade de melhorar tudo ao redor.",
    doNow: "Refine processos, cuide da saúde e ajude alguém de forma prática.",
    avoid: "Autocrítica excessiva e perfeccionismo que paralisa a entrega.",
    strength: "Discernimento e capacidade de transformar caos em ordem.",
  },
  "Libra": {
    expect: "Decisões envolvendo o outro — parcerias, acordos, estética.",
    doNow: "Negocie, alinhe expectativas e cuide do que é belo e justo.",
    avoid: "Adiar decisões para agradar e perder sua própria voz.",
    strength: "Diplomacia e olhar refinado para harmonia entre pessoas.",
  },
  "Escorpião": {
    expect: "Intensidade emocional e ciclos de morte e renascimento.",
    doNow: "Encare a verdade que você vem evitando. Solte o que já morreu.",
    avoid: "Ressentimento, controle excessivo e jogos de poder velados.",
    strength: "Profundidade rara — você enxerga o que ninguém vê.",
  },
  "Sagitário": {
    expect: "Vontade de expandir horizontes — estudo, viagem, propósito maior.",
    doNow: "Estude algo que abra sua visão. Planeje uma jornada com sentido.",
    avoid: "Prometer demais e fugir quando a rotina aperta.",
    strength: "Fé e otimismo que arrastam os outros para frente.",
  },
  "Capricórnio": {
    expect: "Ciclos de responsabilidade — colheitas vêm com disciplina longa.",
    doNow: "Defina metas claras, assuma o comando e construa estrutura.",
    avoid: "Rigidez, frieza e medir tudo só pela produtividade.",
    strength: "Maturidade e capacidade de construir algo que dura.",
  },
  "Aquário": {
    expect: "Quebra de padrões e ideias à frente do seu tempo.",
    doNow: "Conecte-se a grupos e causas. Experimente o caminho menos óbvio.",
    avoid: "Se isolar na razão e tratar emoções como problema técnico.",
    strength: "Visão original que abre caminhos coletivos novos.",
  },
  "Peixes": {
    expect: "Sensibilidade alta, intuição forte e fronteiras um pouco fluidas.",
    doNow: "Reserve tempo para arte, silêncio, sonho e prática espiritual.",
    avoid: "Fugir da realidade e se perder na dor do outro.",
    strength: "Compaixão e imaginação que curam e inspiram.",
  },
};

export const ASPECT_MEANING: Record<string, string> = {
  Conjunção: "Energias fundidas — intensificação mútua.",
  Oposição: "Tensão polar que pede integração.",
  Quadratura: "Fricção que gera crescimento e ação.",
  Trígono: "Fluxo harmônico, talento natural.",
  Sextil: "Oportunidade que precisa ser ativada.",
};
