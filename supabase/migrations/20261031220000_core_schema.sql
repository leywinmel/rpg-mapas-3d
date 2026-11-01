-- RPG-1: esquema principal do rpgmaps.
-- Regras de acesso (RLS) ficam na migration seguinte; aqui só estrutura e integridade.

-- ---------------------------------------------------------------------------
-- Tabelas de domínio (sem listas fixas no código) [#3][#6]
-- ---------------------------------------------------------------------------
create table public.member_roles (
  code  text primary key,
  label text not null
);
insert into public.member_roles (code, label) values
  ('gm', 'Mestre'),
  ('player', 'Jogador');

create table public.token_kinds (
  code  text primary key,
  label text not null
);
insert into public.token_kinds (code, label) values
  ('image', 'Imagem em pé numa base'),
  ('model', 'Boneco 3D');

-- ---------------------------------------------------------------------------
-- Função utilitária: mantém updated_at em dia
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfis: 1:1 com auth.users (inclusive convidados anônimos).
-- E-mail e senha ficam só no auth.users, nunca aqui [#54][#63].
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_path  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Cria o perfil quando a conta nasce (cadastro, Google ou convidado).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    'Aventureiro'
  );
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(wanted_name, 40));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Mesas (salas)
-- ---------------------------------------------------------------------------
create table public.rooms (
  id            uuid primary key default gen_random_uuid(),
  -- Código curto do link de convite; aleatório para não ser adivinhável.
  slug          text not null unique default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  name          text not null check (char_length(name) between 1 and 80),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  active_map_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index rooms_owner_idx on public.rooms (owner_id);
create trigger rooms_touch before update on public.rooms
  for each row execute function public.touch_updated_at();

create table public.room_members (
  room_id   uuid not null references public.rooms (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  role      text not null references public.member_roles (code),
  nickname  text not null check (char_length(nickname) between 1 and 40),
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index room_members_user_idx on public.room_members (user_id);

-- ---------------------------------------------------------------------------
-- Mapas: biblioteca do mestre (room_id nulo) ou cena de uma mesa.
-- O diorama vive em `document` (JSON versionado, validado no app pelo domínio).
-- ---------------------------------------------------------------------------
create table public.maps (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references public.profiles (id) on delete cascade,
  room_id        uuid references public.rooms (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  width          integer not null check (width between 1 and 100),
  depth          integer not null check (depth between 1 and 100),
  schema_version integer not null default 1 check (schema_version >= 1),
  document       jsonb not null default '{}'::jsonb,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Limite de tamanho do documento: protege o banco gratuito de abuso [#65].
  constraint maps_document_size check (pg_column_size(document) <= 2000000)
);
create index maps_owner_idx on public.maps (owner_id);
create index maps_room_idx on public.maps (room_id, sort_order);
create trigger maps_touch before update on public.maps
  for each row execute function public.touch_updated_at();

alter table public.rooms
  add constraint rooms_active_map_fk
  foreign key (active_map_id) references public.maps (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Modelos .glb enviados pelo mestre (arquivo no Storage, bucket map-models)
-- ---------------------------------------------------------------------------
create table public.map_assets (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  storage_path text not null unique,
  size_bytes   integer not null check (size_bytes between 1 and 10485760),
  created_at   timestamptz not null default now()
);
create index map_assets_owner_idx on public.map_assets (owner_id);

-- ---------------------------------------------------------------------------
-- Modelos de token da biblioteca de quem tem conta
-- ---------------------------------------------------------------------------
create table public.token_templates (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 60),
  kind            text not null references public.token_kinds (code),
  image_path      text,
  model_key       text,
  color_primary   text check (color_primary ~ '^#[0-9a-fA-F]{6}$'),
  color_secondary text check (color_secondary ~ '^#[0-9a-fA-F]{6}$'),
  hp_max          integer check (hp_max between 0 and 100000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint token_templates_visual check (
    (kind = 'image' and image_path is not null) or (kind = 'model' and model_key is not null)
  )
);
create index token_templates_owner_idx on public.token_templates (owner_id);
create trigger token_templates_touch before update on public.token_templates
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Tokens colocados num mapa
-- ---------------------------------------------------------------------------
create table public.tokens (
  id              uuid primary key default gen_random_uuid(),
  map_id          uuid not null references public.maps (id) on delete cascade,
  -- Dono = jogador que controla o token. Nulo = token do mestre (NPC/monstro).
  owner_id        uuid references public.profiles (id) on delete set null,
  kind            text not null references public.token_kinds (code),
  name            text not null check (char_length(name) between 1 and 60),
  image_path      text,
  model_key       text,
  color_primary   text check (color_primary ~ '^#[0-9a-fA-F]{6}$'),
  color_secondary text check (color_secondary ~ '^#[0-9a-fA-F]{6}$'),
  x               integer not null check (x between 0 and 99),
  z               integer not null check (z between 0 and 99),
  elevation       real not null default 0 check (elevation between 0 and 50),
  rotation        real not null default 0,
  scale           real not null default 1 check (scale between 0.25 and 4),
  hp_current      integer check (hp_current between -100000 and 100000),
  hp_max          integer check (hp_max between 0 and 100000),
  notes           text not null default '' check (char_length(notes) <= 2000),
  -- O mestre pode esconder um token dos jogadores (emboscada).
  hidden          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint tokens_visual check (
    (kind = 'image' and image_path is not null) or (kind = 'model' and model_key is not null)
  )
);
create index tokens_map_idx on public.tokens (map_id);
create index tokens_owner_idx on public.tokens (owner_id);
create trigger tokens_touch before update on public.tokens
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Névoa: um bit por casa (1 = coberta). 100x100 = 10.000 bits = 1.250 bytes.
-- ---------------------------------------------------------------------------
create table public.map_fog (
  map_id     uuid primary key references public.maps (id) on delete cascade,
  enabled    boolean not null default false,
  covered    bytea not null default ''::bytea check (octet_length(covered) <= 1250),
  updated_at timestamptz not null default now()
);
create trigger map_fog_touch before update on public.map_fog
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Anotações do mestre para a mesa toda ou para jogadores escolhidos
-- ---------------------------------------------------------------------------
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,
  title      text not null check (char_length(title) between 1 and 120),
  body       text not null default '' check (char_length(body) <= 5000),
  image_path text,
  to_all     boolean not null default true,
  created_at timestamptz not null default now()
);
create index notes_room_idx on public.notes (room_id, created_at desc);

create table public.note_recipients (
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (note_id, user_id)
);
create index note_recipients_user_idx on public.note_recipients (user_id);

-- ---------------------------------------------------------------------------
-- Rolagens de dados
-- ---------------------------------------------------------------------------
create table public.dice_rolls (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms (id) on delete cascade,
  roller_id  uuid references public.profiles (id) on delete set null,
  notation   text not null check (char_length(notation) between 1 and 100),
  -- Valor de cada dado, ex: [{"sides":6,"value":4},{"sides":6,"value":2}]
  results    jsonb not null check (jsonb_typeof(results) = 'array'),
  modifier   integer not null default 0 check (modifier between -1000 and 1000),
  total      integer not null,
  hidden     boolean not null default false,
  created_at timestamptz not null default now()
);
create index dice_rolls_room_idx on public.dice_rolls (room_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Ordem de iniciativa
-- ---------------------------------------------------------------------------
create table public.initiative_entries (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms (id) on delete cascade,
  token_id   uuid references public.tokens (id) on delete set null,
  label      text not null check (char_length(label) between 1 and 60),
  value      integer not null default 0,
  position   integer not null default 0,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
create index initiative_room_idx on public.initiative_entries (room_id, position);
