-- ============================================================================
-- Script: Remover trigger sync_processed_to_pos_vendas
-- Data: 2026-05-12
-- Autor: Ajuste solicitado pelo time
-- Descrição: Remove o trigger e função que sincronizavam automaticamente
--            novos registros de processed_data para pos_vendas.
--            Após este script, o upload apenas grava em processed_data.
--            A tabela pos_vendas não será mais populada automaticamente.
--
-- MOTIVO:
-- O cliente solicitou que os dados enviados via upload fiquem APENAS
-- na tabela processed_data, sem propagação automática para pos_vendas.
-- ============================================================================

-- 1. Remover o trigger da tabela processed_data
DROP TRIGGER IF EXISTS trigger_sync_processed_to_pos_vendas ON processed_data;

-- 2. Remover a função que executava a sincronização
DROP FUNCTION IF EXISTS sync_processed_data_to_pos_vendas();

-- ============================================================================
-- VERIFICAÇÃO
-- ============================================================================
-- Listar triggers restantes em processed_data (deve estar vazio para pos_vendas)
SELECT
    t.tgname AS trigger_name,
    p.proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'processed_data'
  AND t.tgname NOT LIKE 'RI_%'  -- Excluir triggers de FK
ORDER BY t.tgname;

-- Verificar que a função foi removida
SELECT proname FROM pg_proc WHERE proname = 'sync_processed_data_to_pos_vendas';
-- Resultado esperado: 0 linhas

-- ============================================================================
-- OBSERVAÇÕES
-- ============================================================================
-- ✅ O trigger trigger_sync_pos_vendas_status (pos_vendas → processed_data)
--    NÃO é afetado por este script. Ele continua funcionando normalmente,
--    ou seja, se alguém alterar o status direto na tabela pos_vendas,
--    a coluna "pos vendas" em processed_data será atualizada.
--
-- ✅ Dados já existentes na pos_vendas NÃO são removidos.
--    Apenas a sincronização automática futura é desativada.
--
-- ⚠️  Caso queira limpar os dados existentes em pos_vendas, executar:
--    DELETE FROM pos_vendas;
--    (Somente se essa for a intenção)