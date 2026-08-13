import { Module } from '@nestjs/common';
import { NhtsaClientService } from './nhtsa-client.service';
import { XmlParserService } from './xml-parser.service';
import { NhtsaTransformerService } from './nhtsa-transformer.service';
import { MakesRepository } from './makes.repository';
import { NhtsaIngestionService } from './nhtsa-ingestion.service';

@Module({
  providers: [
    NhtsaClientService,
    XmlParserService,
    NhtsaTransformerService,
    MakesRepository,
    NhtsaIngestionService,
  ],
  exports: [
    NhtsaClientService,
    XmlParserService,
    NhtsaTransformerService,
    MakesRepository,
    NhtsaIngestionService,
  ],
})
export class NhtsaModule {}
