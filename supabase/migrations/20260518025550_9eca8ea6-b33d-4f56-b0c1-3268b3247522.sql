-- Tarot readings
create table public.tarot_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  spread text not null,
  question text,
  cards jsonb not null default '[]'::jsonb,
  interpretation text not null,
  ai_model text,
  storage_path text,
  created_at timestamp with time zone not null default now()
);
alter table public.tarot_readings enable row level security;
create policy "tarot_select_own" on public.tarot_readings for select using (auth.uid() = user_id);
create policy "tarot_insert_own" on public.tarot_readings for insert with check (auth.uid() = user_id);
create policy "tarot_update_own" on public.tarot_readings for update using (auth.uid() = user_id);
create policy "tarot_delete_own" on public.tarot_readings for delete using (auth.uid() = user_id);
create index tarot_readings_user_idx on public.tarot_readings (user_id, created_at desc);

-- Kabbalistic meditations
create table public.kabbalah_meditations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  sefirah text not null,
  intention text,
  script text not null,
  duration_min integer not null default 10,
  ai_model text,
  storage_path text,
  created_at timestamp with time zone not null default now()
);
alter table public.kabbalah_meditations enable row level security;
create policy "kab_select_own" on public.kabbalah_meditations for select using (auth.uid() = user_id);
create policy "kab_insert_own" on public.kabbalah_meditations for insert with check (auth.uid() = user_id);
create policy "kab_update_own" on public.kabbalah_meditations for update using (auth.uid() = user_id);
create policy "kab_delete_own" on public.kabbalah_meditations for delete using (auth.uid() = user_id);
create index kab_meditations_user_idx on public.kabbalah_meditations (user_id, created_at desc);

-- Seed credit costs for the new modules (idempotent)
insert into public.credit_costs (action, amount, label, description) values
  ('tarot_card_day',    1, 'Tarot — Carta do Dia',         'Sorteio e leitura curta de 1 carta.'),
  ('tarot_three',       2, 'Tarot — 3 Cartas',             'Passado · Presente · Futuro com interpretação IA.'),
  ('tarot_celtic',      5, 'Tarot — Cruz Celta (10)',      'Leitura completa de 10 cartas com IA aprofundada.'),
  ('tarot_pdf',         2, 'Tarot — PDF da leitura',       'Exporta a leitura realizada em PDF.'),
  ('kabbalah_meditation', 3, 'Meditação Cabalística',      'Sessão guiada personalizada baseada na Árvore da Vida.'),
  ('kabbalah_pdf',      2, 'Meditação Cabalística — PDF',  'Exporta o roteiro da meditação em PDF.')
on conflict (action) do nothing;