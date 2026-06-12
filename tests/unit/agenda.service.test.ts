import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAgendaSettings,
  saveAgendaSettings,
  authenticateProfissional,
  getDisponibilidades,
  getProfissionaisLivres,
} from '../../services/agenda/agenda.service';

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
    chain.upsert = vi.fn(() => promise);
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

describe('agenda.service', () => {
  beforeEach(() => {
    mockFrom.mockClear();
    __setMockTableData('*', { data: null, error: null, count: 0 });
  });

  describe('getAgendaSettings', () => {
    it('busca settings por unitId', async () => {
      __setMockTableData('agenda_settings', {
        data: { id: 's-1', unit_id: 'u-1', dias_liberados: ['2026-01-01'], periodos_cadastrados: ['8 horas'], is_link_active: true },
        error: null,
      });

      const result = await getAgendaSettings('550e8400-e29b-41d4-a716-446655440000');

      expect(mockFrom).toHaveBeenCalledWith('agenda_settings');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('s-1');
    });

    it('retorna null quando não existe', async () => {
      __setMockTableData('agenda_settings', { data: null, error: null });

      const result = await getAgendaSettings('550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBeNull();
    });

    it('rejeita UUID inválido', async () => {
      await expect(getAgendaSettings('invalido')).rejects.toThrow('Unidade inválido');
    });
  });

  describe('saveAgendaSettings', () => {
    it('salva settings e retorna o registro', async () => {
      __setMockTableData('agenda_settings', {
        data: { id: 's-1', unit_id: '550e8400-e29b-41d4-a716-446655440000', dias_liberados: ['2026-01-01'], periodos_cadastrados: ['8 horas', '6 horas'], is_link_active: true },
        error: null,
      });

      const result = await saveAgendaSettings('550e8400-e29b-41d4-a716-446655440000', {
        dias_liberados: ['2026-01-01'],
      });

      expect(result.is_link_active).toBe(true);
    });

    it('rejeita UUID inválido', async () => {
      await expect(saveAgendaSettings('invalido', {})).rejects.toThrow('Unidade inválido');
    });
  });

  describe('authenticateProfissional', () => {
    beforeEach(() => {
      __setMockTableData('units', {
        data: { id: 'u-1', unit_name: 'Unidade SP' },
        error: null,
      });
      __setMockTableData('profissionais', {
        data: [
          { id: 'p-1', nome: 'Maria', whatsapp: '11999999999', unit_id: 'u-1' },
        ],
        error: null,
      });
      __setMockTableData('agenda_settings', {
        data: { id: 's-1', unit_id: 'u-1', dias_liberados: ['2026-01-01'], periodos_cadastrados: ['8 horas'], is_link_active: true },
        error: null,
      });
      __setMockTableData('agenda_disponibilidade', {
        data: [],
        error: null,
      });
    });

    it('autentica profissional com sucesso', async () => {
      const result = await authenticateProfissional('11999999999', 'unidade-sp');

      expect(result).not.toBeNull();
      expect(result.profissional.nome).toBe('Maria');
      expect(result.unidade.unit_name).toBe('Unidade SP');
      expect(result.jaEnviou).toBe(false);
      expect(result.diasPendentes).toEqual(['2026-01-01']);
    });

    it('lança erro para telefone inválido', async () => {
      await expect(authenticateProfissional('999', 'unidade-sp')).rejects.toThrow('WhatsApp válido');
    });

    it('lança erro para slug inválido', async () => {
      await expect(authenticateProfissional('11999999999', '')).rejects.toThrow('Link da unidade');
    });
  });

  describe('getDisponibilidades', () => {
    it('busca disponibilidades com range de datas', async () => {
      __setMockTableData('agenda_disponibilidade', {
        data: [
          { id: 'd-1', unit_id: 'u-1', profissional_id: 'p-1', data: '2026-01-01', periodos: ['8 horas'], status_manha: 'LIVRE', status_tarde: null, conflito: false },
        ],
        error: null,
      });

      const result = await getDisponibilidades(
        '550e8400-e29b-41d4-a716-446655440000',
        '2026-01-01',
        '2026-01-31'
      );

      expect(result).toHaveLength(1);
      expect(result[0].data).toBe('2026-01-01');
    });

    it('lança erro para UUID inválido', async () => {
      await expect(getDisponibilidades('invalido', '2026-01-01', '2026-01-31')).rejects.toThrow('Unidade inválido');
    });

    it('lança erro para data inválida', async () => {
      await expect(getDisponibilidades(
        '550e8400-e29b-41d4-a716-446655440000',
        'invalida',
        '2026-01-31'
      )).rejects.toThrow('Data inválida');
    });
  });

  describe('getProfissionaisLivres', () => {
    it('retorna profissionais livres', async () => {
      __setMockTableData('agenda_disponibilidade', {
        data: [
          { id: 'd-1', unit_id: 'u-1', profissional_id: 'p-1', data: '2026-01-01', periodos: ['8 horas'], status_manha: 'LIVRE', status_tarde: 'LIVRE', conflito: false },
        ],
        error: null,
      });

      const result = await getProfissionaisLivres(
        '550e8400-e29b-41d4-a716-446655440000',
        '2026-01-01'
      );

      expect(result).toHaveLength(1);
    });

    it('exclui profissionais com conflito', async () => {
      __setMockTableData('agenda_disponibilidade', {
        data: [
          { id: 'd-1', unit_id: 'u-1', profissional_id: 'p-1', data: '2026-01-01', periodos: ['8 horas'], status_manha: 'CLIENTE', status_tarde: 'LIVRE', conflito: true },
        ],
        error: null,
      });

      const result = await getProfissionaisLivres(
        '550e8400-e29b-41d4-a716-446655440000',
        '2026-01-01'
      );

      expect(result).toHaveLength(0);
    });
  });
});
