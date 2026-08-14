import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NhtsaClientService } from './nhtsa-client.service';
import {
  NhtsaHttpException,
  NhtsaNetworkException,
  NhtsaTimeoutException,
} from './nhtsa.exceptions';

describe('NhtsaClientService', () => {
  let service: NhtsaClientService;
  let mockFetch: jest.Mock;
  let originalFetch: any;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'nhtsa.getAllMakesUrl') return 'https://api.com/makes';
      if (key === 'nhtsa.vehicleTypesUrl') return 'https://api.com/types';
      if (key === 'nhtsa.timeout') return 100;
      if (key === 'nhtsa.maxRetries') return 2;
      return null;
    }),
  };

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  beforeEach(async () => {
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return {} as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NhtsaClientService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NhtsaClientService>(NhtsaClientService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllMakes()', () => {
    it('should fetch XML makes successfully on HTTP 200', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<xml>makes</xml>'),
      });

      const res = await service.getAllMakes();
      expect(res).toBe('<xml>makes</xml>');
      expect(mockFetch).toHaveBeenCalledWith('https://api.com/makes', expect.any(Object));
    });

    it('should throw NhtsaHttpException on non-2xx response after exhausting retries', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Error',
      });

      await expect(service.getAllMakes()).rejects.toThrow(NhtsaHttpException);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should throw NhtsaTimeoutException on AbortError (timeout) after exhausting retries', async () => {
      const err = new Error('The operation was aborted.');
      err.name = 'AbortError';
      mockFetch.mockRejectedValue(err);

      await expect(service.getAllMakes()).rejects.toThrow(NhtsaTimeoutException);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should retry on network error and eventually succeed', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('DNS Failure'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<xml>makes</xml>'),
        });

      const res = await service.getAllMakes();
      expect(res).toBe('<xml>makes</xml>');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should exhaust all retries and throw NhtsaNetworkException', async () => {
      mockFetch.mockRejectedValue(new Error('Refused Connection'));

      await expect(service.getAllMakes()).rejects.toThrow(NhtsaNetworkException);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('getVehicleTypesForMakeId()', () => {
    it('should append makeId and fetch vehicle types successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<xml>types</xml>'),
      });

      const res = await service.getVehicleTypesForMakeId(450);
      expect(res).toBe('<xml>types</xml>');
      expect(mockFetch).toHaveBeenCalledWith('https://api.com/types/450', expect.any(Object));
    });
  });
});
