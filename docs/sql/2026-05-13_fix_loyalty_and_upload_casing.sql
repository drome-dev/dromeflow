-- ============================================================================
-- Script: Fix Column Casing and Constraints for Loyalty and Upload
-- Data: 2026-05-13
-- Versão: 1.1 (Correção de Constraint)
-- ============================================================================

-- 1. Garantir que a constraint única exista com o nome padrão
DO $$
BEGIN
    -- Remove a constraint antiga se existir (padrão com unidade_code)
    ALTER TABLE public.processed_data DROP CONSTRAINT IF EXISTS processed_data_unidade_atend_id_unique;
    
    -- Se não existir a constraint nova, adiciona
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'processed_data_unit_atend_id_unique'
    ) THEN
        ALTER TABLE public.processed_data 
        ADD CONSTRAINT processed_data_unit_atend_id_unique UNIQUE (unit_id, atendimento_id);
    END IF;
END $$;

-- 2. Corrigir a função de fidelidade (Trigger)
CREATE OR REPLACE FUNCTION public.auto_earn_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
  v_unit_id UUID;
  v_client_id UUID;
  v_plan_client RECORD;
  v_points_earned DECIMAL(10,2);
  v_multiplier DECIMAL(5,2);
BEGIN
  -- 1. Buscar unit_id pela unidade_code
  SELECT id INTO v_unit_id
  FROM public.units
  WHERE unit_code = NEW.unidade_code
  LIMIT 1;

  IF v_unit_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 2. Buscar client_id pelo nome do cliente
  SELECT id INTO v_client_id
  FROM public.unit_clients
  WHERE unit_id = v_unit_id
    AND nome = NEW.cliente
  LIMIT 1;

  IF v_client_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 3. Buscar planos ativos do cliente
  FOR v_plan_client IN
    SELECT lpc.id as plan_client_id, lpc.is_vip, lp.type, lp.reward_percentage,
           lp.points_per_real, lp.min_purchase_value, lp.vip_multiplier
    FROM public.loyalty_plan_clients lpc
    JOIN public.loyalty_plans lp ON lp.id = lpc.plan_id
    WHERE lpc.client_id = v_client_id
      AND lpc.is_active = true
      AND lp.is_active = true
      AND lp.unit_id = v_unit_id
      AND (lp.start_date IS NULL OR lp.start_date <= CURRENT_DATE)
      AND (lp.end_date IS NULL OR lp.end_date >= CURRENT_DATE)
      AND NEW.valor >= COALESCE(lp.min_purchase_value, 0)
  LOOP
    -- 4. TRAVA DE SEGURANÇA
    IF NEW.atendimento_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.loyalty_transactions
      WHERE plan_client_id = v_plan_client.plan_client_id
        AND atendimento_id = NEW.atendimento_id
        AND type = 'earn'
    ) THEN
      CONTINUE;
    END IF;

    -- 5. Definir multiplicador VIP
    v_multiplier := CASE WHEN v_plan_client.is_vip THEN COALESCE(v_plan_client.vip_multiplier, 1) ELSE 1 END;

    -- 6. Calcular pontos/cashback
    IF v_plan_client.type = 'cashback' THEN
      v_points_earned := (NEW.valor * (COALESCE(v_plan_client.reward_percentage, 0) / 100)) * v_multiplier;
    ELSIF v_plan_client.type = 'points' THEN
      v_points_earned := (NEW.valor * COALESCE(v_plan_client.points_per_real, 0)) * v_multiplier;
    ELSE
      v_points_earned := 0;
    END IF;

    IF v_points_earned > 0 THEN
      -- 7. Criar transação
      INSERT INTO public.loyalty_transactions (
        plan_client_id,
        type,
        points,
        atendimento_id,
        purchase_value,
        description
      ) VALUES (
        v_plan_client.plan_client_id,
        'earn',
        v_points_earned,
        NEW.atendimento_id,
        NEW.valor,
        'Acúmulo automático de atendimento'
      );

      -- 8. Atualizar saldo
      UPDATE public.loyalty_plan_clients
      SET
        current_balance = current_balance + v_points_earned,
        total_earned = total_earned + v_points_earned,
        last_transaction_at = now(),
        updated_at = now()
      WHERE id = v_plan_client.plan_client_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atualizar a RPC de upload (Versão Robusta)
CREATE OR REPLACE FUNCTION public.process_xlsx_upload(unit_code_arg text, records_arg jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    rec jsonb; 
    inserted_count integer := 0; 
    updated_count integer := 0;
    ignored_count integer := 0; 
    result_code integer;
    atendimento_id_val text;
    unit_id_val uuid;
    v_contato_cadastrado text;
BEGIN
    SELECT id INTO unit_id_val
    FROM units
    WHERE unit_code = unit_code_arg
    LIMIT 1;
    
    IF unit_id_val IS NULL THEN
        RETURN json_build_object(
            'total', jsonb_array_length(records_arg),
            'inserted', 0,
            'updated', 0,
            'ignored', jsonb_array_length(records_arg),
            'error', 'Unidade não encontrada'
        );
    END IF;
    
    FOR rec IN SELECT * FROM jsonb_array_elements(records_arg)
    LOOP
        atendimento_id_val := COALESCE(rec->>'atendimento_id', rec->>'ATENDIMENTO_ID');
        
        IF atendimento_id_val IS NULL OR atendimento_id_val = '' THEN
            ignored_count := ignored_count + 1;
            CONTINUE;
        END IF;

        SELECT contato INTO v_contato_cadastrado
        FROM public.unit_clients
        WHERE unit_id = unit_id_val
          AND lower(trim(nome)) = lower(trim(COALESCE(rec->>'cliente', rec->>'CLIENTE')))
        LIMIT 1;
        
        INSERT INTO public.processed_data (
            unit_id, unidade_code, atendimento_id, data, horario, valor, servico, tipo, periodo,
            momento, cliente, profissional, endereco, dia, repasse, whatscliente, cupom,
            origem, is_divisao, cadastro, unidade, status
        )
        VALUES (
            unit_id_val, unit_code_arg, atendimento_id_val, 
            (COALESCE(rec->>'data', rec->>'DATA'))::date, 
            COALESCE(rec->>'horario', rec->>'HORARIO'), 
            (COALESCE(rec->>'valor', rec->>'VALOR'))::numeric, 
            COALESCE(rec->>'servico', rec->>'SERVIÇO'), 
            COALESCE(rec->>'tipo', rec->>'TIPO'), 
            COALESCE(rec->>'periodo', rec->>'PERÍODO'),
            COALESCE(rec->>'momento', rec->>'MOMENTO'), 
            COALESCE(rec->>'cliente', rec->>'CLIENTE'), 
            COALESCE(rec->>'profissional', rec->>'PROFISSIONAL'), 
            COALESCE(rec->>'endereco', rec->>'ENDEREÇO'), 
            COALESCE(rec->>'dia', rec->>'DIA'),
            (COALESCE(rec->>'repasse', rec->>'REPASSE'))::numeric, 
            COALESCE(v_contato_cadastrado, rec->>'whatscliente'),
            COALESCE(rec->>'cupom', rec->>'CUPOM'), 
            COALESCE(rec->>'origem', rec->>'ORIGEM'), 
            COALESCE(rec->>'is_divisao', rec->>'IS_DIVISAO'), 
            (COALESCE(rec->>'cadastro', rec->>'CADASTRO'))::date, 
            COALESCE(rec->>'unidade', rec->>'unidade'), 
            COALESCE(rec->>'status', rec->>'STATUS')
        )
        -- Usando colunas diretamente em vez de nome de constraint para evitar erros de "not found"
        ON CONFLICT (unit_id, atendimento_id, cliente) DO UPDATE SET
            data = EXCLUDED.data,
            horario = EXCLUDED.horario,
            valor = EXCLUDED.valor,
            servico = EXCLUDED.servico,
            tipo = EXCLUDED.tipo,
            periodo = EXCLUDED.periodo,
            momento = EXCLUDED.momento,
            cliente = EXCLUDED.cliente,
            profissional = EXCLUDED.profissional,
            endereco = EXCLUDED.endereco,
            dia = EXCLUDED.dia,
            repasse = EXCLUDED.repasse,
            whatscliente = COALESCE(v_contato_cadastrado, EXCLUDED.whatscliente),
            cupom = EXCLUDED.cupom,
            origem = EXCLUDED.origem,
            is_divisao = EXCLUDED.is_divisao,
            cadastro = EXCLUDED.cadastro,
            unidade = EXCLUDED.unidade,
            status = CASE 
                WHEN processed_data.profissional IS DISTINCT FROM EXCLUDED.profissional 
                THEN EXCLUDED.status
                ELSE processed_data.status
            END
        RETURNING (CASE xmax WHEN 0 THEN 1 ELSE 2 END) INTO result_code;

        IF result_code = 1 THEN 
            inserted_count := inserted_count + 1;
        ELSIF result_code = 2 THEN 
            updated_count := updated_count + 1;
        ELSE 
            ignored_count := ignored_count + 1;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'total', jsonb_array_length(records_arg),
        'inserted', inserted_count,
        'updated', updated_count,
        'ignored', ignored_count
    );
END;
$function$;
