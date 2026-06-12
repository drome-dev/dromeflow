export interface PosVenda {
  id: string;
  atendimento_id: string | null;
  ATENDIMENTO_ID?: string | null; // Mantido para compatibilidade temporária
  chat_id: string | null;
  nome: string | null;
  contato: string | null;
  unit_id: string | null;
  data: string | null; // ISO timestamp
  status: 'pendente' | 'agendado' | 'contatado' | 'finalizado' | null;
  nota: number | null; // 1-5
  reagendou: boolean;
  feedback: string | null;
  data_agendamento: string | null; // Data programada para envio (YYYY-MM-DD)
  horario_agendamento: string | null; // Horário programado para envio (HH:MM:SS)
  data_finalizacao?: string | null; // Data em que o pós-venda foi concluído
  profissional?: string | null; // Profissional que executou o serviço
  created_at: string;
  updated_at: string;
}

export interface PosVendaFormData {
  atendimento_id?: string | null;
  ATENDIMENTO_ID?: string | null; // Mantido para compatibilidade temporária
  chat_id?: string | null;
  nome?: string | null;
  contato?: string | null;
  unit_id?: string | null;
  data?: string | null;
  status?: 'pendente' | 'agendado' | 'contatado' | 'finalizado' | null;
  nota?: number | null;
  reagendou?: boolean;
  feedback?: string | null;
  data_agendamento?: string | null; // Data programada para envio
  horario_agendamento?: string | null; // Horário programado para envio
  profissional?: string | null;
  data_finalizacao?: string | null;
  PROFISSIONAL?: string | null;
}