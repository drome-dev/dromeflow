-- Padroniza a ingestao de processed_data para usar unit_id como chave de unidade.
-- unidade_code permanece preenchido para compatibilidade com telas e rotinas legadas.

UPDATE public.processed_data pd
SET unit_id = u.id
FROM public.units u
WHERE pd.unidade_code = u.unit_code
  AND pd.unit_id IS DISTINCT FROM u.id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.processed_data
    WHERE unit_id IS NULL
      AND atendimento_id IS NOT NULL
      AND trim(atendimento_id) <> ''
  ) THEN
    RAISE EXCEPTION 'processed_data possui registros com atendimento_id sem unit_id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.processed_data
    WHERE atendimento_id IS NOT NULL
      AND trim(atendimento_id) <> ''
    GROUP BY unit_id, atendimento_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'processed_data possui duplicatas por (unit_id, atendimento_id)';
  END IF;
END $$;

ALTER TABLE public.processed_data
  DROP CONSTRAINT IF EXISTS processed_data_unidade_atend_id_unique;

ALTER TABLE public.processed_data
  DROP CONSTRAINT IF EXISTS processed_data_unit_atend_id_unique;

ALTER TABLE public.processed_data
  ADD CONSTRAINT processed_data_unit_atend_id_unique UNIQUE (unit_id, atendimento_id);

CREATE OR REPLACE FUNCTION public.process_xlsx_upload(unit_id_arg uuid, records_arg jsonb)
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
    unit_code_val text;
    unit_name_val text;
    v_contato_cadastrado text;
BEGIN
    SELECT unit_code, unit_name
    INTO unit_code_val, unit_name_val
    FROM public.units
    WHERE id = unit_id_arg
    LIMIT 1;

    IF unit_code_val IS NULL THEN
        RAISE WARNING 'Unidade nao encontrada para unit_id: %', unit_id_arg;
        RETURN json_build_object(
            'total', jsonb_array_length(records_arg),
            'inserted', 0,
            'updated', 0,
            'ignored', jsonb_array_length(records_arg),
            'error', 'Unidade nao encontrada'
        );
    END IF;

    FOR rec IN SELECT * FROM jsonb_array_elements(records_arg)
    LOOP
        atendimento_id_val := rec->>'atendimento_id';

        IF atendimento_id_val IS NULL OR trim(atendimento_id_val) = '' THEN
            ignored_count := ignored_count + 1;
            CONTINUE;
        END IF;

        SELECT contato INTO v_contato_cadastrado
        FROM public.unit_clients
        WHERE unit_id = unit_id_arg
          AND lower(trim(nome)) = lower(trim(rec->>'cliente'))
        LIMIT 1;

        INSERT INTO public.processed_data (
            unit_id, unidade_code, atendimento_id, data, horario, valor, servico, tipo, periodo,
            momento, cliente, profissional, endereco, dia, repasse, whatscliente, cupom,
            origem, is_divisao, cadastro, unidade, status, pos_vendas
        )
        VALUES (
            unit_id_arg, unit_code_val, atendimento_id_val, (rec->>'data')::date, rec->>'horario',
            (rec->>'valor')::numeric, rec->>'servico', rec->>'tipo', rec->>'periodo',
            rec->>'momento', rec->>'cliente', rec->>'profissional', rec->>'endereco', rec->>'dia',
            (rec->>'repasse')::numeric,
            COALESCE(v_contato_cadastrado, rec->>'whatscliente'),
            rec->>'cupom', rec->>'origem', rec->>'is_divisao', (rec->>'cadastro')::date,
            COALESCE(rec->>'unidade', unit_name_val), COALESCE(rec->>'status', 'PENDENTE'), rec->>'pos_vendas'
        )
        ON CONFLICT ON CONSTRAINT processed_data_unit_atend_id_unique DO UPDATE SET
            unidade_code = EXCLUDED.unidade_code,
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
            pos_vendas = EXCLUDED.pos_vendas,
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

CREATE OR REPLACE FUNCTION public.process_xlsx_upload(unit_code_arg text, records_arg jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    unit_id_val uuid;
BEGIN
    SELECT id INTO unit_id_val
    FROM public.units
    WHERE unit_code = unit_code_arg
    LIMIT 1;

    IF unit_id_val IS NULL THEN
        RETURN json_build_object(
            'total', jsonb_array_length(records_arg),
            'inserted', 0,
            'updated', 0,
            'ignored', jsonb_array_length(records_arg),
            'error', 'Unidade nao encontrada'
        );
    END IF;

    RETURN public.process_xlsx_upload(unit_id_val, records_arg);
END;
$function$;
