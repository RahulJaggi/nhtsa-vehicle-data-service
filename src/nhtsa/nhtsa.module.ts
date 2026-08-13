import { Module } from '@nestjs/common';
import { NhtsaClientService } from './nhtsa-client.service';
import { XmlParserService } from './xml-parser.service';

@Module({
  providers: [NhtsaClientService, XmlParserService],
  exports: [NhtsaClientService, XmlParserService],
})
export class NhtsaModule {}
