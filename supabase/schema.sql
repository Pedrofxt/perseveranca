-- CEI Perseverança · Paranaguá-PR
-- Responsáveis, crianças, pedidos de matrícula, avisos, agenda, frequência, ponto e contatos.

create type public.papel as enum ('pendente','responsavel','funcionario','professor','secretario','diretor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 120),
  email text,
  telefone text check (char_length(telefone) <= 40),
  avatar_url text check (char_length(avatar_url) <= 500),
  papel public.papel not null default 'pendente',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.meu_papel() returns public.papel
language sql stable security definer set search_path = public as $$
  select papel from public.profiles where id = auth.uid() and ativo
$$;
create or replace function public.eh_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() in ('funcionario','professor','secretario','diretor'), false)
$$;
create or replace function public.eh_gestao() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() in ('secretario','diretor'), false)
$$;
create or replace function public.eh_diretor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() = 'diretor', false)
$$;

create table public.convites (
  email text primary key check (email = lower(email)),
  papel public.papel not null check (papel <> 'pendente'),
  criado_por uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  faixa text,
  ordem int not null default 0,
  vagas int not null default 20 check (vagas >= 0),
  created_at timestamptz not null default now()
);

create table public.criancas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) <= 120),
  data_nascimento date,
  turma_id uuid references public.turmas(id) on delete set null,
  turno text not null default 'Integral' check (turno in ('Integral','Manhã','Tarde')),
  responsavel_id uuid references public.profiles(id) on delete set null,
  responsavel_nome text,
  responsavel_telefone text,
  observacoes text check (char_length(observacoes) <= 1000),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.matriculas (
  id uuid primary key default gen_random_uuid(),
  responsavel_id uuid references public.profiles(id) on delete set null default auth.uid(),
  crianca_nome text not null check (char_length(crianca_nome) between 2 and 120),
  crianca_nascimento date not null,
  turma_id uuid references public.turmas(id) on delete set null,
  turno text not null default 'Integral' check (turno in ('Integral','Manhã','Tarde')),
  responsavel_nome text not null check (char_length(responsavel_nome) between 2 and 120),
  parentesco text check (char_length(parentesco) <= 40),
  telefone text not null check (char_length(telefone) <= 40),
  endereco text check (char_length(endereco) <= 200),
  observacoes text check (char_length(observacoes) <= 1000),
  status text not null default 'enviada' check (status in ('enviada','em análise','lista de espera','aprovada','recusada','cancelada')),
  resposta text check (char_length(resposta) <= 1000),
  crianca_id uuid references public.criancas(id) on delete set null,
  atualizado_por uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index matriculas_resp on public.matriculas (responsavel_id, created_at desc);

create table public.frequencias (
  id uuid primary key default gen_random_uuid(),
  crianca_id uuid not null references public.criancas(id) on delete cascade,
  data date not null default current_date,
  presente boolean not null,
  lancado_por uuid references public.profiles(id) on delete set null default auth.uid(),
  unique (crianca_id, data)
);


-- Diário do dia de cada criança (escrito pela professora, lido pelo responsável)
create table public.diarios (
  id uuid primary key default gen_random_uuid(),
  crianca_id uuid not null references public.criancas(id) on delete cascade,
  data date not null default current_date,
  alimentacao text check (alimentacao in ('Comeu tudo','Comeu bem','Comeu pouco','Não quis comer')),
  sono text check (sono in ('Dormiu bem','Dormiu pouco','Não dormiu')),
  humor text check (humor in ('Muito feliz','Tranquilo(a)','Sonolento(a)','Choroso(a)','Agitado(a)')),
  atividades text check (char_length(atividades) <= 1500),
  recado text check (char_length(recado) <= 1500),
  autor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  autor_nome text,
  lido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (crianca_id, data)
);

create table public.avisos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(titulo) <= 140),
  corpo text not null check (char_length(corpo) <= 4000),
  publico text not null check (publico in ('publico','responsaveis','equipe')),
  turma_id uuid references public.turmas(id) on delete cascade,
  fixado boolean not null default false,
  autor_id uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  data date not null,
  descricao text,
  created_at timestamptz not null default now()
);

create table public.contatos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 120),
  email text not null check (char_length(email) <= 200),
  telefone text check (char_length(telefone) <= 40),
  assunto text not null check (char_length(assunto) <= 80),
  mensagem text not null check (char_length(mensagem) <= 3000),
  status text not null default 'novo' check (status in ('novo','em atendimento','respondido')),
  created_at timestamptz not null default now()
);

create table public.pontos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  nome_registro text,
  tipo text not null check (tipo in ('entrada','saida_intervalo','retorno_intervalo','saida')),
  registrado_em timestamptz not null default now(),
  observacao text check (char_length(observacao) <= 300),
  ajustado_por uuid references public.profiles(id) on delete set null
);
create index pontos_user_data on public.pontos (user_id, registrado_em desc);

-- ===== Gatilhos =====
create or replace function public.ponto_hora_servidor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.registrado_em := now();
  new.user_id := auth.uid();
  new.ajustado_por := null;
  new.nome_registro := (select nome from public.profiles where id = auth.uid());
  return new;
end $$;
create trigger ponto_hora before insert on public.pontos
for each row when (auth.uid() is not null) execute function public.ponto_hora_servidor();

create or replace function public.ponto_ajuste() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.registrado_em is not distinct from old.registrado_em
     and new.observacao is not distinct from old.observacao and new.tipo = old.tipo then
    if new.user_id is not null and new.user_id is distinct from old.user_id then new.user_id := old.user_id; end if;
    if new.ajustado_por is not null and new.ajustado_por is distinct from old.ajustado_por then new.ajustado_por := old.ajustado_por; end if;
    new.nome_registro := old.nome_registro;
    return new;
  end if;
  new.ajustado_por := auth.uid();
  new.user_id := old.user_id;
  new.nome_registro := old.nome_registro;
  return new;
end $$;
create trigger ponto_ajuste before update on public.pontos
for each row execute function public.ponto_ajuste();

-- Responsável só cria pedido em nome próprio e com status inicial; gestão controla o resto
create or replace function public.matricula_regras() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.eh_gestao() then
      new.responsavel_id := auth.uid();
      new.status := 'enviada'; new.resposta := null; new.crianca_id := null; new.atualizado_por := null;
    end if;
    new.created_at := now(); new.updated_at := now();
    return new;
  end if;
  if not public.eh_gestao() then
    -- responsável só pode cancelar um pedido que ainda não foi aprovado
    if new.status = 'cancelada' and old.status in ('enviada','em análise','lista de espera') then
      new := old; new.status := 'cancelada';
    else
      raise exception 'Este pedido não pode mais ser alterado. Fale com a secretaria.';
    end if;
  else
    new.atualizado_por := auth.uid();
    new.responsavel_id := old.responsavel_id;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger matricula_regras before insert or update on public.matriculas
for each row execute function public.matricula_regras();


create or replace function public.diario_autor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.autor_id := auth.uid();
  new.autor_nome := (select nome from public.profiles where id = auth.uid());
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.lido_em := null; new.created_at := old.created_at; end if;
  return new;
end $$;
create trigger diario_autor before insert or update on public.diarios
for each row when (auth.uid() is not null) execute function public.diario_autor();

create or replace function public.marcar_diario_lido(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.diarios d set lido_em = coalesce(d.lido_em, now())
  where d.id = p_id and d.crianca_id in (select id from public.criancas where responsavel_id = auth.uid());
$$;

create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; p public.papel := 'pendente';
begin
  select * into c from public.convites where email = lower(new.email);
  if c.email is not null then
    p := c.papel;
  elsif not exists (select 1 from public.profiles where papel = 'diretor')
        and coalesce(new.raw_user_meta_data->>'origem','') <> 'responsavel' then
    p := 'diretor';
  elsif new.raw_user_meta_data->>'origem' = 'responsavel' then
    p := 'responsavel';
  end if;
  insert into public.profiles (id, nome, email, telefone, papel)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'nome',''), split_part(new.email,'@',1)),
          lower(new.email), nullif(new.raw_user_meta_data->>'telefone',''), p);
  if c.email is not null then delete from public.convites where email = c.email; end if;
  return new;
end $$;
create trigger ao_criar_usuario after insert on auth.users
for each row execute function public.novo_usuario();

create or replace function public.protege_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_diretor() then
    if not (public.eh_gestao() and old.papel in ('pendente','responsavel') and new.papel in ('pendente','responsavel')) then
      new.papel := old.papel;
    end if;
    new.ativo := old.ativo;
  end if;
  new.email := old.email; new.id := old.id;
  return new;
end $$;
create trigger protege_perfil before update on public.profiles
for each row execute function public.protege_perfil();

-- ===== Funções =====
-- Aprovar pedido: cria a criança vinculada ao responsável
create or replace function public.aprovar_matricula(p_id uuid, p_turma uuid, p_resposta text) returns uuid
language plpgsql security definer set search_path = public as $$
declare m public.matriculas; cid uuid;
begin
  if not public.eh_gestao() then raise exception 'Somente a secretaria ou a direção podem aprovar matrículas.'; end if;
  select * into m from public.matriculas where id = p_id for update;
  if m.id is null then raise exception 'Pedido não encontrado.'; end if;
  if m.status = 'aprovada' then raise exception 'Este pedido já foi aprovado.'; end if;
  if m.status = 'cancelada' then raise exception 'Este pedido foi cancelado pelo responsável.'; end if;
  insert into public.criancas (nome, data_nascimento, turma_id, turno, responsavel_id, responsavel_nome, responsavel_telefone, observacoes)
  values (m.crianca_nome, m.crianca_nascimento, coalesce(p_turma, m.turma_id), m.turno, m.responsavel_id, m.responsavel_nome, m.telefone, m.observacoes)
  returning id into cid;
  update public.matriculas set status = 'aprovada', crianca_id = cid, turma_id = coalesce(p_turma, m.turma_id),
    resposta = coalesce(nullif(trim(p_resposta),''), 'Matrícula aprovada! Bem-vindos ao CEI Perseverança.') where id = p_id;
  if m.responsavel_id is not null then
    update public.profiles set papel = 'responsavel' where id = m.responsavel_id and papel = 'pendente';
  end if;
  return cid;
end $$;

-- Vincular uma criança já cadastrada a uma conta de responsável (pelo e-mail)
create or replace function public.vincular_responsavel(p_crianca uuid, p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare conta public.profiles;
begin
  if not public.eh_gestao() then raise exception 'Somente a secretaria ou a direção podem vincular responsáveis.'; end if;
  select * into conta from public.profiles where email = lower(trim(p_email));
  if conta.id is null then raise exception 'Nenhuma conta com este e-mail. Peça para o responsável criar a conta na Área do Responsável e tente de novo.'; end if;
  if conta.papel not in ('responsavel','pendente') then raise exception 'Este e-mail pertence a uma conta da equipe.'; end if;
  update public.criancas set responsavel_id = conta.id where id = p_crianca;
  update public.profiles set papel = 'responsavel' where id = conta.id and papel = 'pendente';
  return conta.nome;
end $$;

create or replace function public.excluir_minha_conta() returns void
language plpgsql security definer set search_path = public, auth as $$
declare eu public.profiles;
begin
  select * into eu from public.profiles where id = auth.uid();
  if eu.id is null then raise exception 'Sessão inválida. Entre novamente.'; end if;
  if eu.papel = 'diretor' and (select count(*) from public.profiles where papel = 'diretor' and ativo and id <> eu.id) = 0 then
    raise exception 'Você é a única conta da direção. Passe o perfil de Direção para outra pessoa antes de excluir sua conta.';
  end if;
  delete from auth.users where id = eu.id;
end $$;

create or replace function public.excluir_usuario(alvo uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.eh_diretor() then raise exception 'Somente a direção pode excluir contas.'; end if;
  if alvo = auth.uid() then raise exception 'Para excluir a sua própria conta, use Configurações da conta.'; end if;
  delete from auth.users where id = alvo;
end $$;

-- Vagas por turma (público pode ver para o formulário)
create or replace function public.vagas_turmas() returns table (id uuid, nome text, faixa text, ordem int, vagas int, ocupadas bigint)
language sql stable security definer set search_path = public as $$
  select t.id, t.nome, t.faixa, t.ordem, t.vagas, (select count(*) from public.criancas c where c.turma_id = t.id and c.ativo)
  from public.turmas t order by t.ordem
$$;

-- ===== RLS =====
alter table public.profiles enable row level security;
alter table public.convites enable row level security;
alter table public.turmas enable row level security;
alter table public.criancas enable row level security;
alter table public.matriculas enable row level security;
alter table public.frequencias enable row level security;
alter table public.diarios enable row level security;
alter table public.avisos enable row level security;
alter table public.eventos enable row level security;
alter table public.contatos enable row level security;
alter table public.pontos enable row level security;

create policy "perfil: próprio ou equipe" on public.profiles for select to authenticated using (id = auth.uid() or public.eh_equipe());
create policy "perfil: editar o próprio" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "perfil: gestão edita" on public.profiles for update to authenticated using (public.eh_gestao()) with check (public.eh_gestao());

create policy "convites: gestão vê" on public.convites for select to authenticated using (public.eh_gestao());
create policy "convites: gestão cria" on public.convites for insert to authenticated
  with check (public.eh_diretor() or (public.meu_papel() = 'secretario' and papel in ('responsavel','professor','funcionario')));
create policy "convites: gestão remove" on public.convites for delete to authenticated using (public.eh_gestao());

create policy "turmas: todos veem" on public.turmas for select to anon, authenticated using (true);
create policy "turmas: gestão edita" on public.turmas for all to authenticated using (public.eh_gestao()) with check (public.eh_gestao());

create policy "crianças: equipe ou responsável" on public.criancas for select to authenticated using (public.eh_equipe() or responsavel_id = auth.uid());
create policy "crianças: gestão cria" on public.criancas for insert to authenticated with check (public.eh_gestao());
create policy "crianças: gestão edita" on public.criancas for update to authenticated using (public.eh_gestao()) with check (public.eh_gestao());
create policy "crianças: diretor remove" on public.criancas for delete to authenticated using (public.eh_diretor());

create policy "matrículas: ver as próprias ou gestão" on public.matriculas for select to authenticated using (responsavel_id = auth.uid() or public.eh_gestao());
create policy "matrículas: responsável pede" on public.matriculas for insert to authenticated
  with check (public.eh_gestao() or (public.meu_papel() in ('responsavel','pendente') and responsavel_id = auth.uid()));
create policy "matrículas: responsável cancela ou gestão atualiza" on public.matriculas for update to authenticated
  using (responsavel_id = auth.uid() or public.eh_gestao()) with check (responsavel_id = auth.uid() or public.eh_gestao());
create policy "matrículas: diretor remove" on public.matriculas for delete to authenticated using (public.eh_diretor());

create policy "frequência: equipe ou responsável" on public.frequencias for select to authenticated
  using (public.eh_equipe() or crianca_id in (select id from public.criancas where responsavel_id = auth.uid()));
create policy "frequência: lançar" on public.frequencias for insert to authenticated with check (public.meu_papel() in ('professor','secretario','diretor'));
create policy "frequência: corrigir" on public.frequencias for update to authenticated
  using (public.meu_papel() in ('professor','secretario','diretor')) with check (public.meu_papel() in ('professor','secretario','diretor'));


create policy "diário: equipe ou responsável" on public.diarios for select to authenticated
  using (public.eh_equipe() or crianca_id in (select id from public.criancas where responsavel_id = auth.uid()));
create policy "diário: escrever" on public.diarios for insert to authenticated with check (public.meu_papel() in ('professor','secretario','diretor'));
create policy "diário: corrigir" on public.diarios for update to authenticated
  using (public.meu_papel() in ('professor','secretario','diretor')) with check (public.meu_papel() in ('professor','secretario','diretor'));
create policy "diário: gestão remove" on public.diarios for delete to authenticated using (public.eh_gestao());

create policy "avisos: públicos" on public.avisos for select to anon, authenticated using (publico = 'publico');
create policy "avisos: responsáveis" on public.avisos for select to authenticated using (
  publico = 'responsaveis' and (public.eh_equipe() or (public.meu_papel() = 'responsavel' and
    (turma_id is null or turma_id in (select turma_id from public.criancas where responsavel_id = auth.uid())))));
create policy "avisos: equipe" on public.avisos for select to authenticated using (publico = 'equipe' and public.eh_equipe());
create policy "avisos: gestão publica" on public.avisos for insert to authenticated with check (public.eh_gestao());
create policy "avisos: gestão edita" on public.avisos for update to authenticated using (public.eh_gestao()) with check (public.eh_gestao());
create policy "avisos: gestão remove" on public.avisos for delete to authenticated using (public.eh_gestao());

create policy "eventos: todos veem" on public.eventos for select to anon, authenticated using (true);
create policy "eventos: gestão edita" on public.eventos for all to authenticated using (public.eh_gestao()) with check (public.eh_gestao());

create policy "contatos: qualquer um envia" on public.contatos for insert to anon, authenticated with check (status = 'novo');
create policy "contatos: gestão lê" on public.contatos for select to authenticated using (public.eh_gestao());
create policy "contatos: gestão atualiza" on public.contatos for update to authenticated using (public.eh_gestao()) with check (public.eh_gestao());

create policy "ponto: o próprio ou diretor" on public.pontos for select to authenticated using (user_id = auth.uid() or public.eh_diretor());
create policy "ponto: bater" on public.pontos for insert to authenticated with check (public.eh_equipe() and user_id = auth.uid());
create policy "ponto: diretor ajusta" on public.pontos for update to authenticated using (public.eh_diretor()) with check (public.eh_diretor());
create policy "ponto: diretor remove" on public.pontos for delete to authenticated using (public.eh_diretor());

-- ===== Permissões de funções =====
revoke execute on function public.meu_papel(), public.eh_equipe(), public.eh_gestao(), public.eh_diretor() from anon, public;
grant execute on function public.meu_papel(), public.eh_equipe(), public.eh_gestao(), public.eh_diretor() to authenticated;
revoke execute on function public.novo_usuario(), public.protege_perfil(), public.ponto_hora_servidor(), public.ponto_ajuste(), public.matricula_regras(), public.diario_autor() from anon, authenticated, public;
revoke execute on function public.marcar_diario_lido(uuid), public.aprovar_matricula(uuid, uuid, text), public.vincular_responsavel(uuid, text), public.excluir_minha_conta(), public.excluir_usuario(uuid) from anon, public;
grant execute on function public.marcar_diario_lido(uuid), public.aprovar_matricula(uuid, uuid, text), public.vincular_responsavel(uuid, text), public.excluir_minha_conta(), public.excluir_usuario(uuid) to authenticated;
grant execute on function public.vagas_turmas() to anon, authenticated;

-- ===== Fotos de perfil =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "avatar: ver os próprios" on storage.objects for select to authenticated using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar: enviar" on storage.objects for insert to authenticated with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar: trocar" on storage.objects for update to authenticated using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar: apagar" on storage.objects for delete to authenticated using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===== Dados iniciais =====
insert into public.turmas (nome, faixa, ordem, vagas) values
  ('Infantil 1 · Berçário', 'Bebês', 1, 12),
  ('Infantil 2', 'Primeiros passos', 2, 15),
  ('Infantil 3', 'Descobertas', 3, 18),
  ('Infantil 4', 'Pré-escola', 4, 20),
  ('Infantil 5', 'Pré-escola', 5, 20);

insert into public.avisos (titulo, corpo, publico, fixado, autor_id) values
  ('Novo site do CEI Perseverança', 'Famílias agora têm a Área do Responsável: pedidos de matrícula, avisos da turma e frequência num só lugar.', 'publico', true, null);
