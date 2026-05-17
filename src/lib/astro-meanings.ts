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

export const ASPECT_MEANING: Record<string, string> = {
  Conjunção: "Energias fundidas — intensificação mútua.",
  Oposição: "Tensão polar que pede integração.",
  Quadratura: "Fricção que gera crescimento e ação.",
  Trígono: "Fluxo harmônico, talento natural.",
  Sextil: "Oportunidade que precisa ser ativada.",
};
