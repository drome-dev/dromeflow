type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'confirm_password',
  'current_password',
  'new_password',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'api_key',
  'apikey',
  'client_secret',
  'auth_token',
  'authorization',
  'credential',
  'session_id',
  'encrypted_password',
  'cpf',
  'cpf_formatado',
  'rg',
  'cnpj',
  'whatsapp_token',
  'asaas_token',
  'meta_token',
]);

const isProduction = import.meta.env?.PROD ?? false;

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  if (value.length <= 8) return '***';
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
};

const sanitize = (payload: LogContext): LogContext => {
  const out: LogContext = {};
  for (const [key, value] of Object.entries(payload)) {
    const normalizedKey = key.trim().toLowerCase();
    if (SENSITIVE_KEYS.has(normalizedKey)) {
      out[key] = '***';
      continue;
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      out[key] = sanitize(value as LogContext);
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.map((item) =>
        typeof item === 'object' && item !== null ? sanitize(item as LogContext) : sanitizeValue(item)
      );
      continue;
    }
    out[key] = value;
  }
  return out;
};

const write = (level: LogLevel, scope: string, message: string, context?: LogContext) => {
  if (level === 'debug' && isProduction) return;

  const normalizedMessage = String(message).replace(
    /(password|senha|token|secret|api[_-]?key|authorization|cookie|cpf|cnpj)\s*[:=]\s*\S+/gi,
    '$1: ***'
  );

  const sanitizedContext = context ? sanitize(context) : undefined;
  const payload = sanitizedContext
    ? [`[${scope}] ${normalizedMessage}`, sanitizedContext]
    : [`[${scope}] ${normalizedMessage}`];

  if (level === 'error') console.error(...payload);
  else if (level === 'warn') console.warn(...payload);
  else if (level === 'info') console.info(...payload);
  else console.debug(...payload);
};

export const createLogger = (scope: string) => ({
  debug: (message: string, context?: LogContext) => write('debug', scope, message, context),
  info: (message: string, context?: LogContext) => write('info', scope, message, context),
  warn: (message: string, context?: LogContext) => write('warn', scope, message, context),
  error: (message: string, context?: LogContext) => write('error', scope, message, context),
});
