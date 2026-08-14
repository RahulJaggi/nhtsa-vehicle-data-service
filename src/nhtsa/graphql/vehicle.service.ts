import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { MakesRepository } from '../repository/makes.repository';

@Injectable()
export class VehicleService {
  private readonly logger = new Logger(VehicleService.name);

  constructor(private readonly repository: MakesRepository) {}

  async getMakes(skip?: number, take?: number): Promise<any[]> {
    try {
      this.logger.debug(`Retrieving makes (skip: ${skip}, take: ${take})`);
      return await this.repository.findMany(skip, take);
    } catch (error: any) {
      this.logger.error(`Error retrieving makes: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An error occurred while fetching makes from database');
    }
  }

  async getMakeById(makeId: number): Promise<any> {
    let make: any;
    try {
      this.logger.debug(`Retrieving make by ID: ${makeId}`);
      make = await this.repository.findByMakeId(makeId);
    } catch (error: any) {
      this.logger.error(`Error retrieving make by ID ${makeId}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('An error occurred while fetching the make from database');
    }

    if (!make) {
      throw new NotFoundException(`Vehicle make with ID ${makeId} was not found`);
    }

    return make;
  }
}
