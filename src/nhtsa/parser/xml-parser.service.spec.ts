import { Test, TestingModule } from '@nestjs/testing';
import { XmlParserService } from './xml-parser.service';
import { XmlParseException } from './xml-parse.exception';

describe('XmlParserService', () => {
  let service: XmlParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XmlParserService],
    }).compile();

    service = module.get<XmlParserService>(XmlParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parse()', () => {
    it('should successfully parse valid XML into a JS object', () => {
      const validXml = `
        <Response>
          <Count>2</Count>
          <Message>Success</Message>
          <Results>
            <Item>
              <Id>1</Id>
              <Name>Toyota</Name>
            </Item>
            <Item>
              <Id>2</Id>
              <Name>Honda</Name>
            </Item>
          </Results>
        </Response>
      `;

      const result = service.parse(validXml);
      expect(result).toBeDefined();
      expect(result.Response).toBeDefined();
      expect(result.Response.Count).toBe(2);
      expect(result.Response.Message).toBe('Success');
      expect(result.Response.Results.Item).toHaveLength(2);
      expect(result.Response.Results.Item[0].Id).toBe(1);
      expect(result.Response.Results.Item[0].Name).toBe('Toyota');
    });

    it('should throw XmlParseException on malformed XML', () => {
      const malformedXml = `
        <Response>
          <Count>2</Count>
          <Message>Success</Message>
          <Results>
            <Item>
              <Id>1</Id>
              <Name>Toyota</Name>
            <!-- Missing closing tag for Item and Results -->
          </Response>
      `;

      expect(() => service.parse(malformedXml)).toThrow(XmlParseException);
      expect(() => service.parse(malformedXml)).toThrow('XML validation failed');
    });

    it('should throw XmlParseException on empty XML string', () => {
      expect(() => service.parse('')).toThrow(XmlParseException);
      expect(() => service.parse('   ')).toThrow(XmlParseException);
      expect(() => service.parse(null as any)).toThrow(XmlParseException);
    });
  });
});
