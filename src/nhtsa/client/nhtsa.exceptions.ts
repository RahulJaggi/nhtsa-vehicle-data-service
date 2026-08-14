export class NhtsaException extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NhtsaTimeoutException extends NhtsaException {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
  }
}

export class NhtsaHttpException extends NhtsaException {
  constructor(message: string, public readonly statusCode: number, originalError?: any) {
    super(message, originalError);
  }
}

export class NhtsaNetworkException extends NhtsaException {
  constructor(message: string, originalError?: any) {
    super(message, originalError);
  }
}
