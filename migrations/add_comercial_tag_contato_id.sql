-- Adiciona colunas tag e contato_id à tabela comercial

alter table public.comercial
  add column if not exists tag text,
  add column if not exists contato_id text;
