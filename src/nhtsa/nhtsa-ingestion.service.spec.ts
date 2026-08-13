import { Test, TestingModule } from '@nestjs/testing';
import { NhtsaIngestionService } from './nhtsa-ingestion.service';
import { NhtsaClientService } from './nhtsa-client.service';
import { XmlParserService } from './xml-parser.service';
import { NhtsaTransformerService } from './nhtsa-transformer.service';
import { MakesRepository } from './makes.repository';
import { ConfigService } from '@nestjs/config';

describe('NhtsaIngestionService', () => {
  let service: NhtsaIngestionService;
  let client: jest.Mocked<NhtsaClientService>;
  let parser: jest.Mocked<XmlParserService>;
  let transformer: jest.Mocked<NhtsaTransformerService>;
  let repository: jest.Mocked<MakesRepository>;

  const mockClient = {
    getAllMakes: jest.fn().mockResolvedValue('<xml>makes</xml>'),
    getVehicleTypesForMakeId: jest.fn().mockResolvedValue('<xml>types</xml>'),
  };

  const mockParser = {
    parse: jest.fn().mockReturnValue({ parsed: true }),
  };

  const mockTransformer = {
    transformMakes: jest.fn().mockReturnValue([
      { makeId: 450, makeName: 'Toyota' },
      { makeId: 480, makeName: 'Honda' },
    ]),
    transformVehicleTypes: jest.fn().mockReturnValue([
      { typeId: 3, typeName: 'Truck' },
    ]),
    combineMakeAndTypes: jest.fn().mockImplementation((make, types) => ({
      ...make,
      vehicleTypes: types,
    })),
  };

  const mockRepository = {
    saveMakeWithTypes: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(2),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NhtsaIngestionService,
        { provide: NhtsaClientService, useValue: mockClient },
        { provide: XmlParserService, useValue: mockParser },
        { provide: NhtsaTransformerService, useValue: mockTransformer },
        { provide: MakesRepository, useValue: mockRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<NhtsaIngestionService>(NhtsaIngestionService);
    client = module.get(NhtsaClientService);
    parser = module.get(XmlParserService);
    transformer = module.get(NhtsaTransformerService);
    repository = module.get(MakesRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ingest()', () => {
    it('should run the complete ingestion flow successfully', async () => {
      const stats = await service.ingest();

      expect(client.getAllMakes).toHaveBeenCalled();
      expect(parser.parse).toHaveBeenCalledWith('<xml>makes</xml>');
      expect(transformer.transformMakes).toHaveBeenCalled();

      expect(client.getVehicleTypesForMakeId).toHaveBeenCalledTimes(2);
      expect(client.getVehicleTypesForMakeId).toHaveBeenNthCalledWith(1, 450);
      expect(client.getVehicleTypesForMakeId).toHaveBeenNthCalledWith(2, 480);

      expect(repository.saveMakeWithTypes).toHaveBeenCalledTimes(2);

      expect(stats).toEqual({
        total: 2,
        succeeded: 2,
        failed: 0,
      });
    });

    it('should respect the limit parameter', async () => {
      const stats = await service.ingest(1);

      expect(client.getVehicleTypesForMakeId).toHaveBeenCalledTimes(1);
      expect(client.getVehicleTypesForMakeId).toHaveBeenCalledWith(450);
      expect(repository.saveMakeWithTypes).toHaveBeenCalledTimes(1);

      expect(stats).toEqual({
        total: 1,
        succeeded: 1,
        failed: 0,
      });
    });

    it('should handle partial failures resiliently', async () => {
      client.getVehicleTypesForMakeId
        .mockResolvedValueOnce('<xml>toyota-types</xml>')
        .mockRejectedValueOnce(new Error('NHTSA API Timeout'));

      const stats = await service.ingest();

      expect(repository.saveMakeWithTypes).toHaveBeenCalledTimes(1);
      expect(stats).toEqual({
        total: 2,
        succeeded: 1,
        failed: 1,
      });
    });

    it('should handle database errors per make resiliently', async () => {
      repository.saveMakeWithTypes
        .mockRejectedValueOnce(new Error('Database Constraint Violation'))
        .mockResolvedValueOnce(undefined);

      const stats = await service.ingest();

      expect(stats).toEqual({
        total: 2,
        succeeded: 1,
        failed: 1,
      });
    });
  });
});
