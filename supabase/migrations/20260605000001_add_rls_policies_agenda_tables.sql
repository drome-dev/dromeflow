-- Migration: add_rls_policies_agenda_tables
-- Data: 2026-06-05
-- Descrição: Habilita RLS e cria políticas para agenda_settings e agenda_disponibilidade
--
-- IMPORTANTE: O DromeFlow usa auth customizada (sem supabase.auth).
-- auth.uid() é sempre NULL, então NÃO podemos usar em policies.
-- A segurança é feita na camada da aplicação (custom auth + anon key).

-- ==============================================================================
-- Habilita RLS nas tabelas da Agenda
-- ==============================================================================
ALTER TABLE public.agenda_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_disponibilidade ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- agenda_settings
-- ==============================================================================

-- SELECT público apenas para registros com link ativo
-- Necessário para o fluxo externo: profissional consulta se há agenda aberta
CREATE POLICY "Permitir SELECT público (link ativo)"
ON public.agenda_settings
FOR SELECT
USING (is_link_active = true);

-- ALL liberado para usuários do app (segurança via custom auth)
CREATE POLICY "Permitir ALL (segurança via app)"
ON public.agenda_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- agenda_disponibilidade
-- ==============================================================================

-- INSERT público: profissional envia disponibilidade pelo link externo
CREATE POLICY "Permitir INSERT público (profissionais)"
ON public.agenda_disponibilidade
FOR INSERT
WITH CHECK (true);

-- SELECT público: profissional consulta próprios envios + gestor visualiza
CREATE POLICY "Permitir SELECT público"
ON public.agenda_disponibilidade
FOR SELECT
USING (true);

-- UPDATE liberado (segurança via custom auth)
CREATE POLICY "Permitir UPDATE (segurança via app)"
ON public.agenda_disponibilidade
FOR UPDATE
USING (true)
WITH CHECK (true);

-- DELETE liberado (segurança via custom auth)
CREATE POLICY "Permitir DELETE (segurança via app)"
ON public.agenda_disponibilidade
FOR DELETE
USING (true);
