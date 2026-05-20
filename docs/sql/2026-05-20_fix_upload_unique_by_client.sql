-- ============================================================================
-- Fix: Mudar UNIQUE constraint para (unit_id, atendimento_id, cliente)
-- Permite que o mesmo atendimento_id exista para clientes diferentes,
-- evitando sobrescrita durante upload de XLSX.
-- ============================================================================

-- 1. Remove a constraint antiga (nome atual)
ALTER TABLE public.processed_data DROP CONSTRAINT IF EXISTS processed_data_unit_atend_id_unique;

-- 2. Remove constraint antiga com nome legado (caso exista)
ALTER TABLE public.processed_data DROP CONSTRAINT IF EXISTS processed_data_unidade_atend_id_unique;

-- 3. Remove constraint legada de nov/2025 (unidade_code, ATENDIMENTO_ID) que nunca foi removida
ALTER TABLE public.processed_data DROP CONSTRAINT IF EXISTS processed_data_unidade_code_atendimento_id_key;

-- 4. Adiciona nova constraint composta com cliente
--    (unit_id, atendimento_id, cliente) permite:
--    - Mesmo atendimento_id para clientes diferentes → INSERT (ambos mantidos)
--    - Mesmo atendimento_id + mesmo cliente → UPDATE (comportamento atual)
ALTER TABLE public.processed_data
ADD CONSTRAINT processed_data_unit_atend_cliente_unique
UNIQUE (unit_id, atendimento_id, cliente);
