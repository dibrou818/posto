-- How a visitor gets in: free entry, sign-up required, booking required.
-- Nullable on purpose — NULL means "not specified" and shows nothing publicly,
-- so existing events/activities are not suddenly labelled "free entry".
alter table public.events
  add column if not exists access text
  constraint events_access_check check (access is null or access in ('free', 'registration', 'reservation'));

alter table public.activities
  add column if not exists access text
  constraint activities_access_check check (access is null or access in ('free', 'registration', 'reservation'));

-- Activity types that were missing from the tag catalogue (board games,
-- darts, quizzes, video games). "Salle d'arcade" already exists.
insert into public.tags (label, slug) values
  ('Jeux de société', 'jeux-de-societe'),
  ('Fléchettes', 'flechettes'),
  ('Quiz et blind test', 'quiz-blind-test'),
  ('Jeux vidéo', 'jeux-video')
on conflict (slug) do nothing;
