import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransformedMake } from '../transformer/nhtsa-transformer.service';

@Injectable()
export class MakesRepository {
  private readonly logger = new Logger(MakesRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // everything in one transaction — if types fail, make doesn't get saved either
  async saveMakeWithTypes(makeData: TransformedMake): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        // upsert so re-running ingestion doesn't blow up on duplicates
        await tx.make.upsert({
          where: { makeId: makeData.makeId },
          update: { makeName: makeData.makeName },
          create: {
            makeId: makeData.makeId,
            makeName: makeData.makeName,
          },
        });

        // wipe old types first — easier than diffing, and NHTSA data can change
        await tx.vehicleType.deleteMany({
          where: { makeId: makeData.makeId },
        });

        if (makeData.vehicleTypes && makeData.vehicleTypes.length > 0) {
          // dedupe by typeId just in case NHTSA sends duplicates in the response
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

  // always eager-load vehicle types to avoid N+1 on the GraphQL side
  async findMany(skip?: number, take?: number): Promise<any[]> {
    return this.prisma.make.findMany({
      skip,
      take,
      include: {
        vehicleTypes: true,
      },
      orderBy: {
        makeId: 'asc',
      },
    });
  }

  async findByMakeId(makeId: number): Promise<any | null> {
    return this.prisma.make.findUnique({
      where: { makeId },
      include: {
        vehicleTypes: true,
      },
    });
  }
}
