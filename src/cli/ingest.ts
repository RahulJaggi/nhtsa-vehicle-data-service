import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NhtsaIngestionService } from '../nhtsa/ingestion/nhtsa-ingestion.service';
import { PinoLoggerService } from '../logger/pino-logger.service';

async function bootstrap() {
  // spin up app context without starting the HTTP server
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);

  // scan argv for the first positive integer — works regardless of how the script is invoked
  const limit = process.argv
    .map((arg) => parseInt(arg, 10))
    .find((num) => !isNaN(num) && num > 0);

  logger.log(
    limit
      ? `Starting standalone CLI ingestion with limit: ${limit}...`
      : 'Starting standalone CLI ingestion...',
    'IngestCLI',
  );

  try {
    const ingestionService = app.get(NhtsaIngestionService);
    const stats = await ingestionService.ingest(limit);

    logger.log(
      {
        msg: 'CLI Ingestion completed successfully',
        ...stats,
      },
      'IngestCLI',
    );

    await app.close();

    // exit 1 if any makes failed so CI/scripts can detect partial failures
    if (stats.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error: any) {
    logger.error(
      {
        msg: 'CLI Ingestion failed with error',
        error: error.message,
      },
      error.stack,
      'IngestCLI',
    );
    await app.close();
    process.exit(1);
  }
}
bootstrap();
