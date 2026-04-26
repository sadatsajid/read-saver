import pino from 'pino';

const redact = {
  paths: [
    'body.password',
    'body.currentPassword',
    'body.newPassword',
    'body.token',
    'body.refreshToken',
    'headers.authorization',
    'headers.Authorization',
    'headers.cookie',
    'headers.Cookie',
  ],
  censor: '[Redacted]',
};

const isDev = process.env.NODE_ENV !== 'production';

export const logger = isDev
  ? pino({
      name: 'read-saver',
      level: process.env.LOG_LEVEL ?? 'debug',
      redact,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      },
    })
  : pino({
      name: 'read-saver',
      level: process.env.LOG_LEVEL ?? 'info',
      redact,
    });
