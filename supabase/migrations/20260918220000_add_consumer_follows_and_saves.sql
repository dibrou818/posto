create table if not exists public.place_follows (
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table if not exists public.event_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

alter table public.place_follows enable row level security;
alter table public.event_saves enable row level security;

create policy "Users can read their own place follows"
on public.place_follows for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can follow places for themselves"
on public.place_follows for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can unfollow their own places"
on public.place_follows for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read their own event saves"
on public.event_saves for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can save events for themselves"
on public.event_saves for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can remove their own saved events"
on public.event_saves for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists place_follows_place_id_idx on public.place_follows(place_id);
create index if not exists event_saves_event_id_idx on public.event_saves(event_id);
