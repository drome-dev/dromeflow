export type AgendaServiceErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNIT_NOT_FOUND'
  | 'PROFESSIONAL_NOT_FOUND'
  | 'SETTINGS_NOT_FOUND'
  | 'SUPABASE_ERROR'
  | 'SAVE_FAILED'
  | 'AUTH_FAILED'
  | 'UNKNOWN_ERROR';

export class AgendaServiceError extends Error {
  readonly code: AgendaServiceErrorCode;
  readonly cause?: unknown;
  readonly userMessage: string;

  constructor(code: AgendaServiceErrorCode, userMessage: string, cause?: unknown) {
    super(userMessage);
    this.name = 'AgendaServiceError';
    this.code = code;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

export const toAgendaServiceError = (
  error: unknown,
  fallbackCode: AgendaServiceErrorCode = 'UNKNOWN_ERROR',
  fallbackMessage = 'Erro inesperado no módulo de agenda.'
): AgendaServiceError => {
  if (error instanceof AgendaServiceError) return error;
  return new AgendaServiceError(fallbackCode, fallbackMessage, error);
};

export const getAgendaErrorMessage = (error: unknown, fallback = 'Erro ao carregar dados da agenda.'): string => {
  if (error instanceof AgendaServiceError) return error.userMessage;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};
