import { Injectable } from '@nestjs/common';

export interface TransformedVehicleType {
  typeId: number;
  typeName: string;
}

export interface TransformedMake {
  makeId: number;
  makeName: string;
  vehicleTypes: TransformedVehicleType[];
}

@Injectable()
export class NhtsaTransformerService {
  transformMakes(parsedAllMakes: any): { makeId: number; makeName: string }[] {
    if (!parsedAllMakes?.Response?.Results) {
      return [];
    }

    const rawMakes = parsedAllMakes.Response.Results.AllVehicleMakes;
    if (!rawMakes) {
      return [];
    }

    // NHTSA returns a single object instead of an array when there's only one result
    const makesArray = Array.isArray(rawMakes) ? rawMakes : [rawMakes];
    const transformed: { makeId: number; makeName: string }[] = [];

    for (const rawMake of makesArray) {
      if (!rawMake) {
        continue;
      }
      const makeIdStr = rawMake.Make_ID;
      const makeName = rawMake.Make_Name;

      if (makeIdStr === undefined || makeIdStr === null || makeName === undefined || makeName === null) {
        continue;
      }

      // fast-xml-parser may parse numeric strings as numbers already, handle both
      const makeId = typeof makeIdStr === 'number' ? makeIdStr : parseInt(String(makeIdStr).trim(), 10);
      if (isNaN(makeId)) {
        continue;
      }

      transformed.push({
        makeId,
        makeName: String(makeName).trim(),
      });
    }

    return transformed;
  }

  transformVehicleTypes(parsedVehicleTypes: any): TransformedVehicleType[] {
    if (!parsedVehicleTypes?.Response?.Results) {
      return [];
    }

    const rawTypes = parsedVehicleTypes.Response.Results.VehicleTypesForMakeIds;
    if (!rawTypes) {
      return [];
    }

    // same single-vs-array edge case as in transformMakes
    const typesArray = Array.isArray(rawTypes) ? rawTypes : [rawTypes];
    const transformed: TransformedVehicleType[] = [];

    for (const rawType of typesArray) {
      if (!rawType) {
        continue;
      }
      // NHTSA uses VehicleTypeID in some responses and VehicleTypeId in others
      const typeIdStr = rawType.VehicleTypeID ?? rawType.VehicleTypeId;
      const typeName = rawType.VehicleTypeName;

      if (typeIdStr === undefined || typeIdStr === null || typeName === undefined || typeName === null) {
        continue;
      }

      const typeId = typeof typeIdStr === 'number' ? typeIdStr : parseInt(String(typeIdStr).trim(), 10);
      if (isNaN(typeId)) {
        continue;
      }

      transformed.push({
        typeId,
        typeName: String(typeName).trim(),
      });
    }

    return transformed;
  }

  combineMakeAndTypes(
    make: { makeId: number; makeName: string },
    vehicleTypes: TransformedVehicleType[],
  ): TransformedMake {
    return {
      makeId: make.makeId,
      makeName: make.makeName,
      vehicleTypes: vehicleTypes || [],
    };
  }
}
