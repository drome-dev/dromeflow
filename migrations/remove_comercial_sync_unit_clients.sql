-- Remove trigger e função de sync comercial → unit_clients
-- Motivo: desacoplamento dos módulos Comercial e Clientes

drop trigger if exists comercial_sync_unit_clients_trg on public.comercial;

drop function if exists public.comercial_sync_unit_clients();
