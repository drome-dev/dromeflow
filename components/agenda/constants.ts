import { AGENDA_PERIODS } from '../../constants/agenda';

export type ActiveTab = 'gestao' | 'configuracoes';
export type StatusPeriod = 'M' | 'T';
export type FilterType = 'TODOS' | 'CLIENTE' | 'LIVRE' | 'NÃO' | 'FALTOU' | 'CANCELOU';
export type StatusOption = 'LIVRE' | 'NÃO' | 'CANCELOU' | 'FALTOU' | 'RESERVA' | 'LIMPAR';

// Mapeamento fiel ao app externo (AgendaExternaPage)
export const PERIODOS_MANHA = [...AGENDA_PERIODS.MANHA];
export const PERIODOS_TARDE = [...AGENDA_PERIODS.TARDE];
export const PERIODOS_NAO = [...AGENDA_PERIODS.NAO];

export const MOBILE_STATUS_OPTIONS = [...AGENDA_PERIODS.MOBILE_OPTIONS];

export const STATUS_LABELS: Record<StatusOption, { label: string; color: string; bgColor?: string }> = {
   LIVRE: { label: 'LIVRE', color: 'text-brand-cyan' },
   'NÃO': { label: 'NÃO', color: 'text-text-tertiary' },
   RESERVA: { label: 'RESERVA', color: 'text-black', bgColor: 'bg-yellow-400' },
   CANCELOU: { label: 'CANCELOU', color: 'text-rose-500' },
   FALTOU: { label: 'FALTOU', color: 'text-orange-500' },
   LIMPAR: { label: 'LIMPAR STATUS', color: 'text-text-tertiary' },
};

export const STATUS_OPTIONS: StatusOption[] = ['LIVRE', 'NÃO', 'RESERVA', 'CANCELOU', 'FALTOU', 'LIMPAR'];
