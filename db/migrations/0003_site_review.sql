-- The site review (AC 67 to 71). Append-only, like 0001 and 0002.
-- 1. A pick report can say what the site found that the warehouse missed (an item that doesn't fit, the wrong item,
--    damage), how many are affected, and whether a re-pick or a same-day delivery is needed.
-- 2. A pick review says, from site, that a line is right. It clears earlier reports on that line; it never changes
--    the pick list, which this app does not write.

-- The kind check from 0002 was declared inline, so its name is the server's choice. Drop it by what it checks.
do $$
declare
  existing record;
begin
  for existing in
    select conname
    from pg_constraint
    where conrelid = 'public.pick_report'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%kind%'
  loop
    execute format('alter table public.pick_report drop constraint %I', existing.conname);
  end loop;
end
$$;

alter table public.pick_report
  add constraint pick_report_kind_check
  check (kind in ('wrong_spec', 'missing_parts', 'part_picked', 'unsuitable', 'wrong_item', 'damaged', 'other'));

-- Reports written before this migration asked for a re-pick, the only thing the warehouse could do then.
alter table public.pick_report
  add column request text not null default 'repick' constraint pick_report_request_check check (request in ('repick', 'same_day'));

alter table public.pick_report
  add column affected_qty numeric constraint pick_report_affected_qty_check check (affected_qty >= 0);

create table public.pick_review (
  id               uuid primary key default gen_random_uuid(),
  site_id          text not null,
  line_id          text not null,
  created_by       text not null,
  created_at       timestamptz not null default now(),
  idempotency_key  text not null,
  unique (created_by, idempotency_key)
);

create index pick_review_site_idx on public.pick_review (site_id, created_at desc);

revoke all on table public.pick_review from public;
grant select, insert on table public.pick_review to qantum_slice;
