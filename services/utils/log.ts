type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const isProduction = import.meta.env?.PROD ?? false;

const write = (level: LogLevel, scope: string, message: string, context?: LogContext) => {
  if (level === 'debug' && isProduction) return;

  const payload = context ? [`[${scope}] ${message}`, context] : [`[${scope}] ${message}`];

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
