-- Sudoku Academy · ligas y ranking
-- Pega este archivo entero en Supabase → SQL Editor → Run. Se puede ejecutar varias veces sin romper nada.
--
-- Seguridad: las tablas no se pueden leer ni escribir directamente desde la web (RLS activado y sin
-- políticas). Todo pasa por funciones que comprueban la clave secreta de cada jugador, limitan cuánta
-- XP se puede sumar de golpe y nunca devuelven las claves.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sa_players (
  id          uuid primary key default gen_random_uuid(),
  secret_hash bytea not null,
  name        text not null,
  tier        smallint not null default 0,        -- 0 Bronce … 9 Diamante
  xp_total    integer not null default 0,
  last_total  integer not null default 0,         -- último total que mandó el cliente (para calcular deltas)
  synced      boolean not null default false,
  level       smallint not null default 1,
  streak      smallint not null default 0,
  look        jsonb not null default '{}'::jsonb, -- lo que lleva puesto la mascota
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.sa_groups (
  id    bigserial primary key,
  week  text not null,
  tier  smallint not null,
  size  integer not null default 0
);
create index if not exists sa_groups_week_tier on public.sa_groups (week, tier);

create table if not exists public.sa_members (
  week      text not null,
  player_id uuid not null references public.sa_players (id) on delete cascade,
  group_id  bigint not null references public.sa_groups (id) on delete cascade,
  tier      smallint not null,
  xp        integer not null default 0,
  result    smallint,                              -- al cerrar: 1 sube, 0 se queda, -1 baja
  primary key (week, player_id)
);
create index if not exists sa_members_group on public.sa_members (group_id, xp desc);
create index if not exists sa_members_week_xp on public.sa_members (week, xp desc);

alter table public.sa_players enable row level security;
alter table public.sa_groups  enable row level security;
alter table public.sa_members enable row level security;
revoke all on public.sa_players, public.sa_groups, public.sa_members from anon, authenticated;

-- ---------- utilidades ----------
create or replace function public.sa_week(t timestamptz default now()) returns text
language sql stable as $$ select to_char(t at time zone 'utc', 'IYYY-"W"IW') $$;

create or replace function public.sa_week_end() returns timestamptz
language sql stable as $$ select (date_trunc('week', now() at time zone 'utc') + interval '7 days') at time zone 'utc' $$;

create or replace function public.sa_clean_name(p text) returns text
language plpgsql immutable as $$
declare n text := regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g');
begin
  if n !~ '^[A-Za-zÀ-ÖØ-öø-ÿ0-9_. -]{3,16}$' then raise exception 'bad_name' using errcode = '22023'; end if;
  return n;
end $$;

create or replace function public.sa_clean_look(p jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
  from jsonb_each(coalesce(p, '{}'::jsonb)) as e(k, v)
  where k in ('hat', 'face', 'neck') and jsonb_typeof(v) = 'string' and length(v #>> '{}') <= 20
$$;

create or replace function public.sa_auth(p_id uuid, p_secret text) returns public.sa_players
language plpgsql security definer set search_path = public, extensions as $$
declare r public.sa_players;
begin
  select * into r from public.sa_players where id = p_id;
  if r.id is null or r.secret_hash <> extensions.digest(coalesce(p_secret, ''), 'sha256') then
    raise exception 'auth' using errcode = '28000';
  end if;
  return r;
end $$;

-- Mete al jugador en un grupo de su liga (máximo 30 por grupo) para la semana.
create or replace function public.sa_assign(p_player uuid, p_tier smallint, p_week text) returns bigint
language plpgsql security definer set search_path = public as $$
declare g bigint;
begin
  select id into g from public.sa_groups where week = p_week and tier = p_tier and size < 30 order by id limit 1 for update skip locked;
  if g is null then insert into public.sa_groups (week, tier) values (p_week, p_tier) returning id into g; end if;
  update public.sa_groups set size = size + 1 where id = g;
  insert into public.sa_members (week, player_id, group_id, tier) values (p_week, p_player, g, p_tier);
  return g;
end $$;

-- ---------- API pública ----------
create or replace function public.sa_register(p_name text) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare s text := encode(extensions.gen_random_bytes(24), 'hex'); i uuid;
begin
  insert into public.sa_players (secret_hash, name) values (extensions.digest(s, 'sha256'), public.sa_clean_name(p_name)) returning id into i;
  return json_build_object('id', i, 'secret', s);
end $$;

/** Envía el progreso del jugador. La XP semanal se calcula en el servidor a partir del aumento del total. */
create or replace function public.sa_sync(p_id uuid, p_secret text, p_name text, p_xp_total integer, p_week_xp integer,
                                          p_level integer, p_streak integer, p_look jsonb) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  me public.sa_players := public.sa_auth(p_id, p_secret);
  w text := public.sa_week();
  m public.sa_members; prev public.sa_members;
  rnk integer; n integer; old_tier smallint := me.tier; new_tier smallint := me.tier; res smallint;
  delta integer; total integer := greatest(0, least(coalesce(p_xp_total, 0), 2000000));
  moved json := null;
begin
  if p_name is not null and p_name <> me.name then me.name := public.sa_clean_name(p_name); end if;

  select * into m from public.sa_members where week = w and player_id = me.id;
  if m.player_id is null then
    -- Cierre perezoso de la última semana jugada: sube el top 7, baja el último 5 (si el grupo tiene 10 o más).
    select * into prev from public.sa_members where player_id = me.id and week < w order by week desc limit 1;
    if prev.player_id is not null and prev.result is null then
      select count(*) + 1 into rnk from public.sa_members x where x.group_id = prev.group_id and (x.xp > prev.xp or (x.xp = prev.xp and x.player_id < prev.player_id));
      select count(*) into n from public.sa_members x where x.group_id = prev.group_id;
      res := case when prev.xp > 0 and rnk <= 7 and prev.tier < 9 then 1
                  when n >= 10 and rnk > n - 5 and prev.tier > 0 then -1 else 0 end;
      update public.sa_members set result = res where week = prev.week and player_id = me.id;
      new_tier := prev.tier + res;
      moved := json_build_object('week', prev.week, 'rank', rnk, 'size', n, 'from', prev.tier, 'to', new_tier, 'result', res);
    end if;
    me.tier := new_tier;
    perform public.sa_assign(me.id, new_tier, w);
    select * into m from public.sa_members where week = w and player_id = me.id;
  end if;

  if not me.synced then
    delta := greatest(0, least(coalesce(p_week_xp, 0), total, 3000));
    me.xp_total := least(total, 200000);
  else
    delta := greatest(0, least(total - me.last_total, 1500));
    me.xp_total := me.xp_total + delta;
  end if;
  update public.sa_members set xp = least(xp + delta, 30000) where week = w and player_id = me.id returning * into m;

  update public.sa_players set
    name = me.name, tier = me.tier, xp_total = me.xp_total, last_total = total, synced = true,
    level = greatest(1, least(coalesce(p_level, 1), 999)), streak = greatest(0, least(coalesce(p_streak, 0), 9999)),
    look = public.sa_clean_look(p_look), updated_at = now()
  where id = me.id;

  return json_build_object('week', w, 'tier', me.tier, 'xp', m.xp, 'ends_at', public.sa_week_end(), 'moved', moved, 'name', me.name);
end $$;

/** Tu grupo de liga de esta semana, ordenado por XP. No expone ids ni claves. */
create or replace function public.sa_group(p_id uuid) returns json
language sql stable security definer set search_path = public as $$
  with mine as (select group_id, tier from public.sa_members where week = public.sa_week() and player_id = p_id)
  select json_build_object(
    'tier', (select tier from mine),
    'ends_at', public.sa_week_end(),
    'rows', coalesce((
      select json_agg(json_build_object('name', p.name, 'xp', x.xp, 'level', p.level, 'streak', p.streak, 'look', p.look, 'me', coalesce(p.id = p_id, false))
                      order by x.xp desc, x.player_id)
      from public.sa_members x join public.sa_players p on p.id = x.player_id
      where x.group_id = (select group_id from mine)), '[]'::json))
$$;

/** Ranking global: 'all' = XP total; 'week' = XP de esta semana. Incluye tu puesto si pasas tu id. */
create or replace function public.sa_top(p_kind text default 'all', p_id uuid default null) returns json
language plpgsql stable security definer set search_path = public as $$
declare rows json; mine json;
begin
  if p_kind = 'week' then
    select coalesce(json_agg(r), '[]'::json) into rows from (
      select p.name, x.xp, p.level, p.tier, p.look, coalesce(p.id = p_id, false) as me
      from public.sa_members x join public.sa_players p on p.id = x.player_id
      where x.week = public.sa_week() and x.xp > 0 order by x.xp desc, p.id limit 50) r;
    if p_id is not null then
      select json_build_object('rank', 1 + (select count(*) from public.sa_members y where y.week = x.week and y.xp > x.xp), 'xp', x.xp) into mine
      from public.sa_members x where x.week = public.sa_week() and x.player_id = p_id;
    end if;
  else
    select coalesce(json_agg(r), '[]'::json) into rows from (
      select name, xp_total as xp, level, tier, look, coalesce(id = p_id, false) as me
      from public.sa_players where xp_total > 0 order by xp_total desc, id limit 50) r;
    if p_id is not null then
      select json_build_object('rank', 1 + (select count(*) from public.sa_players y where y.xp_total > p.xp_total), 'xp', p.xp_total) into mine
      from public.sa_players p where p.id = p_id;
    end if;
  end if;
  return json_build_object('rows', rows, 'me', mine, 'players', (select count(*) from public.sa_players));
end $$;

-- Solo las funciones públicas son accesibles desde la web.
revoke execute on function public.sa_week(timestamptz), public.sa_week_end(), public.sa_clean_name(text), public.sa_clean_look(jsonb),
  public.sa_auth(uuid, text), public.sa_assign(uuid, smallint, text), public.sa_register(text),
  public.sa_sync(uuid, text, text, integer, integer, integer, integer, jsonb), public.sa_group(uuid), public.sa_top(text, uuid)
  from public, anon, authenticated;
grant execute on function public.sa_register(text) to anon, authenticated;
grant execute on function public.sa_sync(uuid, text, text, integer, integer, integer, integer, jsonb) to anon, authenticated;
grant execute on function public.sa_group(uuid) to anon, authenticated;
grant execute on function public.sa_top(text, uuid) to anon, authenticated;
