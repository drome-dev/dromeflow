-- ============================================================================
-- Script: Fix Loyalty Duplicate Points
-- Data: 2026-05-13
-- Descrição: Atualiza a função auto_earn_loyalty_points para incluir uma trava
--            que impede o acúmulo de pontos duplicados para o mesmo atendimento_id.
-- ============================================================================

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
    AND nome = NEW."CLIENTE"
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
      AND NEW."VALOR" >= COALESCE(lp.min_purchase_value, 0)
  LOOP
    -- 4. TRAVA DE SEGURANÇA: Verificar se já existe transação para este atendimento_id neste plano
    --    Isso evita que re-uploads ou processamentos duplicados gerem pontos repetidos.
    IF NEW."ATENDIMENTO_ID" IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.loyalty_transactions
      WHERE plan_client_id = v_plan_client.plan_client_id
        AND atendimento_id = NEW."ATENDIMENTO_ID"
        AND type = 'earn'
    ) THEN
      CONTINUE; -- Pula para o próximo plano (se houver) sem gerar pontos duplicados
    END IF;

    -- 5. Definir multiplicador VIP
    v_multiplier := CASE WHEN v_plan_client.is_vip THEN COALESCE(v_plan_client.vip_multiplier, 1) ELSE 1 END;

    -- 6. Calcular pontos/cashback baseado no tipo de plano
    IF v_plan_client.type = 'cashback' THEN
      v_points_earned := (NEW."VALOR" * (COALESCE(v_plan_client.reward_percentage, 0) / 100)) * v_multiplier;
    ELSIF v_plan_client.type = 'points' THEN
      v_points_earned := (NEW."VALOR" * COALESCE(v_plan_client.points_per_real, 0)) * v_multiplier;
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
        NEW."ATENDIMENTO_ID",
        NEW."VALOR",
        'Acúmulo automático de atendimento'
      );

      -- 8. Atualizar saldo e totais no loyalty_plan_clients
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
