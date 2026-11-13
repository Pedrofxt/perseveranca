-- CEI Perseverança · Atualização 2
-- Rode este arquivo inteiro no SQL Editor do Supabase (depois do schema.sql).
-- 1) Cadastro sem confirmação por e-mail
-- 2) Área da Equipe: só e-mails convidados pela Direção podem criar conta
-- 3) Imagens do site (início e galeria) trocadas pela Direção
-- 4) Fotos das crianças para os responsáveis (privadas)
-- 5) Registro do aceite da Política de Uso e Privacidade

-- ============ 1) Sem confirmação por e-mail ============
create or replace function public.auto_confirmar_email() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if new.email_confirmed_at is null then new.email_confirmed_at := now(); end if;
  return new;
end $$;
drop trigger if exists auto_confirmar_email on auth.users;
create trigger auto_confirmar_email before insert on auth.users
for each row execute function public.auto_confirmar_email();
revoke execute on function public.auto_confirmar_email() from anon, authenticated, public;
-- contas já criadas e ainda não confirmadas
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;

-- ============ 5) Aceite da política ============
alter table public.profiles add column if not exists aceite_politica_em timestamptz;

-- ============ 2) Cadastro da equipe só por convite da Direção ============
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; p public.papel; origem text := coalesce(new.raw_user_meta_data->>'origem','');
begin
  select * into c from public.convites where email = lower(new.email);
  if c.email is not null then
    p := c.papel;
  elsif origem = 'equipe' and not exists (select 1 from public.profiles where papel = 'diretor') then
    p := 'diretor';  -- só a primeiríssima conta da equipe, para criar a Direção
  elsif origem = 'responsavel' then
    p := 'responsavel';
  else
    raise exception 'CADASTRO_NAO_AUTORIZADO: este e-mail não foi liberado pela Direção para a Área da Equipe.';
  end if;
  insert into public.profiles (id, nome, email, telefone, papel, aceite_politica_em)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'nome',''), split_part(new.email,'@',1)),
          lower(new.email), nullif(new.raw_user_meta_data->>'telefone',''), p,
          case when new.raw_user_meta_data->>'aceite' = 'sim' then now() end);
  if c.email is not null then delete from public.convites where email = c.email; end if;
  return new;
end $$;

-- Só a Direção vê, cria e cancela convites
drop policy if exists "convites: gestão vê" on public.convites;
drop policy if exists "convites: gestão cria" on public.convites;
drop policy if exists "convites: gestão remove" on public.convites;
drop policy if exists "convites: direção vê" on public.convites;
drop policy if exists "convites: direção cria" on public.convites;
drop policy if exists "convites: direção remove" on public.convites;
create policy "convites: direção vê" on public.convites for select to authenticated using (public.eh_diretor());
create policy "convites: direção cria" on public.convites for insert to authenticated with check (public.eh_diretor());
create policy "convites: direção remove" on public.convites for delete to authenticated using (public.eh_diretor());

-- O site pergunta antes de cadastrar, para mostrar uma mensagem clara
create or replace function public.pode_cadastrar_equipe(p_email text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.convites where email = lower(trim(p_email))) then 'convidado'
    when not exists (select 1 from public.profiles where papel = 'diretor') then 'primeira_direcao'
    else 'nao' end
$$;
revoke execute on function public.pode_cadastrar_equipe(text) from public;
grant execute on function public.pode_cadastrar_equipe(text) to anon, authenticated;

-- ============ 3) Imagens do site ============
create table if not exists public.site_imagens (
  id uuid primary key default gen_random_uuid(),
  local text not null check (local in ('destaque','sobre','galeria')),
  titulo text check (char_length(titulo) <= 80),
  legenda text check (char_length(legenda) <= 160),
  url text not null check (char_length(url) <= 600),
  caminho text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.site_imagens enable row level security;
drop policy if exists "imagens: todos veem" on public.site_imagens;
drop policy if exists "imagens: direção edita" on public.site_imagens;
create policy "imagens: todos veem" on public.site_imagens for select to anon, authenticated using (true);
create policy "imagens: direção edita" on public.site_imagens for all to authenticated using (public.eh_diretor()) with check (public.eh_diretor());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site', 'site', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "site: direção envia" on storage.objects;
drop policy if exists "site: direção troca" on storage.objects;
drop policy if exists "site: direção apaga" on storage.objects;
create policy "site: direção envia" on storage.objects for insert to authenticated with check (bucket_id = 'site' and public.eh_diretor());
create policy "site: direção troca" on storage.objects for update to authenticated using (bucket_id = 'site' and public.eh_diretor());
create policy "site: direção apaga" on storage.objects for delete to authenticated using (bucket_id = 'site' and public.eh_diretor());

-- ============ 4) Fotos das crianças (privadas) ============
create table if not exists public.fotos (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  crianca_id uuid references public.criancas(id) on delete cascade,   -- vazio = foto da turma toda
  caminho text not null unique,
  legenda text check (char_length(legenda) <= 300),
  data date not null default current_date,
  autor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  autor_nome text,
  created_at timestamptz not null default now()
);
create index if not exists fotos_turma on public.fotos (turma_id, data desc);

create or replace function public.foto_autor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.autor_id := auth.uid();
  new.autor_nome := (select nome from public.profiles where id = auth.uid());
  return new;
end $$;
drop trigger if exists foto_autor on public.fotos;
create trigger foto_autor before insert on public.fotos
for each row when (auth.uid() is not null) execute function public.foto_autor();
revoke execute on function public.foto_autor() from anon, authenticated, public;

-- Quem pode ver uma foto: equipe, ou o responsável da criança marcada, ou (foto da turma) responsáveis daquela turma
create or replace function public.pode_ver_foto(p_caminho text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.eh_equipe() or exists (
    select 1 from public.fotos f
    where f.caminho = p_caminho and (
      f.crianca_id in (select id from public.criancas where responsavel_id = auth.uid() and ativo)
      or (f.crianca_id is null and f.turma_id in (select turma_id from public.criancas where responsavel_id = auth.uid() and ativo))
    ))
$$;
revoke execute on function public.pode_ver_foto(text) from anon, public;
grant execute on function public.pode_ver_foto(text) to authenticated;

alter table public.fotos enable row level security;
drop policy if exists "fotos: ver" on public.fotos;
drop policy if exists "fotos: enviar" on public.fotos;
drop policy if exists "fotos: editar" on public.fotos;
drop policy if exists "fotos: apagar" on public.fotos;
create policy "fotos: ver" on public.fotos for select to authenticated using (public.pode_ver_foto(caminho));
create policy "fotos: enviar" on public.fotos for insert to authenticated with check (public.meu_papel() in ('professor','secretario','diretor'));
create policy "fotos: editar" on public.fotos for update to authenticated
  using (autor_id = auth.uid() or public.eh_gestao()) with check (autor_id = auth.uid() or public.eh_gestao());
create policy "fotos: apagar" on public.fotos for delete to authenticated using (autor_id = auth.uid() or public.eh_gestao());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-criancas', 'fotos-criancas', false, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "fotos-criancas: ver" on storage.objects;
drop policy if exists "fotos-criancas: enviar" on storage.objects;
drop policy if exists "fotos-criancas: apagar" on storage.objects;
create policy "fotos-criancas: ver" on storage.objects for select to authenticated using (bucket_id = 'fotos-criancas' and public.pode_ver_foto(name));
create policy "fotos-criancas: enviar" on storage.objects for insert to authenticated with check (bucket_id = 'fotos-criancas' and public.meu_papel() in ('professor','secretario','diretor'));
create policy "fotos-criancas: apagar" on storage.objects for delete to authenticated using (bucket_id = 'fotos-criancas' and public.meu_papel() in ('professor','secretario','diretor'));

-- ============ 6) Até 2 responsáveis por criança (pelos e-mails da matrícula) ============
alter table public.criancas
  add column if not exists responsavel_email text check (responsavel_email = lower(responsavel_email)),
  add column if not exists responsavel2_id uuid references public.profiles(id) on delete set null,
  add column if not exists responsavel2_email text check (responsavel2_email = lower(responsavel2_email)),
  add column if not exists responsavel2_nome text check (char_length(responsavel2_nome) <= 120);
alter table public.matriculas
  add column if not exists responsavel2_nome text check (char_length(responsavel2_nome) <= 120),
  add column if not exists responsavel2_email text check (char_length(responsavel2_email) <= 200);

-- preenche o e-mail do 1º responsável das crianças já vinculadas
update public.criancas c set responsavel_email = p.email from public.profiles p where p.id = c.responsavel_id and c.responsavel_email is null;

-- As crianças de quem está conectado (como 1º ou 2º responsável)
create or replace function public.minhas_criancas() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.criancas where ativo and auth.uid() is not null and (responsavel_id = auth.uid() or responsavel2_id = auth.uid())
$$;
create or replace function public.minhas_turmas() returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct turma_id from public.criancas where ativo and turma_id is not null and auth.uid() is not null and (responsavel_id = auth.uid() or responsavel2_id = auth.uid())
$$;
revoke execute on function public.minhas_criancas(), public.minhas_turmas() from anon, public;
grant execute on function public.minhas_criancas(), public.minhas_turmas() to authenticated;

-- Liga contas pelos e-mails: ao salvar a criança, procura contas com aqueles e-mails
create or replace function public.criancas_vincular_emails() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.responsavel_email := nullif(lower(trim(new.responsavel_email)), '');
  new.responsavel2_email := nullif(lower(trim(new.responsavel2_email)), '');
  if new.responsavel_email is not null and new.responsavel2_email = new.responsavel_email then
    raise exception 'Os dois responsáveis precisam ter e-mails diferentes.';
  end if;
  if tg_op = 'INSERT' or new.responsavel_email is distinct from old.responsavel_email then
    new.responsavel_id := (select id from public.profiles where email = new.responsavel_email and papel in ('responsavel','pendente'));
  end if;
  if tg_op = 'INSERT' or new.responsavel2_email is distinct from old.responsavel2_email then
    new.responsavel2_id := (select id from public.profiles where email = new.responsavel2_email and papel in ('responsavel','pendente'));
  end if;
  return new;
end $$;
drop trigger if exists criancas_vincular_emails on public.criancas;
create trigger criancas_vincular_emails before insert or update on public.criancas
for each row execute function public.criancas_vincular_emails();
revoke execute on function public.criancas_vincular_emails() from anon, authenticated, public;

-- Ao criar conta, liga às crianças que já têm esse e-mail cadastrado
create or replace function public.vincular_nova_conta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.papel in ('responsavel','pendente') then
    update public.criancas set responsavel_id = new.id where responsavel_email = new.email and responsavel_id is null;
    update public.criancas set responsavel2_id = new.id where responsavel2_email = new.email and responsavel2_id is null;
  end if;
  return new;
end $$;
drop trigger if exists vincular_nova_conta on public.profiles;
create trigger vincular_nova_conta after insert on public.profiles
for each row execute function public.vincular_nova_conta();
revoke execute on function public.vincular_nova_conta() from anon, authenticated, public;

-- Regras de leitura passam a valer para os 2 responsáveis
drop policy if exists "crianças: equipe ou responsável" on public.criancas;
create policy "crianças: equipe ou responsável" on public.criancas for select to authenticated
  using (public.eh_equipe() or responsavel_id = auth.uid() or responsavel2_id = auth.uid());
drop policy if exists "frequência: equipe ou responsável" on public.frequencias;
create policy "frequência: equipe ou responsável" on public.frequencias for select to authenticated
  using (public.eh_equipe() or crianca_id in (select public.minhas_criancas()));
drop policy if exists "diário: equipe ou responsável" on public.diarios;
create policy "diário: equipe ou responsável" on public.diarios for select to authenticated
  using (public.eh_equipe() or crianca_id in (select public.minhas_criancas()));
drop policy if exists "avisos: responsáveis" on public.avisos;
create policy "avisos: responsáveis" on public.avisos for select to authenticated using (
  publico = 'responsaveis' and (public.eh_equipe() or (public.meu_papel() = 'responsavel' and (turma_id is null or turma_id in (select public.minhas_turmas())))));

create or replace function public.marcar_diario_lido(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.diarios d set lido_em = coalesce(d.lido_em, now())
  where d.id = p_id and d.crianca_id in (select public.minhas_criancas());
$$;

create or replace function public.pode_ver_foto(p_caminho text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.eh_equipe() or exists (
    select 1 from public.fotos f
    where f.caminho = p_caminho and (
      f.crianca_id in (select public.minhas_criancas())
      or (f.crianca_id is null and f.turma_id in (select public.minhas_turmas()))
    ))
$$;

-- Aprovar matrícula: grava os 2 e-mails (o 1º é o da conta que pediu) e liga as contas
create or replace function public.aprovar_matricula(p_id uuid, p_turma uuid, p_resposta text) returns uuid
language plpgsql security definer set search_path = public as $$
declare m public.matriculas; cid uuid; e1 text;
begin
  if not public.eh_gestao() then raise exception 'Somente a secretaria ou a direção podem aprovar matrículas.'; end if;
  select * into m from public.matriculas where id = p_id for update;
  if m.id is null then raise exception 'Pedido não encontrado.'; end if;
  if m.status = 'aprovada' then raise exception 'Este pedido já foi aprovado.'; end if;
  if m.status = 'cancelada' then raise exception 'Este pedido foi cancelado pelo responsável.'; end if;
  select email into e1 from public.profiles where id = m.responsavel_id;
  insert into public.criancas (nome, data_nascimento, turma_id, turno, responsavel_email, responsavel_nome, responsavel_telefone, responsavel2_email, responsavel2_nome, observacoes)
  values (m.crianca_nome, m.crianca_nascimento, coalesce(p_turma, m.turma_id), m.turno, e1, m.responsavel_nome, m.telefone,
          nullif(lower(trim(m.responsavel2_email)),''), m.responsavel2_nome, m.observacoes)
  returning id into cid;
  update public.matriculas set status = 'aprovada', crianca_id = cid, turma_id = coalesce(p_turma, m.turma_id),
    resposta = coalesce(nullif(trim(p_resposta),''), 'Matrícula aprovada! Bem-vindos ao CEI Perseverança.') where id = p_id;
  if m.responsavel_id is not null then update public.profiles set papel = 'responsavel' where id = m.responsavel_id and papel = 'pendente'; end if;
  return cid;
end $$;

-- Secretaria troca o e-mail do 1º ou 2º responsável de uma criança
drop function if exists public.vincular_responsavel(uuid, text);
create or replace function public.vincular_responsavel(p_crianca uuid, p_email text, p_slot int default 1) returns text
language plpgsql security definer set search_path = public as $$
declare e text := nullif(lower(trim(p_email)), ''); conta public.profiles;
begin
  if not public.eh_gestao() then raise exception 'Somente a secretaria ou a direção podem alterar responsáveis.'; end if;
  if e is not null then
    select * into conta from public.profiles where email = e;
    if conta.id is not null and conta.papel not in ('responsavel','pendente') then raise exception 'Este e-mail pertence a uma conta da equipe.'; end if;
  end if;
  if p_slot = 2 then update public.criancas set responsavel2_email = e where id = p_crianca;
  else update public.criancas set responsavel_email = e where id = p_crianca; end if;
  if conta.id is not null then update public.profiles set papel = 'responsavel' where id = conta.id and papel = 'pendente'; return 'vinculado'; end if;
  return case when e is null then 'removido' else 'aguardando' end;
end $$;
revoke execute on function public.vincular_responsavel(uuid, text, int) from anon, public;
grant execute on function public.vincular_responsavel(uuid, text, int) to authenticated;

-- ============ 7) Cardápio ============
create table if not exists public.cardapio (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  refeicao text not null check (refeicao in ('Café da manhã','Almoço','Lanche da tarde','Jantar')),
  descricao text not null check (char_length(descricao) <= 500),
  atualizado_em timestamptz not null default now(),
  unique (data, refeicao)
);
alter table public.cardapio enable row level security;
drop policy if exists "cardápio: logados veem" on public.cardapio;
drop policy if exists "cardápio: equipe edita" on public.cardapio;
create policy "cardápio: logados veem" on public.cardapio for select to authenticated using (true);
create policy "cardápio: equipe edita" on public.cardapio for all to authenticated
  using (public.meu_papel() in ('funcionario','secretario','diretor')) with check (public.meu_papel() in ('funcionario','secretario','diretor'));

-- ============ 8) Pedidos de alteração de dados ============
create table if not exists public.solicitacoes (
  id uuid primary key default gen_random_uuid(),
  responsavel_id uuid references public.profiles(id) on delete set null default auth.uid(),
  responsavel_nome text,
  crianca_id uuid references public.criancas(id) on delete set null,
  tipo text not null check (tipo in ('Telefone','Endereço','E-mail de responsável','Nome do responsável','Incluir 2º responsável','Trocar 2º responsável','Outro')),
  detalhes text not null check (char_length(detalhes) between 3 and 1500),
  status text not null default 'aberta' check (status in ('aberta','em andamento','concluída','recusada')),
  resposta text check (char_length(resposta) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace function public.solicitacao_regras() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.responsavel_id := auth.uid();
    new.responsavel_nome := (select nome from public.profiles where id = auth.uid());
    new.status := 'aberta'; new.resposta := null;
    if new.crianca_id is not null and new.crianca_id not in (select public.minhas_criancas()) then
      raise exception 'Você só pode pedir alterações sobre crianças vinculadas à sua conta.';
    end if;
  else
    new.responsavel_id := old.responsavel_id; new.responsavel_nome := old.responsavel_nome;
    new.crianca_id := old.crianca_id; new.tipo := old.tipo; new.detalhes := old.detalhes; new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists solicitacao_regras on public.solicitacoes;
create trigger solicitacao_regras before insert or update on public.solicitacoes
for each row when (auth.uid() is not null) execute function public.solicitacao_regras();
revoke execute on function public.solicitacao_regras() from anon, authenticated, public;

alter table public.solicitacoes enable row level security;
drop policy if exists "solicitações: ver" on public.solicitacoes;
drop policy if exists "solicitações: pedir" on public.solicitacoes;
drop policy if exists "solicitações: secretaria responde" on public.solicitacoes;
create policy "solicitações: ver" on public.solicitacoes for select to authenticated using (responsavel_id = auth.uid() or public.eh_gestao());
create policy "solicitações: pedir" on public.solicitacoes for insert to authenticated with check (public.meu_papel() in ('responsavel','pendente'));
create policy "solicitações: secretaria responde" on public.solicitacoes for update to authenticated using (public.eh_gestao()) with check (public.eh_gestao());

-- ============ 9) Localização ao bater o ponto ============
alter table public.pontos
  add column if not exists latitude double precision check (latitude between -90 and 90),
  add column if not exists longitude double precision check (longitude between -180 and 180),
  add column if not exists precisao_m real check (precisao_m >= 0),
  add column if not exists distancia_m integer;

create table if not exists public.configuracoes (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.configuracoes enable row level security;
drop policy if exists "config: equipe vê" on public.configuracoes;
drop policy if exists "config: direção edita" on public.configuracoes;
create policy "config: equipe vê" on public.configuracoes for select to authenticated using (public.eh_equipe());
create policy "config: direção edita" on public.configuracoes for all to authenticated using (public.eh_diretor()) with check (public.eh_diretor());
-- usar: pede a localização; exigir: não deixa bater sem ela; lat/lng/raio: local do CEI
insert into public.configuracoes (chave, valor) values ('ponto', '{"usar": true, "exigir": false, "raio": 150, "lat": null, "lng": null}')
on conflict (chave) do nothing;

create or replace function public.ponto_hora_servidor() returns trigger
language plpgsql security definer set search_path = public as $$
declare cfg jsonb; clat double precision; clng double precision;
begin
  new.registrado_em := now();
  new.user_id := auth.uid();
  new.ajustado_por := null;
  new.nome_registro := (select nome from public.profiles where id = auth.uid());
  select valor into cfg from public.configuracoes where chave = 'ponto';
  if coalesce((cfg->>'exigir')::boolean, false) and (new.latitude is null or new.longitude is null) then
    raise exception 'LOCAL_OBRIGATORIO: a Direção exige a localização para bater o ponto. Permita o acesso à localização e tente de novo.';
  end if;
  clat := (cfg->>'lat')::double precision; clng := (cfg->>'lng')::double precision;
  if new.latitude is not null and new.longitude is not null and clat is not null and clng is not null then
    new.distancia_m := round(2 * 6371000 * asin(sqrt(
      power(sin(radians(new.latitude - clat) / 2), 2) +
      cos(radians(clat)) * cos(radians(new.latitude)) * power(sin(radians(new.longitude - clng) / 2), 2))))::int;
  else
    new.distancia_m := null;
  end if;
  return new;
end $$;

-- ============ 10) Conta da equipe também pode ser responsável (nunca o contrário) ============
-- Ligação pelos e-mails da matrícula vale para qualquer conta ativa (inclusive da equipe)
create or replace function public.criancas_vincular_emails() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.responsavel_email := nullif(lower(trim(new.responsavel_email)), '');
  new.responsavel2_email := nullif(lower(trim(new.responsavel2_email)), '');
  if new.responsavel_email is not null and new.responsavel2_email = new.responsavel_email then
    raise exception 'Os dois responsáveis precisam ter e-mails diferentes.';
  end if;
  if tg_op = 'INSERT' or new.responsavel_email is distinct from old.responsavel_email then
    new.responsavel_id := (select id from public.profiles where email = new.responsavel_email);
  end if;
  if tg_op = 'INSERT' or new.responsavel2_email is distinct from old.responsavel2_email then
    new.responsavel2_id := (select id from public.profiles where email = new.responsavel2_email);
  end if;
  return new;
end $$;

create or replace function public.vincular_nova_conta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.criancas set responsavel_id = new.id where responsavel_email = new.email and responsavel_id is null;
  update public.criancas set responsavel2_id = new.id where responsavel2_email = new.email and responsavel2_id is null;
  return new;
end $$;

create or replace function public.vincular_responsavel(p_crianca uuid, p_email text, p_slot int default 1) returns text
language plpgsql security definer set search_path = public as $$
declare e text := nullif(lower(trim(p_email)), ''); conta public.profiles;
begin
  if not public.eh_gestao() then raise exception 'Somente a secretaria ou a direção podem alterar responsáveis.'; end if;
  if e is not null then select * into conta from public.profiles where email = e; end if;
  if p_slot = 2 then update public.criancas set responsavel2_email = e where id = p_crianca;
  else update public.criancas set responsavel_email = e where id = p_crianca; end if;
  if conta.id is not null then
    update public.profiles set papel = 'responsavel' where id = conta.id and papel = 'pendente';
    return 'vinculado';
  end if;
  return case when e is null then 'removido' else 'aguardando' end;
end $$;

-- Quem é da equipe também pode pedir matrícula e alteração de dados como família
drop policy if exists "matrículas: responsável pede" on public.matriculas;
create policy "matrículas: responsável pede" on public.matriculas for insert to authenticated
  with check (public.eh_gestao() or (public.meu_papel() is not null and responsavel_id = auth.uid()));
drop policy if exists "solicitações: pedir" on public.solicitacoes;
create policy "solicitações: pedir" on public.solicitacoes for insert to authenticated with check (public.meu_papel() is not null);

-- Nunca o contrário: uma conta de responsável não vira conta da equipe
create or replace function public.protege_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.papel = 'responsavel' and new.papel in ('funcionario','professor','secretario','diretor') then
    raise exception 'Uma conta de responsável não pode virar conta da equipe. A pessoa deve criar outra conta, com um e-mail liberado pela Direção.';
  end if;
  if not public.eh_diretor() then
    if not (public.eh_gestao() and old.papel in ('pendente','responsavel') and new.papel in ('pendente','responsavel')) then
      new.papel := old.papel;
    end if;
    new.ativo := old.ativo;
  end if;
  new.email := old.email; new.id := old.id;
  return new;
end $$;

-- Convite da equipe não pode ser feito para um e-mail que já é conta de responsável
create or replace function public.convite_valido() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.profiles where email = lower(new.email) and papel = 'responsavel') then
    raise exception 'Este e-mail já é uma conta de responsável e não pode virar conta da equipe. Use outro e-mail para a equipe.';
  end if;
  if exists (select 1 from public.profiles where email = lower(new.email)) then
    raise exception 'Já existe uma conta com este e-mail. Ajuste o perfil dela em Equipe e permissões.';
  end if;
  return new;
end $$;
drop trigger if exists convite_valido on public.convites;
create trigger convite_valido before insert on public.convites for each row execute function public.convite_valido();
revoke execute on function public.convite_valido() from anon, authenticated, public;
