import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NhtsaException,
  NhtsaHttpException,
  NhtsaNetworkException,
  NhtsaTimeoutException,
} from './nhtsa-exceptions';

@Injectable()
export class NhtsaClientService {
  private readonly logger = new Logger(NhtsaClientService.name);
  private readonly getAllMakesUrl: string;
  private readonly vehicleTypesUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(private readonly configService: ConfigService) {
    this.getAllMakesUrl = this.configService.get<string>('nhtsa.getAllMakesUrl')!;
    this.vehicleTypesUrl = this.configService.get<string>('nhtsa.vehicleTypesUrl')!;
    this.timeoutMs = this.configService.get<number>('nhtsa.timeout') ?? 5000;
    this.maxRetries = this.configService.get<number>('nhtsa.maxRetries') ?? 3;

    if (!this.getAllMakesUrl || !this.vehicleTypesUrl) {
      throw new Error('NHTSA API endpoints are not fully configured in ConfigService');
    }
  }

  /**
   * Fetches all makes from NHTSA in raw XML.
   */
  async getAllMakes(): Promise<string> {
    this.logger.log('Initiating request to fetch all makes from NHTSA');
    return this.fetchWithRetryAndTimeout(this.getAllMakesUrl);
  }

  /**
   * Fetches vehicle types for a specific make ID from NHTSA in raw XML.
   */
  async getVehicleTypesForMakeId(makeId: number): Promise<string> {
    this.logger.log(`Initiating request to fetch vehicle types for Make ID: ${makeId}`);
    const url = `${this.vehicleTypesUrl.replace(/\/$/, '')}/${makeId}`;
    return this.fetchWithRetryAndTimeout(url);
  }

  /**
   * Executes fetch with timeout, custom error handling, and backoff retries.
   */
  private async fetchWithRetryAndTimeout(url: string): Promise<string> {
    let attempt = 0;
    const baseDelayMs = 1000;

    while (true) {
      attempt++;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        this.logger.debug(`Fetching URL (attempt ${attempt}/${this.maxRetries + 1}): ${url}`);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);

        if (!response.ok) {
          throw new NhtsaHttpException(
            `NHTSA API responded with status ${response.status} (${response.statusText})`,
            response.status,
          );
        }

        const xmlText = await response.text();
        this.logger.debug(`Request successful. Received ${xmlText.length} bytes.`);
        return xmlText;
      } catch (error: any) {
        clearTimeout(id);

        let mappedError: NhtsaException;

        if (error.name === 'AbortError') {
          mappedError = new NhtsaTimeoutException(
            `Request to NHTSA timed out after ${this.timeoutMs}ms`,
            error,
          );
        } else if (error instanceof NhtsaHttpException) {
          mappedError = error;
        } else {
          mappedError = new NhtsaNetworkException(
            `Network error occurred while connecting to NHTSA: ${error.message}`,
            error,
          );
        }

        if (attempt <= this.maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          this.logger.warn(
            `Request failed (attempt ${attempt}/${this.maxRetries + 1}). Retrying in ${delay}ms. Error: ${mappedError.message}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          this.logger.error(
            `Request failed after ${attempt} attempts. Final error: ${mappedError.message}`,
            mappedError.stack,
          );
          throw mappedError;
        }
      }
    }
  }
}
