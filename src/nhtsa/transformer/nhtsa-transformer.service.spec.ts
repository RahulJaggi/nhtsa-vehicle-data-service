import { Test, TestingModule } from '@nestjs/testing';
import { NhtsaTransformerService } from './nhtsa-transformer.service';

describe('NhtsaTransformerService', () => {
  let service: NhtsaTransformerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NhtsaTransformerService],
    }).compile();

    service = module.get<NhtsaTransformerService>(NhtsaTransformerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transformMakes()', () => {
    it('should transform an array of raw makes successfully', () => {
      const parsedAllMakes = {
        Response: {
          Results: {
            AllVehicleMakes: [
              { Make_ID: 12858, Make_Name: 'Alpine Customs' },
              { Make_ID: '4877', Make_Name: '1/Off Kustoms' },
            ],
          },
        },
      };

      const result = service.transformMakes(parsedAllMakes);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ makeId: 12858, makeName: 'Alpine Customs' });
      expect(result[1]).toEqual({ makeId: 4877, makeName: '1/Off Kustoms' });
    });

    it('should handle a single raw make parsed as an object', () => {
      const parsedAllMakes = {
        Response: {
          Results: {
            AllVehicleMakes: { Make_ID: 12858, Make_Name: 'Alpine Customs' },
          },
        },
      };

      const result = service.transformMakes(parsedAllMakes);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ makeId: 12858, makeName: 'Alpine Customs' });
    });

    it('should ignore malformed or missing fields', () => {
      const parsedAllMakes = {
        Response: {
          Results: {
            AllVehicleMakes: [
              { Make_ID: 'invalid-number', Make_Name: 'Bad ID' },
              { Make_ID: 4877 },
              { Make_Name: 'Missing ID' },
              { Make_ID: 12858, Make_Name: 'Good One' },
            ],
          },
        },
      };

      const result = service.transformMakes(parsedAllMakes);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ makeId: 12858, makeName: 'Good One' });
    });

    it('should return empty array if no makes exist', () => {
      expect(service.transformMakes(null)).toEqual([]);
      expect(service.transformMakes({})).toEqual([]);
      expect(service.transformMakes({ Response: {} })).toEqual([]);
      expect(service.transformMakes({ Response: { Results: {} } })).toEqual([]);
    });
  });

  describe('transformVehicleTypes()', () => {
    it('should transform an array of vehicle types with both ID casings', () => {
      const parsedVehicleTypes = {
        Response: {
          Results: {
            VehicleTypesForMakeIds: [
              { VehicleTypeId: 3, VehicleTypeName: 'Truck' },
              { VehicleTypeID: 5, VehicleTypeName: 'Bus' },
            ],
          },
        },
      };

      const result = service.transformVehicleTypes(parsedVehicleTypes);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ typeId: 3, typeName: 'Truck' });
      expect(result[1]).toEqual({ typeId: 5, typeName: 'Bus' });
    });

    it('should handle a single vehicle type parsed as an object', () => {
      const parsedVehicleTypes = {
        Response: {
          Results: {
            VehicleTypesForMakeIds: { VehicleTypeId: 3, VehicleTypeName: 'Truck' },
          },
        },
      };

      const result = service.transformVehicleTypes(parsedVehicleTypes);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ typeId: 3, typeName: 'Truck' });
    });

    it('should ignore malformed vehicle types', () => {
      const parsedVehicleTypes = {
        Response: {
          Results: {
            VehicleTypesForMakeIds: [
              { VehicleTypeId: 'not-a-number', VehicleTypeName: 'Bad ID' },
              { VehicleTypeId: 3 },
              { VehicleTypeName: 'Missing ID' },
              { VehicleTypeId: 5, VehicleTypeName: 'Bus' },
            ],
          },
        },
      };

      const result = service.transformVehicleTypes(parsedVehicleTypes);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ typeId: 5, typeName: 'Bus' });
    });
  });

  describe('combineMakeAndTypes()', () => {
    it('should combine a make and vehicle types correctly', () => {
      const make = { makeId: 450, makeName: 'Toyota' };
      const vehicleTypes = [
        { typeId: 3, typeName: 'Truck' },
        { typeId: 5, typeName: 'Bus' },
      ];

      const result = service.combineMakeAndTypes(make, vehicleTypes);
      expect(result).toEqual({
        makeId: 450,
        makeName: 'Toyota',
        vehicleTypes: [
          { typeId: 3, typeName: 'Truck' },
          { typeId: 5, typeName: 'Bus' },
        ],
      });
    });
  });
});
