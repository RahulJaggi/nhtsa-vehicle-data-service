import { Injectable } from '@nestjs/common';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { XmlParseException } from './xml-parse.exception';

@Injectable()
export class XmlParserService {
  private readonly parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
    });
  }

  /**
   * Parses a raw XML string into a JavaScript object.
   * Throws XmlParseException if the XML is empty or malformed.
   */
  parse<T = any>(xmlString: string): T {
    if (!xmlString || xmlString.trim() === '') {
      throw new XmlParseException('XML content is empty or contains only whitespace');
    }

    const validationResult = XMLValidator.validate(xmlString);
    if (validationResult !== true) {
      const errorDetail = validationResult.err
        ? `${validationResult.err.msg} at line ${validationResult.err.line}, col ${validationResult.err.col}`
        : 'Malformed XML structure';
      throw new XmlParseException(`XML validation failed: ${errorDetail}`, validationResult.err);
    }

    try {
      return this.parser.parse(xmlString) as T;
    } catch (error: any) {
      throw new XmlParseException(`XML parsing failed: ${error.message}`, error);
    }
  }
}
