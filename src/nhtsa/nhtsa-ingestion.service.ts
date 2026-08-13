import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NhtsaClientService } from './nhtsa-client.service';
import { XmlParserService } from './xml-parser.service';
import { NhtsaTransformerService } from './nhtsa-transformer.service';
import { MakesRepository } from './makes.repository';

@Injectable()
export class NhtsaIngestionService {
  private readonly logger = new Logger(NhtsaIngestionService.name);
  private readonly concurrencyLimit: number;

  constructor(
    private readonly client: NhtsaClientService,
    private readonly parser: XmlParserService,
    private readonly transformer: NhtsaTransformerService,
    private readonly repository: MakesRepository,
    private readonly configService: ConfigService,
  ) {
    this.concurrencyLimit = this.configService.get<number>('nhtsa.concurrency') ?? 5;
  }

  /**
   * Orchestrates the ingestion of makes and vehicle types from the NHTSA API into the database.
   * Accepts an optional limit parameter to process only a subset of makes.
   */
  async ingest(limit?: number): Promise<{ total: number; succeeded: number; failed: number }> {
    this.logger.log('Starting ingestion flow...');

    let rawMakesXml: string;
    try {
      rawMakesXml = await this.client.getAllMakes();
    } catch (error: any) {
      this.logger.error(`Critical Failure: Unable to fetch makes from NHTSA API: ${error.message}`, error.stack);
      throw error;
    }

    let parsedMakes: any;
    try {
      parsedMakes = this.parser.parse(rawMakesXml);
    } catch (error: any) {
      this.logger.error(`Critical Failure: Failed to parse makes XML: ${error.message}`, error.stack);
      throw error;
    }

    const makes = this.transformer.transformMakes(parsedMakes);
    this.logger.log(`Found ${makes.length} makes to process.`);

    const targets = limit !== undefined && limit !== null ? makes.slice(0, limit) : makes;
    const total = targets.length;
    this.logger.log(`Processing ${total} makes with concurrency limit of ${this.concurrencyLimit}`);

    let succeeded = 0;
    let failed = 0;

    const pool = new Set<Promise<void>>();

    for (let i = 0; i < targets.length; i++) {
      const make = targets[i];

      if (pool.size >= this.concurrencyLimit) {
        await Promise.race(pool);
      }

      const task = (async () => {
        try {
          this.logger.debug(`[Make Ingest] Syncing Make ${make.makeName} (ID: ${make.makeId})`);

          const rawTypesXml = await this.client.getVehicleTypesForMakeId(make.makeId);
          const parsedTypes = this.parser.parse(rawTypesXml);
          const vehicleTypes = this.transformer.transformVehicleTypes(parsedTypes);
          const combined = this.transformer.combineMakeAndTypes(make, vehicleTypes);
          
          await this.repository.saveMakeWithTypes(combined);

          succeeded++;
          this.logger.debug(`[Make Ingest] Successfully synced ${make.makeName} (ID: ${make.makeId}) with ${vehicleTypes.length} vehicle types`);
        } catch (error: any) {
          failed++;
          this.logger.warn(
            `[Make Ingest] Failed to sync Make ${make.makeName} (ID: ${make.makeId}). Reason: ${error.message}`,
          );
        }
      })();

      const poolPromise = task.finally(() => {
        pool.delete(poolPromise);
      });
      pool.add(poolPromise);
    }

    await Promise.all(pool);

    this.logger.log(`Ingestion completed. Total processed: ${total}, Succeeded: ${succeeded}, Failed: ${failed}`);
    return { total, succeeded, failed };
  }
}
