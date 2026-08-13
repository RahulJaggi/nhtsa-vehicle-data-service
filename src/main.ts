import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { PinoLoggerService } from './logger/pino-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);

  logger.log('Starting application bootstrap...', 'Bootstrap');

  // Enable NestJS shutdown hooks to gracefully log shutdown events
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3000;

  await app.listen(port);
  logger.log(`Application successfully started and listening on port ${port}`, 'Bootstrap');
}
bootstrap();