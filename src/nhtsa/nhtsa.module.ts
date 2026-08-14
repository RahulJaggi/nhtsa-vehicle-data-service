import { Module } from '@nestjs/common';
import { NhtsaClientService } from './client/nhtsa-client.service';
import { XmlParserService } from './parser/xml-parser.service';
import { NhtsaTransformerService } from './transformer/nhtsa-transformer.service';
import { MakesRepository } from './repository/makes.repository';
import { NhtsaIngestionService } from './ingestion/nhtsa-ingestion.service';
import { VehicleService } from './graphql/vehicle.service';
import { VehicleResolver } from './graphql/vehicle.resolver';

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
