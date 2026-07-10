## Diagnóstico

No PDF anexado, as seções existem, mas estão caindo no fallback:

- **Previsões para os próximos dias:** aparece “indisponíveis nesta geração”.
- **Previsões para a semana/mês/ano:** também aparecem como indisponíveis.
- **Calendário energético:** está em formato de tabela resumida, sem explicação diária para leigo.
- **Bênção final:** ficou curta e genérica.
- **Marketing final:** só mostra texto, sem imagem/print/link visual do produto.

Pelo código, o problema principal é que a geração longa do relatório usa IA para muitas seções no mesmo fluxo. Quando as previsões temporais falham ou voltam vazias, o PDF não tenta uma recuperação específica; ele apenas coloca o texto “indisponível”.

## Plano de correção

1. **Separar as previsões temporais em recuperação própria**
   - Criar uma função de “garantia” para `nextDays`, `week`, `month`, `year` e `closing`.
   - Se qualquer uma vier vazia, curta ou com texto de indisponibilidade, gerar novamente somente essa seção.
   - Evitar que uma falha nas áreas longas do relatório derrube as previsões.

2. **Adicionar fallback determinístico completo para previsões**
   - Se a IA não responder dentro do tempo, montar previsões reais com base no mapa já calculado: Sol, Lua, Ascendente, Meio do Céu, aspectos e data atual.
   - Isso garante que nunca mais apareça “previsões indisponíveis” no PDF.
   - As seções semana/mês/ano terão texto interpretativo, não placeholder.

3. **Transformar o calendário em explicação dia por dia**
   - Trocar a tabela resumida por blocos diários.
   - Para cada um dos 30 dias incluir:
     - fase da Lua;
     - número pessoal;
     - o que esperar;
     - o que fazer/aproveitar;
     - o que evitar;
     - reflexão/pergunta do dia;
     - “profecia simbólica” em linguagem espiritual, sem prometer evento certo.
   - Manter linguagem simples para leigo.

4. **Ampliar a bênção final**
   - Expandir o fechamento para vários parágrafos.
   - Incluir uma parábola espiritual curta e original.
   - Integrar Sol/Lua/Ascendente do usuário para ficar personalizado.
   - Remover o tom genérico atual.

5. **Marketing final com visual e link do produto**
   - Aproveitar o produto de cross-promoção já selecionado.
   - Buscar imagem cadastrada do produto/landing quando disponível.
   - Inserir essa imagem no PDF antes/ao lado do texto de marketing.
   - Mostrar o link clicável do produto quando existir.
   - Se não houver imagem/landing cadastrada, manter o texto atual sem quebrar o PDF.

6. **Invalidar o cache antigo**
   - Atualizar a versão interna do relatório para forçar regeneração.
   - Assim, PDFs já salvos com previsões indisponíveis serão refeitos no próximo export.

## Arquivos principais envolvidos

- `src/lib/astrology.functions.ts`
  - geração das previsões;
  - montagem do calendário;
  - bênção final;
  - marketing final do PDF.

- `src/lib/marketing.functions.ts`
  - ampliar retorno da promoção para incluir link/imagem quando disponível.

- `src/lib/simple-pdf.ts`
  - se necessário, adicionar suporte simples a link clicável em texto/imagem no PDF.

## Resultado esperado

Ao gerar um novo PDF:

- não deve aparecer nenhuma seção “indisponível”; 
- próximos dias, semana, mês e ano devem ter conteúdo;
- o calendário deve explicar cada dia em linguagem prática;
- a bênção final deve ficar mais profunda;
- o marketing final deve exibir imagem/print ou pelo menos link clicável quando houver dados cadastrados.