-- Ensure Agenda availability upserts can target the natural business key.
-- Required by Supabase REST upsert with on_conflict=settings_id,profissional_id,data.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agenda_disponibilidade_settings_profissional_data_key'
      and conrelid = 'public.agenda_disponibilidade'::regclass
  ) then
    alter table public.agenda_disponibilidade
      add constraint agenda_disponibilidade_settings_profissional_data_key
      unique (settings_id, profissional_id, data);
  end if;
end $$;
