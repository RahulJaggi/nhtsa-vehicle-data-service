import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';

@Injectable()
export class PinoLoggerService implements LoggerService {
  private readonly logger: pino.Logger;

  constructor() {
    let level = process.env.LOG_LEVEL || 'info';
    if (level === 'log') {
      level = 'info';
    } else if (level === 'verbose') {
      level = 'trace';
    }

    this.logger = pino({
      level,
      formatters: {
        level: (label) => ({ level: label }),
      },
      redact: {
        paths: [
          'DATABASE_URL',
          'databaseUrl',
          'database.url',
          'password',
          'secret',
          'token',
          'key',
          'apiKey',
        ],
        censor: '[REDACTED]',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    });
  }

  log(message: any, context?: string) {
    if (typeof message === 'object') {
      const { msg, ...ctx } = message;
      this.logger.info({ ...ctx, context }, msg || '');
    } else {
      this.logger.info({ context }, message);
    }
  }

  error(message: any, trace?: string, context?: string) {
    if (typeof message === 'object') {
      const { msg, ...ctx } = message;
      this.logger.error({ ...ctx, err: trace, context }, msg || '');
    } else {
      this.logger.error({ err: trace, context }, message);
    }
  }

  warn(message: any, context?: string) {
    if (typeof message === 'object') {
      const { msg, ...ctx } = message;
      this.logger.warn({ ...ctx, context }, msg || '');
    } else {
      this.logger.warn({ context }, message);
    }
  }

  debug(message: any, context?: string) {
    if (typeof message === 'object') {
      const { msg, ...ctx } = message;
      this.logger.debug({ ...ctx, context }, msg || '');
    } else {
      this.logger.debug({ context }, message);
    }
  }

  verbose(message: any, context?: string) {
    if (typeof message === 'object') {
      const { msg, ...ctx } = message;
      this.logger.trace({ ...ctx, context }, msg || '');
    } else {
      this.logger.trace({ context }, message);
    }
  }
}
