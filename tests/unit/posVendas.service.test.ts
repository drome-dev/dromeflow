import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchPosVendas,
  getPosVenda,
  createPosVenda,
  updatePosVenda,
  deletePosVenda,
  getMetrics,
  searchAtendimentos,
  getAtendimentoById,
} from '../../services/posVendas/posVendas.service';

const { mockFrom, __setMockTableData } = vi.hoisted(() => {
  const tableData: Record<string, { data: any; error: any; count: any }> = {};

  function getTableResult(table: string) {
    const entry = tableData[table] || tableData['*'] || { data: null, error: null, count: 0 };
    return { data: entry.data, error: entry.error, count: entry.count };
  }

  function buildChain(table: string) {
    const result = getTableResult(table);
    const promise = Promise.resolve(result);

    const chain: any = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.gte = vi.fn(() => chain);
    chain.lte = vi.fn(() => chain);
    chain.ilike = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.range = vi.fn(() => result);
    chain.in = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(() => promise);
    chain.single = vi.fn(() => promise);
    chain.update = vi.fn(() => chain);
    chain.delete = vi.fn(() => chain);
    chain.not = vi.fn(() => chain);
    chain.insert = vi.fn(() => chain);
    chain.or = vi.fn(() => chain);
    chain.then = promise.then.bind(promise);
    chain.catch = promise.catch.bind(promise);
    chain.finally = promise.finally.bind(promise);

    return chain;
  }

  return {
    mockFrom: vi.fn((table: string) => buildChain(table)),
    __setMockTableData: (table: string, overrides: any) => {
      tableData[table] = {
        data: 'data' in overrides ? overrides.data : null,
        error: 'error' in overrides ? overrides.error : null,
        count: 'count' in overrides ? overrides.count : 0,
      };
    },
  };
});

vi.mock('../../services/supabaseClient', () => ({
  supabase: { from: mockFrom },
}));

describe('posVendas.service', () => {
  beforeEach(() => {
    mockFrom.mockClear();
    __setMockTableData('*', { data: [], error: null, count: 0 });
  });

  describe('fetchPosVendas', () => {
    it('busca registros sem filtros', async () => {
      __setMockTableData('pos_vendas', {
        data: [{ id: '1', atendimento_id: 'AT-1', status: 'pendente', nota: null, reagendou: false, data: '2026-01-01', created_at: '', updated_at: '', unit_id: null, nome: null, contato: null, chat_id: null }],
        error: null,
      });

      const result = await fetchPosVendas();

      expect(mockFrom).toHaveBeenCalledWith('pos_vendas');
      expect(result).toHaveLength(1);
      expect(result[0].atendimento_id).toBe('AT-1');
    });

    it('aplica filtro de unit_id', async () => {
      __setMockTableData('pos_vendas', { data: [], error: null });

      await fetchPosVendas({ unit_id: 'unit-1' });

      const chain = mockFrom.mock.results[0].value;
      expect(chain.eq).toHaveBeenCalledWith('unit_id', 'unit-1');
    });

    it('aplica filtro de status', async () => {
      __setMockTableData('pos_vendas', { data: [], error: null });

      await fetchPosVendas({ status: 'finalizado' });

      const chain = mockFrom.mock.results[0].value;
      expect(chain.eq).toHaveBeenCalledWith('status', 'finalizado');
    });

    it('lança erro na falha', async () => {
      __setMockTableData('pos_vendas', { error: new Error('DB error') });

      await expect(fetchPosVendas()).rejects.toThrow('DB error');
    });
  });

  describe('getPosVenda', () => {
    it('busca por id', async () => {
      __setMockTableData('pos_vendas', {
        data: { id: '1', atendimento_id: 'AT-1', status: 'pendente', nota: null, reagendou: false, data: '2026-01-01', created_at: '', updated_at: '', unit_id: null, nome: null, contato: null, chat_id: null },
        error: null,
      });

      const result = await getPosVenda('1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('1');
    });

    it('lança erro na falha', async () => {
      __setMockTableData('pos_vendas', { error: new Error('Not found') });

      await expect(getPosVenda('999')).rejects.toThrow('Not found');
    });
  });

  describe('createPosVenda', () => {
    it('cria registro e retorna o novo', async () => {
      __setMockTableData('pos_vendas', {
        data: { id: 'new-1', atendimento_id: 'AT-1', status: 'pendente', nota: null, reagendou: false, data: '2026-01-01', created_at: '', updated_at: '', unit_id: null, nome: null, contato: null, chat_id: null },
        error: null,
      });

      const result = await createPosVenda({ atendimento_id: 'AT-1', reagendou: false });

      expect(result.id).toBe('new-1');
      expect(result.status).toBe('pendente');
    });

    it('mapeia ATENDIMENTO_ID para atendimento_id', async () => {
      __setMockTableData('pos_vendas', {
        data: { id: 'new-2', atendimento_id: 'AT-2', status: 'pendente', nota: null, reagendou: false, data: '2026-01-01', created_at: '', updated_at: '', unit_id: null, nome: null, contato: null, chat_id: null },
        error: null,
      });

      await createPosVenda({ ATENDIMENTO_ID: 'AT-2', reagendou: false });

      const chain = mockFrom.mock.results[0].value;
      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ atendimento_id: 'AT-2', reagendou: false }));
    });

    it('lança erro na falha', async () => {
      __setMockTableData('pos_vendas', { error: new Error('Insert error') });

      await expect(createPosVenda({ atendimento_id: 'AT-3', reagendou: true })).rejects.toThrow('Insert error');
    });
  });

  describe('updatePosVenda', () => {
    it('atualiza e retorna registro', async () => {
      __setMockTableData('pos_vendas', {
        data: { id: '1', atendimento_id: 'AT-1', status: 'finalizado', nota: 5, reagendou: true, data: '2026-01-01', created_at: '', updated_at: '', unit_id: null, nome: null, contato: null, chat_id: null },
        error: null,
      });

      const result = await updatePosVenda('1', { status: 'finalizado', nota: 5 });

      expect(result.status).toBe('finalizado');
      expect(result.nota).toBe(5);
    });
  });

  describe('deletePosVenda', () => {
    it('deleta por id', async () => {
      __setMockTableData('pos_vendas', { data: null, error: null });

      await deletePosVenda('1');

      const chain = mockFrom.mock.results[0].value;
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', '1');
    });

    it('lança erro na falha', async () => {
      __setMockTableData('pos_vendas', { error: new Error('Delete error') });

      await expect(deletePosVenda('1')).rejects.toThrow('Delete error');
    });
  });

  describe('getMetrics', () => {
    it('calcula métricas corretamente com dados variados', async () => {
      __setMockTableData('pos_vendas', {
        data: [
          { data: '2026-01-01', nota: 5, reagendou: true, status: 'finalizado' },
          { data: '2026-01-02', nota: 1, reagendou: false, status: 'contatado' },
          { data: '2026-01-03', nota: null, reagendou: false, status: 'pendente' },
        ],
        error: null,
      });

      const metrics = await getMetrics();

      expect(metrics.totalContatos).toBe(3);
      expect(metrics.totalContatados).toBe(1);
      expect(metrics.totalFinalizados).toBe(1);
      expect(metrics.taxaReagendamento).toBe(33);
      expect(metrics.nps).toBe(0); // 1 promotor (5) - 1 detrator (1) / 2 = 0 * 100 = 0
      expect(metrics.distribuicaoNotas).toEqual([
        { nota: 1, count: 1 },
        { nota: 2, count: 0 },
        { nota: 3, count: 0 },
        { nota: 4, count: 0 },
        { nota: 5, count: 1 },
      ]);
      expect(metrics.statusDistribution).toHaveLength(3);
    });

    it('retorna zeros quando não há dados', async () => {
      __setMockTableData('pos_vendas', { data: [], error: null });

      const metrics = await getMetrics();

      expect(metrics.totalContatos).toBe(0);
      expect(metrics.totalContatados).toBe(0);
      expect(metrics.totalFinalizados).toBe(0);
      expect(metrics.nps).toBeNull();
      expect(metrics.taxaReagendamento).toBe(0);
    });

    it('lança erro na falha', async () => {
      __setMockTableData('pos_vendas', { error: new Error('Metrics error') });

      await expect(getMetrics()).rejects.toThrow('Metrics error');
    });
  });

  describe('searchAtendimentos', () => {
    it('busca por termo e mapeia resultados', async () => {
      __setMockTableData('processed_data', {
        data: [
          { atendimento_id: 'AT-1', cliente: 'João', data: '2026-01-01', servico: 'Limpeza', endereco: 'Rua A', profissional: 'Maria' },
        ],
        error: null,
      });

      const result = await searchAtendimentos('João');

      expect(result).toHaveLength(1);
      expect(result[0].cliente).toBe('João');
      expect(result[0].profissional).toBe('Maria');
    });
  });

  describe('getAtendimentoById', () => {
    it('retorna null quando não existe', async () => {
      __setMockTableData('processed_data', { data: null, error: null });

      const result = await getAtendimentoById('INEXISTENTE');
      expect(result).toBeNull();
    });

    it('retorna dados do atendimento', async () => {
      __setMockTableData('processed_data', {
        data: { atendimento_id: 'AT-1', cliente: 'João', data: '2026-01-01', servico: 'Limpeza', endereco: 'Rua A', profissional: 'Maria' },
        error: null,
      });

      const result = await getAtendimentoById('AT-1');

      expect(result).not.toBeNull();
      expect(result!.cliente).toBe('João');
    });
  });
});
