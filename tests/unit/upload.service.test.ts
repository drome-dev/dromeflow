import { describe, it, expect, vi } from 'vitest';
import { toFrontendRecord, toSnakeCasePayload } from '../../services/data/processedDataMapper';

describe('upload.service (processedDataMapper)', () => {
  it('toFrontendRecord: converte campos do banco para frontend', () => {
    const dbRecord: any = {
      id: '1',
      unidade_code: 'SP',
      atendimento_id: 'AT-1',
      data: '2026-01-01',
      horario: '10:00',
      valor: '100',
      servico: 'Limpeza',
      tipo: 'normal',
      periodo: 'manha',
      momento: 'inicial',
      cliente: 'Joao',
      profissional: 'Maria',
      endereco: 'Rua A',
      dia: '01/01/2026',
      repasse: '50',
      whatscliente: '1199999',
      cupom: '',
      origem: 'xlsx',
      is_divisao: false,
      cadastro: '2026-01-01',
      unidade: 'Unidade SP',
      status: 'PENDENTE',
      pos_vendas: null,
    };
    const frontend = toFrontendRecord(dbRecord);
    expect(frontend.atendimento_id).toBe('AT-1');
    expect(frontend.status).toBe('PENDENTE');
  });

  it('toSnakeCasePayload: filtra chaves undefined', () => {
    const payload: any = {
      atendimento_id: 'AT-2',
      data: '2026-01-02',
      horario: '14:00',
      valor: 200,
      servico: 'Lavagem',
      tipo: 'extra',
      periodo: 'tarde',
      momento: 'retorno',
      status: undefined,
    };
    const snake = toSnakeCasePayload(payload);
    expect(snake.atendimento_id).toBe('AT-2');
    expect(snake.tipo).toBe('extra');
    expect(snake.status).toBeUndefined();
  });
});
