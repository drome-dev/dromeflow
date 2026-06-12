import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchDataTable,
  fetchDataRecordById,
  fetchAppointments,
  updateDataRecord,
  deleteDataRecord,
  fetchAvailableYearsFromProcessedData,
} from '../../services/data/dataTable.service';

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

describe('dataTable.service', () => {
  beforeEach(() => {
    mockFrom.mockClear();
    __setMockTableData('*', { data: [], error: null, count: 0 });
  });

  describe('fetchDataTable', () => {
    it('faz query com unidade_code, paginação e retorna dados mapeados', async () => {
      __setMockTableData('processed_data', {
        data: [
          { id: 1, atendimento_id: 'AT-1', cliente: 'João', status: 'PENDENTE', unidade_code: 'SP', data: '2026-01-01', valor: 100, servico: 'Limpeza', horario: '10:00', profissional: 'Maria', repasse: 50, endereco: 'Rua A', whatscliente: '1199999', dia: '01/01/2026', unidade: 'Unidade SP', confirmacao: null, observacao: null, pos_vendas: null, comentario: null, reagendou: null, pagto: null },
        ],
        count: 1,
      });
      __setMockTableData('units', { data: [] });
      __setMockTableData('unit_clients', { data: [] });
      __setMockTableData('payment_records', { data: [] });

      const result = await fetchDataTable('SP', 1, 50);

      expect(mockFrom).toHaveBeenCalledWith('processed_data');
      expect(result.count).toBe(1);
      expect(result.data[0].atendimento_id).toBe('AT-1');
    });

    it('aplica filtro de período', async () => {
      __setMockTableData('processed_data', { data: [], count: 0 });
      __setMockTableData('units', { data: [] });
      __setMockTableData('unit_clients', { data: [] });
      __setMockTableData('payment_records', { data: [] });

      await fetchDataTable('SP', 1, 50, undefined, undefined, '2026-05');

      const call = mockFrom.mock.results[0].value;
      expect(call.range).toHaveBeenCalled();
    });

    it('lança erro quando supabase falha', async () => {
      __setMockTableData('processed_data', { error: new Error('DB error') });
      __setMockTableData('units', { data: [] });
      __setMockTableData('unit_clients', { data: [] });
      __setMockTableData('payment_records', { data: [] });

      await expect(fetchDataTable('SP', 1, 50)).rejects.toThrow('DB error');
    });
  });

  describe('fetchDataRecordById', () => {
    it('retorna null para id vazio', async () => {
      const result = await fetchDataRecordById('');
      expect(result).toBeNull();
    });

    it('busca por atendimento_id', async () => {
      __setMockTableData('processed_data', {
        data: { id: 1, atendimento_id: 'AT-1', cliente: 'João', status: 'PENDENTE', unidade_code: 'SP', data: '2026-01-01', valor: 100, servico: 'Limpeza', horario: '10:00', profissional: 'Maria', repasse: 50, endereco: 'Rua A', whatscliente: '1199999', dia: '01/01/2026', unidade: 'Unidade SP', confirmacao: null, observacao: null, pos_vendas: null, comentario: null, reagendou: null, pagto: null },
        error: null,
      });
      __setMockTableData('units', { data: [] });
      __setMockTableData('unit_clients', { data: [] });
      __setMockTableData('payment_records', { data: [] });

      const result = await fetchDataRecordById('AT-1');

      expect(mockFrom).toHaveBeenCalledWith('processed_data');
      expect(result).not.toBeNull();
      expect(result!.atendimento_id).toBe('AT-1');
    });

    it('retorna null quando registro não existe', async () => {
      __setMockTableData('processed_data', { data: null, error: null });
      __setMockTableData('units', { data: [] });
      __setMockTableData('unit_clients', { data: [] });
      __setMockTableData('payment_records', { data: [] });

      const result = await fetchDataRecordById('999');
      expect(result).toBeNull();
    });
  });

  describe('fetchAppointments', () => {
    it('retorna array vazio para data inválida', async () => {
      const result = await fetchAppointments('SP', 'invalida');
      expect(result).toEqual([]);
    });

    it('retorna agendamentos para data válida', async () => {
      __setMockTableData('processed_data', {
        data: [
          { id: 1, atendimento_id: 'AT-1', cliente: 'João', status: 'PENDENTE', unidade_code: 'SP', data: '2026-01-01', valor: 100, servico: 'Limpeza', horario: '10:00', profissional: 'Maria', repasse: 50, endereco: 'Rua A', whatscliente: '1199999', dia: '01/01/2026', unidade: 'Unidade SP', confirmacao: null, observacao: null, pos_vendas: null, comentario: null, reagendou: null, pagto: null },
        ],
        error: null,
      });

      const result = await fetchAppointments('SP', '2026-01-01');

      expect(result).toHaveLength(1);
      expect(result[0].cliente).toBe('João');
    });

    it('lança erro no fetchAppointments', async () => {
      __setMockTableData('processed_data', { error: new Error('Supabase error') });

      await expect(fetchAppointments('SP', '2026-01-01')).rejects.toThrow('Supabase error');
    });
  });

  describe('updateDataRecord', () => {
    it('lança erro quando nenhum dado é fornecido', async () => {
      await expect(updateDataRecord('1', {} as any)).rejects.toThrow('Nenhum dado fornecido para atualização.');
    });

    it('atualiza e retorna registro', async () => {
      __setMockTableData('processed_data', {
        data: { id: 1, cliente: 'João', status: 'CONCLUIDO', unidade_code: 'SP', data: '2026-01-01', horario: '10:00', whatscliente: '1199999', confirmacao: null, observacao: null, pos_vendas: null, comentario: null, reagendou: null, pagto: null },
        error: null,
      });

      const result = await updateDataRecord('1', { status: 'CONCLUIDO' });

      expect(result.status).toBe('CONCLUIDO');
    });
  });

  describe('deleteDataRecord', () => {
    it('deleta registro por id', async () => {
      __setMockTableData('processed_data', { data: null, error: null });

      await deleteDataRecord('1');

      expect(mockFrom).toHaveBeenCalledWith('processed_data');
    });

    it('lança erro quando delete falha', async () => {
      __setMockTableData('processed_data', { error: new Error('Delete failed') });

      await expect(deleteDataRecord('1')).rejects.toThrow('Delete failed');
    });
  });

  describe('fetchAvailableYearsFromProcessedData', () => {
    it('retorna ano atual para unitCode ALL', async () => {
      const result = await fetchAvailableYearsFromProcessedData('ALL');
      expect(result).toEqual([new Date().getFullYear()]);
    });

    it('retorna anos dos dados', async () => {
      __setMockTableData('processed_data', {
        data: [{ data: '2025-06-01' }, { data: '2024-06-01' }, { data: '2026-06-01' }],
        error: null,
      });

      const result = await fetchAvailableYearsFromProcessedData('SP');

      expect(result).toContain(2026);
      expect(result).toContain(2025);
      expect(result).toContain(2024);
    });

    it('retorna ano atual quando não há dados', async () => {
      __setMockTableData('processed_data', { data: [], error: null });

      const result = await fetchAvailableYearsFromProcessedData('SP');
      expect(result).toEqual([new Date().getFullYear()]);
    });
  });
});
