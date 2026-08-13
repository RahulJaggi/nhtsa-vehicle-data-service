import { Module } from '@nestjs/common';
import { NhtsaClientService } from './nhtsa-client.service';
import { XmlParserService } from './xml-parser.service';
import { NhtsaTransformerService } from './nhtsa-transformer.service';
import { MakesRepository } from './makes.repository';
import { NhtsaIngestionService } from './nhtsa-ingestion.service';
import { VehicleService } from './vehicle.service';
import { VehicleResolver } from './vehicle.resolver';

@Module({
  providers: [
    NhtsaClientService,
    XmlParserService,
    NhtsaTransformerService,
    MakesRepository,
    NhtsaIngestionService,
    VehicleService,
    VehicleResolver,
  ],
  exports: [
    NhtsaClientService,
    XmlParserService,
    NhtsaTransformerService,
    MakesRepository,
    NhtsaIngestionService,
    VehicleService,
    VehicleResolver,
  ],
})
export class NhtsaModule {}
