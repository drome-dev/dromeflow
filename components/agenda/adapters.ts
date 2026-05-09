import type { AgendaAtendimento, DataRecord } from '../../types';

export const toAgendaAtendimento = (record: DataRecord | AgendaAtendimento): AgendaAtendimento => {
   const raw = record as DataRecord & AgendaAtendimento & Record<string, unknown>;

   return {
      ...raw,
      id: raw.id,
      ATENDIMENTO_ID: raw.ATENDIMENTO_ID ?? raw.atendimento_id,
      DATA: raw.DATA ?? raw.data ?? null,
      HORARIO: raw.HORARIO ?? raw.horario ?? null,
      'SERVIÇO': raw['SERVIÇO'] ?? raw.servico ?? null,
      'PERÍODO': raw['PERÍODO'] ?? raw.periodo ?? null,
      STATUS: raw.STATUS ?? raw.status ?? null,
      PROFISSIONAL: raw.PROFISSIONAL ?? raw.profissional ?? null,
      CLIENTE: raw.CLIENTE ?? raw.cliente ?? null,
   };
};

export const toAgendaAtendimentos = (records: Array<DataRecord | AgendaAtendimento> = []): AgendaAtendimento[] => {
   return records.map(toAgendaAtendimento);
};
