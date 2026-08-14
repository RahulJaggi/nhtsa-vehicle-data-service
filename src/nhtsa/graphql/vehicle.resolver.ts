import { Resolver, Query, Args, Int } from '@nestjs/graphql';
import { VehicleService } from './vehicle.service';
import { Make } from './vehicle.types';

@Resolver(() => Make)
export class VehicleResolver {
  constructor(private readonly vehicleService: VehicleService) {}

  @Query(() => [Make], {
    name: 'makes',
    description: 'Retrieves all vehicle makes stored in the database with optional pagination.',
  })
  async getMakes(
    @Args('skip', { type: () => Int, nullable: true, description: 'Number of records to skip' })
    skip?: number,
    @Args('take', { type: () => Int, nullable: true, description: 'Number of records to take (limit)' })
    take?: number,
  ): Promise<any[]> {
    return this.vehicleService.getMakes(skip, take);
  }

  @Query(() => Make, {
    name: 'make',
    description: 'Retrieves a single vehicle make by its unique makeId.',
  })
  async getMake(
    @Args('makeId', { type: () => Int, description: 'The unique vehicle make ID from NHTSA' })
    makeId: number,
  ): Promise<any> {
    return this.vehicleService.getMakeById(makeId);
  }
}
