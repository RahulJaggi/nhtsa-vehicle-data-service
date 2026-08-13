import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NhtsaIngestionService } from '../nhtsa/nhtsa-ingestion.service';
import { PinoLoggerService } from '../logger/pino-logger.service';

async function bootstrap() {
  // Create Nest standalone application context (suppressing default Nest boot logging)
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const logger = app.get(PinoLoggerService);
  app.useLogger(logger);

  // Parse numeric limit argument (robustly scan process.argv for the first positive integer)
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
