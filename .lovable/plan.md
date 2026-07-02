## Objetivo

Estender o padrão de degradês suaves (já aprovado no Affiliate Center) para todos os cards de KPI/estatística do sistema e diferenciar cada linha das tabelas de relatório por cor.

## O que será feito

### 1. Token global de paleta
- Criar `src/lib/kpi-tones.ts` exportando `KPI_TONES` (sky, indigo, violet, amber, emerald, rose, teal, fuchsia) + helper `toneByIndex(i)` que rotaciona a paleta.
- Criar componente compartilhado `src/components/ui/gradient-stat-card.tsx` (borda tonal, `bg-gradient-to-br`, sombra suave, hover). Substitui os `Kpi/KPI` duplicados.

### 2. Aplicação nos painéis com KPIs
Trocar os cards "número + label" pelos novos `GradientStatCard`:
- `src/routes/_authenticated.dashboard.tsx` (KPIs do topo)
- `src/routes/_authenticated.admin.tsx` (stats do admin)
- `src/components/AdminCrm.tsx` (contadores por status)
- `src/components/AdminHoroscopeStatus.tsx` (entregues/pendentes/erro)
- `src/components/AdminCronStatus.tsx`
- `src/components/AdminProductOrders.tsx` (totais)
- `src/components/AdminCreditsManager.tsx`
- `src/modules/affiliate/ui/AdminAffiliatePanel.tsx` (já feito — migra para o compartilhado)
- `src/routes/affiliate.dashboard.tsx`, `affiliate.financial.tsx`, `affiliate.gamification.tsx`

### 3. Linhas coloridas nos relatórios
No `ReportTable` de `AdminAffiliatePanel.tsx` e no `LandingMetrics` de `affiliate.dashboard.tsx`:
- Cada linha ganha uma faixa lateral esquerda de 3px com a cor rotacionada por índice.
- Fundo da linha recebe versão super leve do gradiente (opacidade ~6%) para diferenciar sem prejudicar leitura.
- Manter hover atual.

### 4. Sem alterações
- Não muda lógica, dados, rotas ou tokens da marca (`--gold`, `--nebula`).
- Não muda botões, formulários ou tipografia.
- Modo escuro continua funcionando (as classes `*-500/15` já se comportam bem em ambos).

## Detalhes técnicos

- Paleta usa opacidade Tailwind (`from-{cor}-500/15 via-{cor}-400/10 to-transparent border-{cor}-500/20`) para se manter suave em light/dark.
- `GradientStatCard` aceita `label`, `value`, `icon?`, `tone?`, `hint?` — API compatível com os dois componentes antigos.
- Faixa lateral das linhas via `border-l-[3px] border-l-{tone}` aplicada no `<tr>`.

## Fora de escopo

- Redesign de páginas públicas (landing pages de produto, home).
- Alteração de gráficos Recharts (mantêm cores atuais).
