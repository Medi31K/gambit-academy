-- Gambit Academy: initial schema.
-- Run once in the Supabase SQL Editor (or with `supabase db push`).
--
-- Tables: profiles, puzzles, puzzle_attempts, lessons.
-- All writes that touch ratings or roles go through SECURITY DEFINER functions,
-- so the browser can never set its own rating or make itself an admin.

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext not null unique
    check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  -- Kept here only so people can log in with their username; never exposed to other users.
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  banned boolean not null default false,
  -- Gambit Academy training rating. Not an official Elo.
  training_rating integer not null default 1200,
  rated_attempts integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not banned
  );
$$;

create policy "Read own profile, admins read all"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());
-- No insert/update/delete policies: rows are created by the signup trigger and
-- changed only through the functions below.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted text := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
begin
  if wanted is null then
    raise exception 'A username is required.';
  end if;
  insert into public.profiles (id, username, email)
  values (new.id, wanted, coalesce(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_username ~ '^[A-Za-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = p_username::citext);
$$;

-- Used only by the site's server (secret key) to log people in by username.
create or replace function public.login_lookup(p_identifier text)
returns table (email text, banned boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.email, p.banned
  from public.profiles p
  where p.username = p_identifier::citext or lower(p.email) = lower(p_identifier)
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Puzzles (imported from the Lichess puzzle database, CC0)
-- ---------------------------------------------------------------------------
create table public.puzzles (
  id text primary key,
  -- Position BEFORE the opponent's first move, exactly as in the Lichess CSV.
  fen text not null,
  -- UCI moves. moves[1] is the opponent's move; the player answers with moves[2], etc.
  moves text[] not null check (cardinality(moves) >= 2),
  rating integer not null,
  rating_deviation integer,
  popularity integer,
  nb_plays integer,
  themes text[] not null default '{}',
  game_url text,
  opening_tags text[] not null default '{}',
  random_key double precision not null default random(),
  created_at timestamptz not null default now()
);

create index puzzles_rating_random_idx on public.puzzles (rating, random_key);
create index puzzles_themes_idx on public.puzzles using gin (themes);

alter table public.puzzles enable row level security;

create policy "Anyone can read puzzles"
  on public.puzzles for select using (true);
create policy "Admins can add puzzles"
  on public.puzzles for insert with check (public.is_admin());
create policy "Admins can change puzzles"
  on public.puzzles for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete puzzles"
  on public.puzzles for delete using (public.is_admin());

create table public.puzzle_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  puzzle_id text not null references public.puzzles (id) on delete cascade,
  correct boolean not null,
  used_help boolean not null default false,
  rated boolean not null default false,
  rating_before integer,
  rating_after integer,
  created_at timestamptz not null default now()
);

create index puzzle_attempts_user_idx on public.puzzle_attempts (user_id, created_at desc);
create index puzzle_attempts_user_puzzle_idx on public.puzzle_attempts (user_id, puzzle_id);

alter table public.puzzle_attempts enable row level security;

create policy "Read own attempts, admins read all"
  on public.puzzle_attempts for select
  using (user_id = auth.uid() or public.is_admin());
-- Attempts are written only by record_attempt().

-- Picks a puzzle near the target rating, skipping the excluded ids and, for a
-- logged-in user, puzzles they tried recently. Widens the window if needed.
-- p_theme limits the pick to one Lichess theme tag (for practising a weakness).
create or replace function public.next_puzzle(
  p_target_rating integer default null,
  p_exclude text[] default '{}',
  p_theme text default null
)
returns setof public.puzzles
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target integer;
  excluded text[];
  win integer;
  seed double precision := random();
  found_row public.puzzles;
begin
  select coalesce(p_target_rating, (select training_rating from public.profiles where id = auth.uid()), 1200)
    into target;

  select coalesce(p_exclude, '{}') || coalesce(array_agg(recent.puzzle_id), '{}')
    into excluded
    from (
      select a.puzzle_id from public.puzzle_attempts a
      where a.user_id = auth.uid()
      order by a.created_at desc
      limit 300
    ) recent;

  foreach win in array array[100, 250, 600, 5000] loop
    select * into found_row from public.puzzles p
      where p.rating between target - win and target + win
        and not (p.id = any (excluded))
        and (p_theme is null or p.themes @> array[p_theme])
        and p.random_key >= seed
      order by p.random_key
      limit 1;
    if not found then
      select * into found_row from public.puzzles p
        where p.rating between target - win and target + win
          and not (p.id = any (excluded))
          and (p_theme is null or p.themes @> array[p_theme])
        order by p.random_key
        limit 1;
    end if;
    if found then
      return next found_row;
      return;
    end if;
  end loop;
end;
$$;

-- Records a finished puzzle and updates the training rating (Elo-style).
-- Only the first try at each puzzle is rated, and using a hint or the solution
-- counts as not solved.
create or replace function public.record_attempt(
  p_puzzle_id text,
  p_correct boolean,
  p_used_help boolean default false
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles;
  puzzle_rating integer;
  first_try boolean;
  score numeric;
  expected numeric;
  k integer;
  new_rating integer;
begin
  select * into me from public.profiles where id = auth.uid() for update;
  if me.id is null then
    raise exception 'Log in to save progress.';
  end if;
  if me.banned then
    raise exception 'This account is suspended.';
  end if;

  select rating into puzzle_rating from public.puzzles where id = p_puzzle_id;
  if puzzle_rating is null then
    raise exception 'Unknown puzzle.';
  end if;

  first_try := not exists (
    select 1 from public.puzzle_attempts where user_id = me.id and puzzle_id = p_puzzle_id
  );

  new_rating := me.training_rating;
  if first_try then
    score := case when p_correct and not p_used_help then 1 else 0 end;
    expected := 1 / (1 + power(10::numeric, (puzzle_rating - me.training_rating) / 400.0));
    k := case when me.rated_attempts < 20 then 40 else 20 end;
    new_rating := least(3200, greatest(400, me.training_rating + round(k * (score - expected))::integer));
    update public.profiles
      set training_rating = new_rating, rated_attempts = rated_attempts + 1
      where id = me.id;
  end if;

  insert into public.puzzle_attempts
    (user_id, puzzle_id, correct, used_help, rated, rating_before, rating_after)
  values
    (me.id, p_puzzle_id, p_correct, p_used_help, first_try, me.training_rating, new_rating);

  return json_build_object(
    'rated', first_try,
    'rating', new_rating,
    'delta', new_rating - me.training_rating
  );
end;
$$;

-- Lichess tags that describe length, phase or result rather than a tactical idea.
create or replace function public.is_meta_theme(theme text)
returns boolean
language sql
immutable
as $$
  select theme = any (array[
    'short', 'long', 'veryLong', 'oneMove', 'opening', 'middlegame', 'endgame',
    'advantage', 'crushing', 'equality', 'mate', 'master', 'masterVsMaster', 'superGM'
  ]);
$$;

create or replace function public.my_progress()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select * from public.profiles where id = auth.uid()
  ),
  attempts as (
    select a.*, p.themes
    from public.puzzle_attempts a
    join public.puzzles p on p.id = a.puzzle_id
    where a.user_id = (select id from me) and a.rated
  ),
  by_theme as (
    select t.theme,
           count(*) filter (where a.correct and not a.used_help) as correct,
           count(*) as total
    from attempts a, unnest(a.themes) as t(theme)
    where not public.is_meta_theme(t.theme)
    group by t.theme
  )
  select case when (select id from me) is null then null else json_build_object(
    'trainingRating', (select training_rating from me),
    'ratedAttempts', (select rated_attempts from me),
    'accuracy', coalesce((
      select json_agg(json_build_object('theme', theme, 'correct', correct, 'total', total)
                      order by total desc, theme)
      from by_theme), '[]'::json),
    'mistakes', coalesce((
      select json_agg(m order by m.date desc) from (
        select a.puzzle_id as "puzzleId",
               coalesce((select t from unnest(a.themes) t where not public.is_meta_theme(t) limit 1), 'mixed') as theme,
               a.created_at as date
        from attempts a
        where not a.correct or a.used_help
        order by a.created_at desc
        limit 10
      ) m), '[]'::json),
    'weakestTheme', (
      select theme from by_theme
      where total >= 3
      order by correct::numeric / total, total desc
      limit 1)
  ) end;
$$;

-- ---------------------------------------------------------------------------
-- Lessons (written by admins)
-- ---------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  category_id text not null check (category_id in
    ('checkmates', 'tactics', 'openings', 'endgames', 'positional', 'calculation')),
  title text not null check (length(title) between 1 and 120),
  explanation text not null default '',
  fen text not null,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lessons_category_idx on public.lessons (category_id, sort_order);

alter table public.lessons enable row level security;

create policy "Anyone can read published lessons, admins read all"
  on public.lessons for select using (published or public.is_admin());
create policy "Admins can add lessons"
  on public.lessons for insert with check (public.is_admin());
create policy "Admins can change lessons"
  on public.lessons for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete lessons"
  on public.lessons for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Admin tools
-- ---------------------------------------------------------------------------
create or replace function public.admin_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;
  return json_build_object(
    'puzzles', (select count(*) from public.puzzles),
    'lessons', (select count(*) from public.lessons),
    'users', (select count(*) from public.profiles),
    'attempts', (select count(*) from public.puzzle_attempts)
  );
end;
$$;

create or replace function public.admin_list_users(p_search text default '', p_limit integer default 50)
returns table (
  id uuid, username text, email text, role text, banned boolean,
  training_rating integer, rated_attempts integer, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;
  return query
    select p.id, p.username::text, p.email, p.role, p.banned,
           p.training_rating, p.rated_attempts, p.created_at
    from public.profiles p
    where coalesce(p_search, '') = ''
       or p.username::text ilike '%' || p_search || '%'
       or p.email ilike '%' || p_search || '%'
    order by p.created_at desc
    limit least(greatest(p_limit, 1), 200);
end;
$$;

create or replace function public.admin_set_banned(p_user_id uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot ban yourself.';
  end if;
  update public.profiles set banned = p_banned where id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
revoke all on function public.is_admin() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.username_available(text) from public;
revoke all on function public.login_lookup(text) from public;
revoke all on function public.next_puzzle(integer, text[], text) from public;
revoke all on function public.record_attempt(text, boolean, boolean) from public;
revoke all on function public.my_progress() from public;
revoke all on function public.admin_stats() from public;
revoke all on function public.admin_list_users(text, integer) from public;
revoke all on function public.admin_set_banned(uuid, boolean) from public;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.login_lookup(text) to service_role;
grant execute on function public.next_puzzle(integer, text[], text) to anon, authenticated;
grant execute on function public.record_attempt(text, boolean, boolean) to authenticated;
grant execute on function public.my_progress() to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_list_users(text, integer) to authenticated;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;

grant select on public.puzzles, public.lessons to anon, authenticated;
grant insert, update, delete on public.puzzles, public.lessons to authenticated;
grant select on public.profiles, public.puzzle_attempts to authenticated;
grant all on public.profiles, public.puzzles, public.puzzle_attempts, public.lessons to service_role;
