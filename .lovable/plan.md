
# Landing Pages Avulsas + Pedidos no Admin

Sistema para publicar landing pages individuais por produto (Mapa Astral, Numerologia, etc.), captar dados do cliente, processar pagamento avulso via Mercado Pago, gerar e entregar o relatório, e gerenciar pedidos no painel admin.

## Fluxo do Cliente

```text
/p/{slug}  →  ver oferta (hero, descrição, preço)
   ↓
"Comprar agora"  →  criar conta / login (se já tem)
   ↓
formulário de dados (campos dinâmicos por produto)
   ↓
Mercado Pago (checkout do valor do produto)
   ↓
webhook confirma pagamento  →  gera relatório  →  entrega
   ↓
cliente recebe: email (PDF) + WhatsApp + link único de acesso
```

Conta obrigatória antes do checkout (conforme escolhido) — assim o pedido já fica vinculado e o cliente acessa o histórico depois.

## Painel "Pedidos" (Super Admin)

- Novo item de menu **acima de Dashboard** com ícone de carrinho
- Badge dourado com contagem de **pedidos não visualizados** pelo admin
- Lista: cliente, produto, valor, status (aguardando pagamento / pago / processando / entregue / falhou), data
- Ações por pedido: ver dados, reenviar entrega (email/WhatsApp), marcar como resolvido, ver PDF gerado
- Filtros: produto, status, período
- Ao abrir a tela, marca todos como visualizados (zera o badge)

## Painel "Landing Pages de Produto" (Super Admin)

CMS simples para o admin cadastrar landings sem código:

- Slug (`mapa-personalidade`), título, subtítulo, descrição rica
- Imagem hero, badges/benefícios, depoimentos
- Tipo de relatório vinculado (mapa_astral | numerologia | cabalistica | tarot | empresarial | leitura_semanal)
- Preço em centavos
- Campos do formulário necessários (nome, data nasc, hora nasc, cidade, email, whatsapp, etc.) — checkbox de quais coletar
- Texto de CTA, copy do email de entrega, mensagem do WhatsApp
- Ativo/inativo, SEO (meta title/description)

## Estrutura Técnica

### Banco de dados (novas tabelas)

- **`product_landings`** — landings configuradas pelo admin
  - slug (unique), title, subtitle, description, hero_image_url, price_cents, report_type, required_fields (jsonb), benefits (jsonb), cta_text, delivery_email_template, delivery_whatsapp_template, active, seo_title, seo_description, created_by
- **`product_orders`** — pedidos avulsos
  - user_id, landing_id, status, amount_cents, mp_preference_id, mp_payment_id, customer_data (jsonb: dados do form), report_id (fk → reports), pdf_url, access_token (uuid p/ link único), delivered_at, viewed_by_admin (bool), error_message
- Triggers: marca `viewed_by_admin = false` em INSERT; função `unviewed_orders_count()` para o badge.
- RLS: cliente vê só os próprios pedidos; admin vê todos; landings ativas têm SELECT público (anon) para campos seguros.

### Rotas

- **`/p/$slug`** (público) — landing dinâmica baseada em `product_landings`
  - Loader carrega via server fn pública (publishable client)
  - SEO: head() com meta tags do CMS, og:image = hero_image_url
- **`/p/$slug/checkout`** (`_authenticated`) — formulário + cria pedido + redireciona pro MP
- **`/r/$token`** (público com token) — página de visualização do relatório entregue (download PDF)
- **`/_authenticated/admin/pedidos`** — painel de gestão
- **`/_authenticated/admin/landing-pages`** — CMS das landings

### Server functions / routes

- `createProductOrder` (auth): valida form, cria order, cria preferência MP, retorna init_point
- `listAdminOrders` (auth + admin): lista paginada, filtros, contagem de não vistos
- `markOrdersViewed` (auth + admin): zera badge
- `resendDelivery` (auth + admin): reenvia email/WhatsApp
- `getPublicLanding` (público): retorna landing por slug
- Webhook MP existente (`/api/public/hooks/mercadopago`) estendido: ao confirmar pagamento de um `product_order`, dispara geração do relatório → upload PDF → envio email (SMTP existente) + WhatsApp (Evolution/Twilio existente) → marca `delivered_at`

### Integração com geradores existentes

Reaproveita as funções já existentes em `src/lib/`:
- `astrology.functions.ts` → mapa astral
- `numerology.ts` → numerologia (pitagórica e cabalística)
- `tarot.functions.ts`, `business.functions.ts`, `weekly-reading.functions.ts`
- `reports-pdf.ts` / `simple-pdf.ts` → geração de PDF com branding
- `smtp.functions.ts` → email
- Evolution/Twilio settings → WhatsApp

Um dispatcher (`generateProductReport(order)`) escolhe o gerador certo pelo `report_type`.

### Sidebar Admin

Ajuste em `src/routes/_authenticated.tsx`:
- Novo item "Pedidos" antes de Dashboard, visível apenas para admins
- Query polling leve (30s) na contagem de não visualizados → badge dourado com número
- Animação pulse quando > 0

## Entregáveis em ordem

1. Migração: tabelas `product_landings`, `product_orders` + RLS + GRANTs + função de contagem
2. CMS admin: tela para criar/editar landings
3. Página pública `/p/$slug` com SEO dinâmico
4. Fluxo de checkout + integração Mercado Pago
5. Extensão do webhook MP para processar pedidos avulsos
6. Dispatcher de geração de relatório + entrega multi-canal
7. Painel admin "Pedidos" + item de menu com badge
8. Página `/r/$token` para visualização pública do relatório entregue

## Pontos de atenção

- **Preço variável por produto**: cada landing tem seu próprio `price_cents`, independente dos pacotes de assinatura
- **Cliente sem assinatura**: o gate atual de `/ativacao` precisa abrir exceção quando o usuário está acessando `/p/$slug/checkout` ou `/r/$token` (compra avulsa não exige plano)
- **Idempotência do webhook**: garantir que reentrega de webhook não gere PDF duplicado nem cobre 2x
- **PDF storage**: usar bucket existente `reports` (já configurado)
- **Token de acesso**: UUID v4 + expiração opcional (90 dias) para o link público de download
