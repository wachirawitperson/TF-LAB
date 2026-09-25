-- TF LAB Portal: public reads, single-admin writes, and public cover assets.
-- No remote project is linked by this migration.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.admin_config (
  singleton boolean primary key default true check (singleton),
  admin_user_id uuid unique references auth.users(id) on delete restrict
);

insert into private.admin_config (singleton, admin_user_id)
values (true, null)
on conflict (singleton) do nothing;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from private.admin_config config
      where config.singleton = true
        and config.admin_user_id = (select auth.uid())
    );
$$;

revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create table public.categories (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  name text not null check (char_length(name) between 1 and 80),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon text not null check (icon in ('file', 'wrench', 'game', 'shield')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.tools (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  url text not null check (url ~ '^https?://'),
  category_id text not null references public.categories(id) on update cascade on delete restrict,
  cover text not null check (cover in ('amber', 'sky', 'violet', 'mint', 'rose', 'blue')),
  icon text not null check (icon in ('file', 'calculator', 'sparkles', 'gamepad', 'palette', 'database')),
  favorite boolean not null default false,
  published boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index tools_category_id_idx on public.tools (category_id);
create index tools_published_created_at_idx on public.tools (published, created_at desc);

create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();

create trigger tools_set_updated_at
before update on public.tools
for each row execute function private.set_updated_at();

alter table public.categories enable row level security;
alter table public.tools enable row level security;

revoke all on table public.categories, public.tools from anon, authenticated;
grant select on table public.categories to anon, authenticated;
grant select on table public.tools to anon, authenticated;
grant insert, update, delete on table public.categories, public.tools to authenticated;

create policy "categories_are_publicly_readable"
on public.categories for select
to anon, authenticated
using (true);

create policy "admin_can_insert_categories"
on public.categories for insert
to authenticated
with check ((select private.is_admin()));

create policy "admin_can_update_categories"
on public.categories for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "admin_can_delete_categories"
on public.categories for delete
to authenticated
using ((select private.is_admin()));

create policy "published_tools_are_publicly_readable"
on public.tools for select
to anon
using (published = true);

create policy "admin_or_published_tools_are_readable"
on public.tools for select
to authenticated
using (published = true or (select private.is_admin()));

create policy "admin_can_insert_tools"
on public.tools for insert
to authenticated
with check ((select private.is_admin()));

create policy "admin_can_update_tools"
on public.tools for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "admin_can_delete_tools"
on public.tools for delete
to authenticated
using ((select private.is_admin()));

insert into public.categories (id, name, color, icon, sort_order) values
  ('docs', 'เอกสาร', '#f2b84b', 'file', 10),
  ('tools', 'เครื่องมือ', '#5da9e9', 'wrench', 20),
  ('games', 'เกม', '#9b82e8', 'game', 30),
  ('admin', 'Admin', '#f08080', 'shield', 40)
on conflict (id) do nothing;

insert into public.tools (id, name, description, url, category_id, cover, icon, favorite, published) values
  ('document-studio', 'Document Studio', 'สร้างและจัดการเอกสารที่ใช้ประจำ', 'https://example.com/document-studio', 'docs', 'amber', 'file', true, true),
  ('focus-timer', 'Focus Timer', 'จับเวลาทำงานและพักอย่างเป็นจังหวะ', 'https://example.com/focus-timer', 'tools', 'sky', 'calculator', true, true),
  ('puzzle-room', 'Puzzle Room', 'เกมสั้น ๆ สำหรับพักสมองระหว่างงาน', 'https://example.com/puzzle-room', 'games', 'violet', 'sparkles', true, true),
  ('admin-console', 'Admin Console', 'จัดการเครื่องมือและหมวดหมู่ใน Portal', 'https://example.com/admin-console', 'admin', 'mint', 'gamepad', true, true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tool-covers', 'tool-covers', true, 8388608, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "admin_can_read_cover_objects"
on storage.objects for select
to authenticated
using (bucket_id = 'tool-covers' and (select private.is_admin()));

create policy "admin_can_upload_cover_objects"
on storage.objects for insert
to authenticated
with check (bucket_id = 'tool-covers' and (select private.is_admin()));

create policy "admin_can_update_cover_objects"
on storage.objects for update
to authenticated
using (bucket_id = 'tool-covers' and (select private.is_admin()))
with check (bucket_id = 'tool-covers' and (select private.is_admin()));

create policy "admin_can_delete_cover_objects"
on storage.objects for delete
to authenticated
using (bucket_id = 'tool-covers' and (select private.is_admin()));

-- After creating the only Auth user, run this once in the SQL editor:
-- update private.admin_config set admin_user_id = '<AUTH_USER_UUID>' where singleton = true;
