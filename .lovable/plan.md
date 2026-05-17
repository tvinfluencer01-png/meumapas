## Módulo de Personalização de PDF (Add-on)

Criar um add-on opcional que permite ao usuário personalizar a marca dos seus relatórios PDF. Quando ativo e configurado, substitui o branding padrão "Cosmic AI"; caso contrário, mantém o sistema atual sem alterações.

### 1. Backend (banco + storage)

**Nova tabela `pdf_branding`** (1 linha por usuário):
- `user_id` (PK, FK auth.users)
- `enabled` (boolean, default false) — liga/desliga o add-on
- `logo_path` (text, nullable) — caminho no Storage
- `logo_width` (int, default 120) — em pontos PDF (40–240)
- `logo_height` (int, default 60) — em pontos PDF (20–160)
- `display_name` (text, nullable) — usado quando não há logo
- `footer_enabled` (boolean, default true)
- `footer_name` / `footer_site` / `footer_phone` (text, nullable)
- timestamps + RLS (cada usuário só vê/edita o seu)

**Novo bucket `pdf-branding`** (privado), com policies de leitura/escrita restritas ao próprio usuário (pasta `{user_id}/...`).

### 2. Server functions (`src/lib/pdf-branding.functions.ts`)

- `getPdfBranding` — devolve a config do usuário autenticado
- `savePdfBranding` — upsert dos campos de texto/sliders/toggle
- `uploadPdfLogo` — recebe base64 + mime, valida (PNG/JPG, ≤500KB), grava no Storage e atualiza `logo_path`
- `removePdfLogo` — apaga arquivo + limpa campo

### 3. Geração do PDF (`src/lib/reports-pdf.ts` + `reports.functions.ts`)

- Estender `ReportData` com `branding?: { logoBytes?: Uint8Array; logoMime?: "png"|"jpg"; logoW; logoH; displayName?; footer?: {name?; site?; phone?} }`
- Em `reports.functions.ts`, antes de chamar `buildReportPdf`, carregar a config; se `enabled`, baixar o logo via `supabaseAdmin.storage` e popular `branding`
- Na capa: se houver logo, desenhar centralizado acima do título (respeitando width/height); senão, se `displayName`, mostrar esse nome no lugar do "COSMIC AI - RELATORIO PREMIUM"
- No rodapé das páginas internas: se `footer_enabled` e algum campo preenchido, montar string `"<name> · <site> · <phone>"` substituindo "Cosmic AI - Inteligencia espiritual personalizada"
- Quando o add-on estiver desligado ou não configurado, **nada muda** — branding padrão preservado

### 4. UI — nova aba em Configurações

Adicionar seção "Personalização de PDF" em `src/routes/_authenticated.configuracoes.tsx` (ou novo componente `PdfBrandingForm.tsx`):

- Switch "Ativar personalização"
- Upload de logo (input file → base64) com preview
- Dois sliders (largura e altura) com valores ao vivo
- Campo "Nome de exibição" (usado quando sem logo)
- Switch "Incluir rodapé personalizado" + 3 inputs (nome, site, telefone)
- Botões: Salvar / Remover logo
- Aviso visual: "Quando desativado, usamos o branding padrão do sistema"

### Detalhes técnicos

- Validação com zod nos server fns (limites de slider, tamanho de arquivo, regex simples para site/telefone)
- `pdf-lib` aceita `embedPng`/`embedJpg` direto de `Uint8Array`
- Logo desenhado com `drawImage(img, { x, y, width: logoW, height: logoH })`; cálculo: `x = (PAGE_W - logoW)/2`, `y = PAGE_H - 90 - logoH`
- Texto do rodapé passa por `safe()` para WinAnsi
- Para o footer custom, usar `sans` 8pt em `MUTED` igual ao atual
- Storage path: `${user_id}/logo-${timestamp}.${ext}` para evitar cache

### Arquivos a criar/editar

- **Migration** — tabela `pdf_branding` + bucket + policies
- **Criar** `src/lib/pdf-branding.functions.ts`
- **Criar** `src/components/PdfBrandingForm.tsx`
- **Editar** `src/lib/reports-pdf.ts` — aceitar branding e usar na capa/rodapé
- **Editar** `src/lib/reports.functions.ts` — carregar branding antes de gerar
- **Editar** `src/routes/_authenticated.configuracoes.tsx` — montar a nova seção
