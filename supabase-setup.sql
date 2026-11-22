-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Creates everything the website shares: photos/songs, fun words, chat.

create table if not exists items (
  id bigint generated always as identity primary key,
  kind text not null,
  path text not null,
  caption text, "date" text, title text, artist text, note text,
  created_at timestamptz default now()
);
create table if not exists words (
  id bigint generated always as identity primary key,
  author text not null,
  category text not null default 'fun',
  word text not null,
  meaning text,
  created_at timestamptz default now()
);
create table if not exists messages (
  id bigint generated always as identity primary key,
  author text not null,
  body text not null,
  created_at timestamptz default now()
);

alter table items    enable row level security;
alter table words    enable row level security;
alter table messages enable row level security;
create policy "open items"    on items    for all to anon using (true) with check (true);
create policy "open words"    on words    for all to anon using (true) with check (true);
create policy "open messages" on messages for all to anon using (true) with check (true);

-- public storage bucket for photos and songs (name must match "bucket" in CLOUD_CONFIG)
insert into storage.buckets (id, name, public) values ('surprise-media','surprise-media',true)
  on conflict (id) do nothing;
create policy "media read"   on storage.objects for select to anon using (bucket_id = 'surprise-media');
create policy "media upload" on storage.objects for insert to anon with check (bucket_id = 'surprise-media');
create policy "media delete" on storage.objects for delete to anon using (bucket_id = 'surprise-media');
