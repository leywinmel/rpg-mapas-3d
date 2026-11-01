-- RPG-1: arquivos (Storage) e tempo real.
-- Todos os buckets são privados; o app usa URLs assinadas. Tamanho e tipo
-- limitados no próprio bucket [#65].

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('token-images', 'token-images', false, 5242880,  array['image/png', 'image/jpeg', 'image/webp']),
  ('note-images',  'note-images',  false, 5242880,  array['image/png', 'image/jpeg', 'image/webp']),
  ('map-models',   'map-models',   false, 10485760, array['model/gltf-binary', 'application/octet-stream'])
on conflict (id) do nothing;

-- token-images e map-models: caminho "<id do dono>/<arquivo>".
-- Quem tem conta envia na própria pasta; qualquer usuário logado (inclusive
-- convidado) lê, para o token e o cenário aparecerem na mesa.
create policy "arquivos públicos da mesa: leitura" on storage.objects
  for select to authenticated
  using (bucket_id in ('token-images', 'map-models'));

create policy "arquivos públicos da mesa: enviar na própria pasta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('token-images', 'map-models')
    and public.is_registered()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "arquivos públicos da mesa: apagar os próprios" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('token-images', 'map-models')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- note-images: caminho "<id da mesa>/<arquivo>". Só o mestre envia.
-- Leitura: quem pode ler a anotação que aponta para a imagem.
create policy "imagens de anotação: mestre envia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'note-images'
    and public.is_room_gm(((storage.foldername(name))[1])::uuid)
  );

create policy "imagens de anotação: destinatários leem" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'note-images'
    and exists (
      select 1 from public.notes n
      where n.image_path = storage.objects.name and public.can_read_note(n.id)
    )
  );

create policy "imagens de anotação: mestre apaga" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'note-images'
    and public.is_room_gm(((storage.foldername(name))[1])::uuid)
  );

-- Tempo real: o Realtime respeita o RLS, então cada um só recebe o que pode ver.
alter publication supabase_realtime add table
  public.rooms,
  public.room_members,
  public.maps,
  public.tokens,
  public.map_fog,
  public.notes,
  public.note_recipients,
  public.dice_rolls,
  public.initiative_entries;
