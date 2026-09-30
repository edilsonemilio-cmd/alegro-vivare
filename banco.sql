create table if not exists estado (
  id int primary key default 1,
  payload jsonb not null default '{}'::jsonb,
  atualizado timestamptz default now()
);

insert into estado (id, payload) values (1, '{}'::jsonb)
on conflict (id) do nothing;

alter table estado enable row level security;

create policy "leitura" on estado for select using (true);
create policy "escrita" on estado for insert with check (true);
create policy "update" on estado for update using (true);
