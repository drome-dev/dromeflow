export type AgendaPeriod = '8 horas' | '6 horas' | '4 horas manhã' | '4 horas tarde' | 'NÃO DISPONIVEL' | 'NÃO DISPONÍVEL' | 'NÃO' | 'NAO';
export type AgendaTurnStatus = 'CLIENTE' | 'LIVRE' | 'NÃO' | 'RESERVA' | 'FALTOU' | 'CANCELOU' | null;

export const AGENDA_PERIODS = {
  MANHA: ['8 horas', '6 horas', '4 horas manhã'],
  TARDE: ['8 horas', '6 horas', '4 horas tarde'],
  NAO: ['NÃO DISPONIVEL', 'NÃO DISPONÍVEL', 'NÃO', 'NAO'],
  MOBILE_OPTIONS: ['8 horas', '6 horas', '4 horas manhã', '4 horas tarde', 'NÃO DISPONIVEL'],
} as const;

export const AGENDA_STATUS = {
  CLIENTE: 'CLIENTE',
  LIVRE: 'LIVRE',
  NAO: 'NÃO',
  RESERVA: 'RESERVA',
  FALTOU: 'FALTOU',
  CANCELOU: 'CANCELOU',
  LIMPAR: 'LIMPAR',
} as const;

export const AGENDA_BLOCKING_STATUSES = [
  AGENDA_STATUS.CLIENTE,
  AGENDA_STATUS.NAO,
  AGENDA_STATUS.RESERVA,
  AGENDA_STATUS.FALTOU,
  AGENDA_STATUS.CANCELOU,
] as const;

export const DEFAULT_AGENDA_PERIODS = [
  '8 horas',
  '6 horas',
  '4 horas manhã',
  '4 horas tarde',
] as const;

export const PUBLIC_AGENDA_DEFAULT_PERIODS = [
  ...DEFAULT_AGENDA_PERIODS,
  'NÃO DISPONIVEL',
] as const;

export const AGENDA_TURNO_DIVISOR_HOUR = 13;
