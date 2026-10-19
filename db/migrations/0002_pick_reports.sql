-- Pick-error reports to the warehouse (AC 65). Append-only, like the leader actions in 0001.
-- The app never writes the pick list itself; a report only says what is wrong with it.

create table public.pick_report (
  id                  uuid primary key default gen_random_uuid(),
  site_id             text not null,
  line_id             text not null,
  kind                text not null check (kind in ('wrong_spec', 'missing_parts', 'part_picked', 'other')),
  planned_qty         numeric check (planned_qty >= 0),
  picked_qty          numeric check (picked_qty >= 0),
  missing_part        text check (char_length(missing_part) <= 120),
  note                text check (char_length(note) <= 500),
  send_to_picker      boolean not null,
  send_to_purchasing  boolean not null,
  photo_attached      boolean not null default false,
  created_by          text not null,
  created_at          timestamptz not null default now(),
  idempotency_key     text not null,
  check (send_to_picker or send_to_purchasing),
  unique (created_by, idempotency_key)
);

create index pick_report_site_idx on public.pick_report (site_id, created_at desc);

revoke all on table public.pick_report from public;
grant select, insert on table public.pick_report to qantum_slice;
