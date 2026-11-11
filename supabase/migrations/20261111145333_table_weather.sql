-- RPG-38 e RPG-39: tempo e hora da mesa.
--
-- O mestre liga a chuva (ou a tempestade) e escolhe a hora do dia para a mesa inteira, ao vivo
-- (decisão de 05/11: "Mestre liga, cada um desliga"). É estado da mesa, como a trava do corte de
-- andares: mora em rooms e chega a todos pelo aviso de UPDATE que o canal da mesa já escuta.
-- Desligar a chuva na própria tela é escolha de cada um e fica só no navegador.
--
-- Os códigos são os mesmos de WEATHER_KINDS e DAY_PHASES em src/domain/table-weather.ts; um teste
-- Vitest garante que as listas não divergem.
create table public.weather_kinds (
  code  text primary key,
  label text not null
);
insert into public.weather_kinds (code, label) values
  ('clear', 'Limpo'),
  ('rain', 'Chuva'),
  ('storm', 'Tempestade');
alter table public.weather_kinds enable row level security;
create policy "dominio: leitura" on public.weather_kinds for select to authenticated using (true);
revoke all on public.weather_kinds from anon;

-- "map" mantém a luz que o mestre montou no mapa.
create table public.day_phases (
  code  text primary key,
  label text not null
);
insert into public.day_phases (code, label) values
  ('map', 'Do mapa'),
  ('day', 'Dia'),
  ('dusk', 'Entardecer'),
  ('night', 'Noite');
alter table public.day_phases enable row level security;
create policy "dominio: leitura" on public.day_phases for select to authenticated using (true);
revoke all on public.day_phases from anon;

alter table public.rooms
  add column weather text not null default 'clear'
    constraint rooms_weather_fk references public.weather_kinds (code),
  add column day_phase text not null default 'map'
    constraint rooms_day_phase_fk references public.day_phases (code);

-- Só o mestre troca: as colunas entram no grant de update, e a política "mesas: mestre edita" já
-- barra quem não é mestre da mesa (o jogador só lê, pela política de leitura dos membros).
grant update (weather, day_phase) on public.rooms to authenticated;
