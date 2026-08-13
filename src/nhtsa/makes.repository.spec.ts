import { Test, TestingModule } from '@nestjs/testing';
import { MakesRepository } from './makes.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('MakesRepository', () => {
  let repository: MakesRepository;
  let prisma: PrismaService;

  const mockTx = {
    make: {
      upsert: jest.fn().mockResolvedValue({ id: 1, makeId: 450, makeName: 'Toyota' }),
    },
    vehicleType: {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
  };

  const mockPrismaService = {
    $transaction: jest.fn().mockImplementation((callback) => callback(mockTx)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MakesRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<MakesRepository>(MakesRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('saveMakeWithTypes()', () => {
    it('should save a make and its vehicle types inside a transaction', async () => {
      const makeData = {
        makeId: 450,
        makeName: 'Toyota',
        vehicleTypes: [
          { typeId: 3, typeName: 'Truck' },
          { typeId: 5, typeName: 'Bus' },
        ],
      };

      await repository.saveMakeWithTypes(makeData);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockTx.make.upsert).toHaveBeenCalledWith({
        where: { makeId: 450 },
        update: { makeName: 'Toyota' },
        create: { makeId: 450, makeName: 'Toyota' },
      });
      expect(mockTx.vehicleType.deleteMany).toHaveBeenCalledWith({
        where: { makeId: 450 },
      });
      expect(mockTx.vehicleType.createMany).toHaveBeenCalledWith({
        data: [
          { typeId: 3, typeName: 'Truck', makeId: 450 },
          { typeId: 5, typeName: 'Bus', makeId: 450 },
        ],
      });
    });

    it('should log and throw error when database transaction fails', async () => {
      const makeData = {
        makeId: 450,
        makeName: 'Toyota',
        vehicleTypes: [],
      };

      mockPrismaService.$transaction.mockRejectedValueOnce(new Error('DB Connection Failed'));

      await expect(repository.saveMakeWithTypes(makeData)).rejects.toThrow('DB Connection Failed');
    });
  });
});
