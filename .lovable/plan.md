## Diagnóstico

A análise está correta. Depois das melhorias na parte astrológica, sobraram dois focos de repetição, ambos em código determinístico (não vindo da IA):

1. **Áreas temáticas** (`src/lib/astrology.functions.ts` ~linha 1641): quando a IA devolve `context`/`opportunity` curtos, o fallback injeta a MESMA frase de introdução e a MESMA frase de "oportunidade" em todas as 8 áreas (dinheiro, saúde, propósito, carreira, família, espiritualidade, amizades, sombras).
2. **Calendário/previsões** (`buildDeterministicTemporalForecast` ~linha 787 e `detailedDayGuidance` ~linha 860): os 30 dias e as previsões (próximos dias/semana/mês/ano) são montados por um template quase idêntico com pequenas trocas de fase da lua e número pessoal — origem exata das frases "Aproveite para alinhar…", "Espere: cansaço…", "escolher uma prioridade…", "uma porta discreta se abre…", etc.

## O que vamos fazer

### Fase A — Áreas temáticas (aplica R21, R22)

1. **Remover os dois fallbacks fixos** de intro e oportunidade nas áreas.
2. Substituir por um **gerador determinístico por-área** que combina:
   - Signo/casa do regente da área (ex.: Vênus/2ª para dinheiro, Sol/6ª para saúde, MC/10ª para carreira, Lua/4ª para família, etc.).
   - Aspectos reais do mapa que tocam esse regente.
   - Um pool de aberturas específicas por área (10+ variantes por área, semeadas por hash do nome+mapa) — nenhuma abertura genérica compartilhada entre áreas.
   - Bloco "oportunidade" reescrito a partir do aspecto mais forte do regente, não de frase-molde.
3. Auditor cruzado: se duas áreas compartilharem uma frase de 8+ palavras, reescrever a segunda a partir de outro aspecto/pool. Estender `auditForecastRepetition` para cobrir áreas.
4. Reforçar o prompt mestre com **R21/R22** e proibir a estrutura fixa "Introdução → Oportunidade → Faça isto → Evite isto" — cada área deve escolher 2 dos 4 blocos e variar a ordem.

### Fase B — Calendário 30 dias (aplica R23, R26)

1. Reescrever `detailedDayGuidance` para deixar de ser template único. Passa a ser uma **fábrica de 10 formatos narrativos** (conselho, metáfora, pergunta, ritual, alerta, observação psicológica, desafio, exercício, símbolo, micro-narrativa), sorteados por `(seed do usuário + dia)` de forma determinística mas distribuída — no mínimo 10 formatos diferentes em 30 dias, sem repetir o mesmo formato em dias consecutivos.
2. Cada dia combina, em vez de trocar só a lua: **fase lunar + número pessoal do dia + planeta em trânsito simulado (rotação Sol→Plutão pelos 30 dias) + aspecto real do mapa natal + tema do dia** (rotação de 7 temas).
3. Banir do pool as frases-âncora atuais ("Aproveite para alinhar…", "Espere: cansaço…", "uma resposta que parecia distante…", "escolher uma prioridade e cuidar do corpo…"). Lista negra verificada antes de emitir cada dia.
4. Perguntas reflexivas e profecias simbólicas passam por contador global: **máx. 2 perguntas repetidas** em todo o PDF (R24) e **profecia sempre inédita** (R25) — se colidir, regenera com outro pool.

### Fase C — Previsões (próximos dias, semana, mês, ano, fechamento)

1. `buildDeterministicTemporalForecast` reescrito para produzir **texto corrido único** por janela temporal, usando aspectos reais + trânsitos simulados + tema, sem a linha-molde "date: phase colore o dia…".
2. Se a IA responder curto, a expansão vai gerar parágrafos adicionais a partir de aspectos ainda não citados (usando o digest anti-repetição já existente), em vez de cair no template.

### Fase D — Prompt mestre e versão

- Adicionar R21–R26 ao bloco `REGRAS ABSOLUTAS`.
- Incrementar `ASTRO_ANTI_REPEAT_VERSION` para invalidar caches antigos e forçar nova geração.

## Detalhes técnicos

Arquivo único afetado: `src/lib/astrology.functions.ts`.

- Remover fallbacks fixos em ~linha 1641 (`context`/`opportunity`).
- Novos helpers: `areaSpecificOpener(areaKey, chart, seed)`, `areaSpecificOpportunity(areaKey, chart, seed)`, `dayNarrativeFormat(index, seed)`, `dayContentAssembler(...)`.
- Ampliar `auditForecastRepetition` para pegar n-gramas repetidos entre áreas + entre dias do calendário.
- Manter estrutura de PDF, capítulos e ordenação atuais — mudança 100% no conteúdo textual determinístico + regras do prompt.

## Fora do escopo

- Nenhuma mudança em UI, rotas, banco, PDF layout, marketing ou fluxo de geração paralela — só o conteúdo textual dos blocos apontados.
