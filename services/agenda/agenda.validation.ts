import { AGENDA_PERIODS } from '../../constants/agenda';
import { AgendaServiceError } from './agenda.errors';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UNIT_SLUG_RE = /^[a-zA-Z0-9_-]{2,80}$/;

export const normalizeBrazilianPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) return digits.slice(2);
  return digits;
};

export const assertValidPhone = (phone: string): string => {
  const normalized = normalizeBrazilianPhone(phone);
  if (normalized.length < 10 || normalized.length > 11) {
    throw new AgendaServiceError('VALIDATION_ERROR', 'Informe um WhatsApp válido com DDD.');
  }
  return normalized;
};

export const assertValidUnitSlug = (unitSlug: string): void => {
  if (!UNIT_SLUG_RE.test(unitSlug)) {
    throw new AgendaServiceError('VALIDATION_ERROR', 'Link da unidade inválido.');
  }
};

export const assertValidUuid = (value: string, label = 'identificador'): void => {
  if (!UUID_RE.test(value)) {
    throw new AgendaServiceError('VALIDATION_ERROR', `${label} inválido.`);
  }
};

export const assertValidISODate = (value: string): void => {
  if (!ISO_DATE_RE.test(value) || Number.isNaN(new Date(`${value}T00:00:00`).getTime())) {
    throw new AgendaServiceError('VALIDATION_ERROR', 'Data inválida.');
  }
};

export const assertValidDateRange = (startDate: string, endDate: string): void => {
  assertValidISODate(startDate);
  assertValidISODate(endDate);
  if (startDate > endDate) {
    throw new AgendaServiceError('VALIDATION_ERROR', 'Período de datas inválido.');
  }
};

export const assertValidAgendaPeriods = (periods: string[]): void => {
  const allowed = new Set<string>([
    ...AGENDA_PERIODS.MANHA,
    ...AGENDA_PERIODS.TARDE,
    ...AGENDA_PERIODS.NAO,
  ]);

  const invalid = periods.find(period => !allowed.has(period));
  if (invalid) {
    throw new AgendaServiceError('VALIDATION_ERROR', `Período de agenda inválido: ${invalid}.`);
  }
};
