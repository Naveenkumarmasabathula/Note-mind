-- Production baseline hardening for NoteMind
-- Adds indexes, constraints, and trigger-backed note_count consistency.

create index if not exists idx_notes_user_subject_position
  on public.notes (user_id, subject_id, position);

create index if not exists idx_notes_user_updated_at
  on public.notes (user_id, updated_at desc);

create index if not exists idx_notes_user_created_at
  on public.notes (user_id, created_at desc);

create index if not exists idx_tags_note_id
  on public.tags (note_id);

create index if not exists idx_tags_label
  on public.tags (label);

create unique index if not exists idx_subjects_user_name_unique
  on public.subjects (user_id, lower(name));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notes_difficulty_check'
  ) then
    alter table public.notes
      add constraint notes_difficulty_check
      check (difficulty in ('easy', 'medium', 'hard'));
  end if;
end
$$;

create or replace function public.recalculate_subject_note_count(target_subject_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subjects s
  set note_count = (
    select count(*)
    from public.notes n
    where n.subject_id = s.id
  )
  where s.id = target_subject_id;
end;
$$;

create or replace function public.sync_subject_note_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.subject_id is not null then
      perform public.recalculate_subject_note_count(new.subject_id);
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.subject_id is distinct from new.subject_id then
      if old.subject_id is not null then
        perform public.recalculate_subject_note_count(old.subject_id);
      end if;
      if new.subject_id is not null then
        perform public.recalculate_subject_note_count(new.subject_id);
      end if;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.subject_id is not null then
      perform public.recalculate_subject_note_count(old.subject_id);
    end if;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_subject_note_count on public.notes;

create trigger trg_sync_subject_note_count
after insert or update of subject_id or delete on public.notes
for each row execute procedure public.sync_subject_note_count();

create or replace function public.reorder_notes(updates jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  entry jsonb;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'unauthorized';
  end if;

  for entry in select * from jsonb_array_elements(updates)
  loop
    update public.notes
    set
      position = (entry->>'position')::int,
      subject_id = nullif(entry->>'subject_id', '')::uuid,
      updated_at = now()
    where id = (entry->>'id')::uuid
      and user_id = current_user_id;
  end loop;
end;
$$;
