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
  /**
   * Transforms a parsed GetAllMakes XML response object into an array of makes.
   */
  transformMakes(parsedAllMakes: any): { makeId: number; makeName: string }[] {
    if (!parsedAllMakes?.Response?.Results) {
      return [];
    }

    const rawMakes = parsedAllMakes.Response.Results.AllVehicleMakes;
    if (!rawMakes) {
      return [];
    }

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

  /**
   * Transforms a parsed GetVehicleTypesForMakeId XML response object into an array of vehicle types.
   */
  transformVehicleTypes(parsedVehicleTypes: any): TransformedVehicleType[] {
    if (!parsedVehicleTypes?.Response?.Results) {
      return [];
    }

    const rawTypes = parsedVehicleTypes.Response.Results.VehicleTypesForMakeIds;
    if (!rawTypes) {
      return [];
    }

    const typesArray = Array.isArray(rawTypes) ? rawTypes : [rawTypes];
    const transformed: TransformedVehicleType[] = [];

    for (const rawType of typesArray) {
      if (!rawType) {
        continue;
      }
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

  /**
   * Combines makes and their respective vehicle types into the final structured output.
   */
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
