import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransformedMake } from './nhtsa-transformer.service';

@Injectable()
export class MakesRepository {
  private readonly logger = new Logger(MakesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a make and its associated vehicle types inside a transaction.
   * Performs upsert operations so it is idempotent.
   */
  async saveMakeWithTypes(makeData: TransformedMake): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // 1. Upsert the Make parent record
        await tx.make.upsert({
          where: { makeId: makeData.makeId },
          update: { makeName: makeData.makeName },
          create: {
            makeId: makeData.makeId,
            makeName: makeData.makeName,
          },
        });

        // 2. Clear old vehicle types for this make (since they are 1:N)
        await tx.vehicleType.deleteMany({
          where: { makeId: makeData.makeId },
        });

        // 3. Create the new vehicle types
        if (makeData.vehicleTypes && makeData.vehicleTypes.length > 0) {
          // Remove duplicates inside payload if any
          const uniqueTypesMap = new Map<number, string>();
          for (const vt of makeData.vehicleTypes) {
            uniqueTypesMap.set(vt.typeId, vt.typeName);
          }

          const insertData = Array.from(uniqueTypesMap.entries()).map(([typeId, typeName]) => ({
            typeId,
            typeName,
            makeId: makeData.makeId,
          }));

          await tx.vehicleType.createMany({
            data: insertData,
          });
        }
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to persist Make ID ${makeData.makeId} with types. Error: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
