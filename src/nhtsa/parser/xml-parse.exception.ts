export class XmlParseException extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
