const LEVEL_LABEL = {
  debug: 'DEBUG',
  info: 'INFO ',
  warn: 'WARN ',
  error: 'ERROR',
};

function write(level, scope, message, extra) {
  const line = `[${new Date().toISOString()}] ${LEVEL_LABEL[level]} (${scope}) ${message}`;
  if (level === 'error') console.error(line, extra ?? '');
  else if (level === 'warn') console.warn(line, extra ?? '');
  else console.log(line, extra ?? '');
}

export function createLogger(scope) {
  return {
    debug: (message, extra) => write('debug', scope, message, extra),
    info: (message, extra) => write('info', scope, message, extra),
    warn: (message, extra) => write('warn', scope, message, extra),
    error: (message, extra) => write('error', scope, message, extra),
  };
}

export default createLogger;
