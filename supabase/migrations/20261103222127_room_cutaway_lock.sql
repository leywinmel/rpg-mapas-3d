-- RPG-24 (F13b): trava do corte de andares, da mesa inteira.
--
-- Cada pessoa escolhe no próprio navegador até que altura vê os prédios (o corte). O mestre pode
-- travar o corte dos jogadores num valor, quando o andar de cima é segredo (decisão 6, de 01/11):
-- a trava é da mesa, então mora em rooms e chega a todos pelo aviso de UPDATE que o canal da mesa
-- já escuta. Nula = mesa livre.
--
-- O valor é o degrau absoluto do corte (o Cutaway do domínio): tudo que começa nele ou acima some
-- para o jogador. Vai até MAX_CUTAWAY = MAX_LEVEL (255) + MAX_WALL_HEIGHT_STEPS (16) = 271, de
-- src/domain/map-v2/cutaway.ts; acima disso o corte não esconde mais nada.
alter table public.rooms
  add column cutaway_lock integer
    constraint rooms_cutaway_lock_range check (cutaway_lock between 0 and 271);

-- Só o mestre troca: a coluna entra no grant de update, e a política "mesas: mestre edita" já
-- barra quem não é mestre da mesa (o jogador só lê, pela política de leitura dos membros).
grant update (cutaway_lock) on public.rooms to authenticated;
