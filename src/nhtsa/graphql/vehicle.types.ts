import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'A vehicle type associated with a make' })
export class VehicleType {
  @Field(() => Int, { description: 'The unique auto-incrementing ID in the database' })
  id: number;

  @Field(() => Int, { description: 'The unique vehicle type ID from NHTSA' })
  typeId: number;

  @Field({ description: 'The name of the vehicle type' })
  typeName: string;

  @Field(() => Int, { description: 'The foreign key make ID referencing the Make record' })
  makeId: number;

  @Field({ description: 'The timestamp of record creation' })
  createdAt: Date;

  @Field({ description: 'The timestamp of record last update' })
  updatedAt: Date;
}

@ObjectType({ description: 'A vehicle make record containing general details and types' })
export class Make {
  @Field(() => Int, { description: 'The unique auto-incrementing ID in the database' })
  id: number;

  @Field(() => Int, { description: 'The unique vehicle make ID from NHTSA' })
  makeId: number;

  @Field({ description: 'The name of the vehicle make' })
  makeName: string;

  @Field(() => [VehicleType], { description: 'List of vehicle types associated with this make' })
  vehicleTypes: VehicleType[];

  @Field({ description: 'The timestamp of record creation' })
  createdAt: Date;

  @Field({ description: 'The timestamp of record last update' })
  updatedAt: Date;
}
