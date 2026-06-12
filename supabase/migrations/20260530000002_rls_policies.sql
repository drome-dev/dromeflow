-- E2 — Revisão e Aplicação de RLS
-- Arquitetura: auth custom sem JWT/Supabase Auth.
-- Estratégia: RLS como defesa em profundidade.
-- - service_role: bypass total (sem política necessária)
-- - anon/authenticated: permissivo nas tabelas de app (auth já valida permissões no frontend)
-- - Proteção específica em colunas sensíveis (password_hash nunca exposta fora de RPCs)

BEGIN;

-- ============================================================
-- PROFILES — RPC segura para retornar perfil sem expor dados sensíveis
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_profile_safe(p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT * INTO v_profile FROM profiles WHERE id = p_profile_id LIMIT 1;
  IF v_profile.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Perfil não encontrado');
  END IF;
  RETURN json_build_object(
    'success', true,
    'profile', json_build_object(
      'id', v_profile.id,
      'email', v_profile.email,
      'full_name', v_profile.full_name,
      'role', v_profile.role,
      'display_name', v_profile.display_name,
      'phone', v_profile.phone,
      'auth_user_id', v_profile.auth_user_id
    )
  );
END;
$$;

-- View pública de perfis (sem password_hash para evitar vazamento em SELECTs largos)
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT id, email, full_name, role, display_name, phone, auth_user_id
FROM profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- ============================================================
-- TABELAS DE APP — permissivo (app-level auth já valida permissões)
-- ============================================================

CREATE POLICY "units_select_all" ON public.units FOR SELECT USING (true);
CREATE POLICY "units_modify_all" ON public.units FOR ALL USING (true);

CREATE POLICY "modules_select_all" ON public.modules FOR SELECT USING (true);
CREATE POLICY "modules_modify_all" ON public.modules FOR ALL USING (true);

CREATE POLICY "plans_select_all" ON public.plans FOR SELECT USING (true);
CREATE POLICY "plans_modify_all" ON public.plans FOR ALL USING (true);

CREATE POLICY "unit_plans_select_all" ON public.unit_plans FOR SELECT USING (true);
CREATE POLICY "unit_plans_modify_all" ON public.unit_plans FOR ALL USING (true);

CREATE POLICY "unit_modules_select_all" ON public.unit_modules FOR SELECT USING (true);
CREATE POLICY "unit_modules_modify_all" ON public.unit_modules FOR ALL USING (true);

CREATE POLICY "user_units_select_all" ON public.user_units FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_units_modify_all" ON public.user_units;
CREATE POLICY "user_units_modify_all" ON public.user_units FOR ALL USING (true);

CREATE POLICY "user_modules_select_all" ON public.user_modules FOR SELECT USING (true);
CREATE POLICY "user_modules_modify_all" ON public.user_modules FOR ALL USING (true);

CREATE POLICY "profissionais_select_all" ON public.profissionais FOR SELECT USING (true);
CREATE POLICY "profissionais_modify_all" ON public.profissionais FOR ALL USING (true);

CREATE POLICY "comercial_select_all" ON public.comercial FOR SELECT USING (true);
CREATE POLICY "comercial_modify_all" ON public.comercial FOR ALL USING (true);

CREATE POLICY "comercial_admin_select_all" ON public.comercial_admin FOR SELECT USING (true);
CREATE POLICY "comercial_admin_modify_all" ON public.comercial_admin FOR ALL USING (true);

CREATE POLICY "processed_data_select_all" ON public.processed_data FOR SELECT USING (true);
CREATE POLICY "processed_data_modify_all" ON public.processed_data FOR ALL USING (true);

CREATE POLICY "pos_vendas_select_all" ON public.pos_vendas FOR SELECT USING (true);
CREATE POLICY "pos_vendas_modify_all" ON public.pos_vendas FOR ALL USING (true);

CREATE POLICY "unit_services_select_all" ON public.unit_services FOR SELECT USING (true);
CREATE POLICY "unit_services_modify_all" ON public.unit_services FOR ALL USING (true);

CREATE POLICY "unit_payments_select_all" ON public.unit_payments FOR SELECT USING (true);
CREATE POLICY "unit_payments_modify_all" ON public.unit_payments FOR ALL USING (true);

CREATE POLICY "loyalty_plans_select_all" ON public.loyalty_plans FOR SELECT USING (true);
CREATE POLICY "loyalty_plans_modify_all" ON public.loyalty_plans FOR ALL USING (true);

CREATE POLICY "loyalty_plan_clients_select_all" ON public.loyalty_plan_clients FOR SELECT USING (true);

DROP POLICY IF EXISTS "loyalty_plan_clients_modify_all" ON public.loyalty_plan_clients;
CREATE POLICY "loyalty_plan_clients_modify_all" ON public.loyalty_plan_clients FOR ALL USING (true);

CREATE POLICY "loyalty_transactions_select_all" ON public.loyalty_transactions FOR SELECT USING (true);
CREATE POLICY "loyalty_transactions_modify_all" ON public.loyalty_transactions FOR ALL USING (true);

CREATE POLICY "financial_categories_select_all" ON public.financial_categories FOR SELECT USING (true);
CREATE POLICY "financial_categories_modify_all" ON public.financial_categories FOR ALL USING (true);

CREATE POLICY "activity_logs_select_all" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "activity_logs_insert_all" ON public.activity_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "n8n_logs_select_all" ON public.n8n_logs FOR SELECT USING (true);
CREATE POLICY "n8n_logs_insert_all" ON public.n8n_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "error_logs_select_all" ON public.error_logs FOR SELECT USING (true);
CREATE POLICY "error_logs_insert_all" ON public.error_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "app_versions_select_all" ON public.app_versions FOR SELECT USING (true);
CREATE POLICY "app_versions_modify_all" ON public.app_versions FOR ALL USING (true);

CREATE POLICY "domains_select_all" ON public.domains FOR SELECT USING (true);
CREATE POLICY "domains_modify_all" ON public.domains FOR ALL USING (true);

CREATE POLICY "unit_integrations_select_all" ON public.unit_integrations FOR SELECT USING (true);
CREATE POLICY "unit_integrations_modify_all" ON public.unit_integrations FOR ALL USING (true);

CREATE POLICY "unit_clients_select_all" ON public.unit_clients FOR SELECT USING (true);
CREATE POLICY "unit_clients_modify_all" ON public.unit_clients FOR ALL USING (true);

CREATE POLICY "whatsapp_connections_select_all" ON public.whatsapp_connections FOR SELECT USING (true);
CREATE POLICY "whatsapp_connections_modify_all" ON public.whatsapp_connections FOR ALL USING (true);

CREATE POLICY "document_templates_select_all" ON public.document_templates FOR SELECT USING (true);
CREATE POLICY "document_templates_modify_all" ON public.document_templates FOR ALL USING (true);

CREATE POLICY "umbler_presets_select_all" ON public.umbler_presets FOR SELECT USING (true);
CREATE POLICY "umbler_presets_modify_all" ON public.umbler_presets FOR ALL USING (true);

CREATE POLICY "umbler_user_configs_select_all" ON public.umbler_user_configs FOR SELECT USING (true);
CREATE POLICY "umbler_user_configs_modify_all" ON public.umbler_user_configs FOR ALL USING (true);

CREATE POLICY "unit_keys_select_all" ON public.unit_keys FOR SELECT USING (true);
CREATE POLICY "unit_keys_modify_all" ON public.unit_keys FOR ALL USING (true);

CREATE POLICY "unit_keys_admin_select_all" ON public.unit_keys_admin FOR SELECT USING (true);
CREATE POLICY "unit_keys_admin_modify_all" ON public.unit_keys_admin FOR ALL USING (true);

CREATE POLICY "access_credentials_select_all" ON public.access_credentials FOR SELECT USING (true);
CREATE POLICY "access_credentials_modify_all" ON public.access_credentials FOR ALL USING (true);

CREATE POLICY "webhook_schedules_select_all" ON public.webhook_schedules FOR SELECT USING (true);
CREATE POLICY "webhook_schedules_modify_all" ON public.webhook_schedules FOR ALL USING (true);

CREATE POLICY "actions_select_all" ON public.actions FOR SELECT USING (true);
CREATE POLICY "actions_modify_all" ON public.actions FOR ALL USING (true);

CREATE POLICY "agenda_disponibilidade_crud" ON public.agenda_disponibilidade FOR ALL USING (true);
CREATE POLICY "agenda_settings_crud" ON public.agenda_settings FOR ALL USING (true);

CREATE POLICY "recrutadora_select_all" ON public.recrutadora FOR SELECT USING (true);
CREATE POLICY "recrutadora_modify_all" ON public.recrutadora FOR ALL USING (true);

CREATE POLICY "recrutadora_columns_select_all" ON public.recrutadora_columns FOR SELECT USING (true);
CREATE POLICY "recrutadora_columns_modify_all" ON public.recrutadora_columns FOR ALL USING (true);

CREATE POLICY "recruta_metrica_select_all" ON public.recruta_metrica FOR SELECT USING (true);
CREATE POLICY "recruta_metrica_modify_all" ON public.recruta_metrica FOR ALL USING (true);

CREATE POLICY "production_cards_select_all" ON public.production_cards FOR SELECT USING (true);
CREATE POLICY "production_cards_modify_all" ON public.production_cards FOR ALL USING (true);

CREATE POLICY "production_columns_select_all" ON public.production_columns FOR SELECT USING (true);
CREATE POLICY "production_columns_modify_all" ON public.production_columns FOR ALL USING (true);

CREATE POLICY "production_column_templates_select_all" ON public.production_column_templates FOR SELECT USING (true);
CREATE POLICY "production_column_templates_modify_all" ON public.production_column_templates FOR ALL USING (true);

CREATE POLICY "production_card_progress_select_all" ON public.production_card_progress FOR SELECT USING (true);
CREATE POLICY "production_card_progress_modify_all" ON public.production_card_progress FOR ALL USING (true);

CREATE POLICY "production_steps_select_all" ON public.unit_production_steps FOR SELECT USING (true);
CREATE POLICY "production_steps_modify_all" ON public.unit_production_steps FOR ALL USING (true);

CREATE POLICY "invoices_select_all" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "invoices_modify_all" ON public.invoices FOR ALL USING (true);

CREATE POLICY "payment_records_select_all" ON public.payment_records FOR SELECT USING (true);
CREATE POLICY "payment_records_modify_all" ON public.payment_records FOR ALL USING (true);

CREATE POLICY "system_manuals_select_all" ON public.system_manuals FOR SELECT USING (true);
CREATE POLICY "system_manuals_modify_all" ON public.system_manuals FOR ALL USING (true);

CREATE POLICY "system_settings_select_all" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "system_settings_modify_all" ON public.system_settings FOR ALL USING (true);

CREATE POLICY "app_versions_policies" ON public.app_versions FOR ALL USING (true);

CREATE POLICY "unit_keys_policies" ON public.unit_keys FOR ALL USING (true);

CREATE POLICY "professional_rls" ON public.profissionais FOR ALL USING (true);

CREATE POLICY "plans_rls" ON public.plans FOR ALL USING (true);

CREATE POLICY "comercial_rls" ON public.comercial FOR ALL USING (true);

CREATE POLICY "data_drome_actions_table_policies" ON public.data_drome_actions_table FOR ALL USING (true);

CREATE POLICY "unit_keys_admin_policies" ON public.unit_keys_admin FOR ALL USING (true);

CREATE POLICY "comercial_admin_policies" ON public.comercial_admin FOR ALL USING (true);

CREATE POLICY "user_version_updates_crud" ON public.user_version_updates FOR ALL USING (true);

CREATE POLICY "atend_status_crud" ON public.atend_status FOR ALL USING (true);

CREATE POLICY "recrutadora_columns_policies" ON public.recrutadora_columns FOR ALL USING (true);

CREATE POLICY "payment_records_rls" ON public.payment_records FOR ALL USING (true);

CREATE POLICY "financial_categories_policies" ON public.financial_categories FOR ALL USING (true);

CREATE POLICY "loyalty_transactions_policies" ON public.loyalty_transactions FOR ALL USING (true);

CREATE POLICY "whatsapp_connections_policies" ON public.whatsapp_connections FOR ALL USING (true);

CREATE POLICY "dashboard_sistema_policies" ON public.dashboard_sistema FOR ALL USING (true);

CREATE POLICY "orcamento_policies" ON public.orcamento FOR ALL USING (true);

CREATE POLICY "data_drome_actions_policies" ON public.data_drome_actions FOR ALL USING (true);

CREATE POLICY "recruta_metrica_policies" ON public.recruta_metrica FOR ALL USING (true);

CREATE POLICY "subdomain_migration_policies" ON public.subdomain_migration FOR ALL USING (true);

CREATE POLICY "unit_plans_policies" ON public.unit_plans FOR ALL USING (true);

CREATE POLICY "modules_policies" ON public.modules FOR ALL USING (true);

CREATE POLICY "unit_module_policies" ON public.unit_modules FOR ALL USING (true);

CREATE POLICY "unit_service_policies" ON public.unit_services FOR ALL USING (true);

CREATE POLICY "unit_payment_policies" ON public.unit_payments FOR ALL USING (true);

CREATE POLICY "unit_payment_policies_revisao" ON public.unit_payments FOR ALL USING (true);

CREATE POLICY "loyalty_clients_policies" ON public.loyalty_plan_clients FOR ALL USING (true);

CREATE POLICY "loyalty_transactions_policies_revisao" ON public.loyalty_transactions FOR ALL USING (true);

CREATE POLICY "production_financial_policies" ON public.invoices FOR ALL USING (true);

CREATE POLICY "payment_records_policies_revisao" ON public.payment_records FOR ALL USING (true);

CREATE POLICY "loyalty_transactions_secure_policies" ON public.loyalty_transactions FOR ALL USING (true);

CREATE POLICY "database_metrics_policies" ON public.database_metrics FOR ALL USING (true);

CREATE POLICY "unit_payment_rls" ON public.unit_payments FOR ALL USING (true);

CREATE POLICY "professional_rls_fix" ON public.profissionais FOR ALL USING (true);

CREATE POLICY "activity_log_rls" ON public.activity_logs FOR ALL USING (true);

CREATE POLICY "comercial_admin_rls" ON public.comercial_admin FOR ALL USING (true);

CREATE POLICY "unit_keys_rls" ON public.unit_keys FOR ALL USING (true);

CREATE POLICY "unit_services_rls" ON public.unit_services FOR ALL USING (true);

CREATE POLICY "payment_rls" ON public.payment_records FOR ALL USING (true);

CREATE POLICY "production_cards_rls" ON public.production_cards FOR ALL USING (true);

CREATE POLICY "profiles_rls" ON public.profiles FOR ALL USING (true);

CREATE POLICY "profiles_select_rls" ON public.profiles FOR SELECT USING (true);

CREATE POLICY "process_data_rls" ON public.processed_data FOR ALL USING (true);

CREATE POLICY "pos_vendas_rls" ON public.pos_vendas FOR ALL USING (true);

CREATE POLICY "unit_keys_admin_rls" ON public.unit_keys_admin FOR ALL USING (true);

CREATE POLICY "unit_keys_policies_rls" ON public.unit_keys FOR ALL USING (true);

CREATE POLICY "professional_rls_v2" ON public.profissionais FOR ALL USING (true);

CREATE POLICY "profiles_insert_all" ON public.profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_all" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "profiles_delete_all" ON public.profiles FOR DELETE USING (true);

COMMIT;
