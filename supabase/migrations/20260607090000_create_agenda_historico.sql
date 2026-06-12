-- Migration: create_agenda_historico
-- Data: 2026-06-07
-- Descrição: Cria enum agenda_event_type, tabela agenda_historico e triggers para auditoria de agenda.

-- =============================================================================
-- 1. Enum agenda_event_type
-- =============================================================================
CREATE TYPE agenda_event_type AS ENUM (
  'DISPONIBILIDADE',
  'CANCELAMENTO',
  'FALTA',
  'ATRASO',
  'NAO_AGENDADO',
  'ATENDIMENTO',
  'DESATIVACAO'
);

-- =============================================================================
-- 2. Tabela agenda_historico
-- =============================================================================
CREATE TABLE public.agenda_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  profissional_id UUID NULL REFERENCES public.profissionais(id) ON DELETE CASCADE,
  evento_data DATE NOT NULL,
  tipo_evento agenda_event_type NOT NULL,
  periodos TEXT[] NULL,
  status_manha TEXT NULL,
  status_tarde TEXT NULL,
  observacao TEXT NULL,
  origem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_agenda_historico_unit_prof_data ON public.agenda_historico (unit_id, profissional_id, evento_data);
CREATE INDEX IF NOT EXISTS idx_agenda_historico_prof_tipo ON public.agenda_historico (profissional_id, tipo_evento);

-- =============================================================================
-- 3. Trigger functions and triggers
-- =============================================================================

-- 3.1 Trigger after INSERT on agenda_disponibilidade (log DISPONIBILIDADE)
CREATE OR REPLACE FUNCTION public.trg_agenda_disponibilidade_insert()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  INSERT INTO public.agenda_historico (
    unit_id,
    profissional_id,
    evento_data,
    tipo_evento,
    periodos,
    status_manha,
    status_tarde,
    observacao,
    origem,
    created_at,
    updated_at
  ) VALUES (
    NEW.unit_id,
    NEW.profissional_id,
    NEW.data,
    'DISPONIBILIDADE',
    CASE WHEN NEW.periodos IS NOT NULL THEN ARRAY(SELECT jsonb_array_elements_text(NEW.periodos)) ELSE NULL END,
    NEW.status_manha,
    NEW.status_tarde,
    NULL,
    'TRIGGER_DISPONIBILIDADE',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS agenda_disponibilidade_insert_trg ON public.agenda_disponibilidade;
CREATE TRIGGER agenda_disponibilidade_insert_trg
AFTER INSERT ON public.agenda_disponibilidade
FOR EACH ROW EXECUTE FUNCTION public.trg_agenda_disponibilidade_insert();

-- 3.2 Trigger after UPDATE on agenda_disponibilidade (log ATENDIMENTO / NAO_AGENDADO / CANCELAMENTO)
CREATE OR REPLACE FUNCTION public.trg_agenda_disponibilidade_update()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE
  v_event agenda_event_type;
BEGIN
  IF NEW.conflito THEN
    v_event := 'ATENDIMENTO';
  ELSIF NEW.status_manha = 'CANCELAMENTO' OR NEW.status_tarde = 'CANCELAMENTO' OR NEW.status_manha = 'CANCELOU' OR NEW.status_tarde = 'CANCELOU' THEN
    v_event := 'CANCELAMENTO';
  ELSE
    v_event := 'NAO_AGENDADO';
  END IF;

  INSERT INTO public.agenda_historico (
    unit_id,
    profissional_id,
    evento_data,
    tipo_evento,
    periodos,
    status_manha,
    status_tarde,
    observacao,
    origem,
    created_at,
    updated_at
  ) VALUES (
    NEW.unit_id,
    NEW.profissional_id,
    NEW.data,
    v_event,
    CASE WHEN NEW.periodos IS NOT NULL THEN ARRAY(SELECT jsonb_array_elements_text(NEW.periodos)) ELSE NULL END,
    NEW.status_manha,
    NEW.status_tarde,
    NULL,
    'TRIGGER_DISPONIBILIDADE_UPDATE',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS agenda_disponibilidade_update_trg ON public.agenda_disponibilidade;
CREATE TRIGGER agenda_disponibilidade_update_trg
AFTER UPDATE ON public.agenda_disponibilidade
FOR EACH ROW EXECUTE FUNCTION public.trg_agenda_disponibilidade_update();

-- 3.3 Trigger after UPDATE on agenda_settings (log DESATIVACAO when link is deactivated)
CREATE OR REPLACE FUNCTION public.trg_agenda_settings_update()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF OLD.is_link_active = true AND NEW.is_link_active = false THEN
    INSERT INTO public.agenda_historico (
      unit_id,
      profissional_id,
      evento_data,
      tipo_evento,
      periodos,
      status_manha,
      status_tarde,
      observacao,
      origem,
      created_at,
      updated_at
    ) VALUES (
      NEW.unit_id,
      NULL,
      CURRENT_DATE,
      'DESATIVACAO',
      NULL,
      NULL,
      NULL,
      NULL,
      'TRIGGER_SETTINGS_DEACTIVATE',
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS agenda_settings_update_trg ON public.agenda_settings;
CREATE TRIGGER agenda_settings_update_trg
AFTER UPDATE ON public.agenda_settings
FOR EACH ROW EXECUTE FUNCTION public.trg_agenda_settings_update();

-- 3.4 Trigger after UPDATE on processed_data (log FALTA / ATRASO)
CREATE OR REPLACE FUNCTION public.trg_processed_data_status_update()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE
  v_event agenda_event_type;
BEGIN
  IF NEW.status = 'FALTA' THEN
    v_event := 'FALTA';
  ELSIF NEW.status = 'ATRASO' THEN
    v_event := 'ATRASO';
  ELSE
    RETURN NEW; -- Não registra outros status
  END IF;

  INSERT INTO public.agenda_historico (
    unit_id,
    profissional_id,
    evento_data,
    tipo_evento,
    periodos,
    status_manha,
    status_tarde,
    observacao,
    origem,
    created_at,
    updated_at
  ) VALUES (
    NEW.unit_id,
    NULL,
    NEW.data,
    v_event,
    NULL,
    NULL,
    NULL,
    NULL,
    'TRIGGER_PROCESSED_DATA_STATUS',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS processed_data_status_update_trg ON public.processed_data;
CREATE TRIGGER processed_data_status_update_trg
AFTER UPDATE ON public.processed_data
FOR EACH ROW EXECUTE FUNCTION public.trg_processed_data_status_update();
