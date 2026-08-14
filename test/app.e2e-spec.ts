import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { NhtsaIngestionService } from './../src/nhtsa/ingestion/nhtsa-ingestion.service';
import { PrismaService } from './../src/prisma/prisma.service';

describe('NHTSA E2E Ingestion and GraphQL Flow (e2e)', () => {
  let app: INestApplication<App>;
  let mockFetch: jest.Mock;
  let originalFetch: any;

  beforeAll(async () => {
    // 1. Force database to use the test database
    process.env.DATABASE_URL = 'postgresql://rahuljaggi@localhost:5432/nhtsa_test_db';

    // 2. Setup mock global fetch
    originalFetch = global.fetch;
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(console);
    await app.init();
  });

  afterEach(async () => {
    // Clean up test data after each test to ensure isolation.
    // Cascade delete on makeId in PostgreSQL will automatically clear vehicle types.
    const prisma = app.get(PrismaService);
    await prisma.make.deleteMany({});
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('should execute end-to-end: Ingest -> Parse -> Transform -> Persist -> GraphQL Query', async () => {
    // 1. Setup mocked API XML responses
    const mockMakesXml = `
      <Response>
        <Count>2</Count>
        <Message>Response returned successfully</Message>
        <Results>
          <AllVehicleMakes>
            <Make_ID>9901</Make_ID>
            <Make_Name>Test Make A</Make_Name>
          </AllVehicleMakes>
          <AllVehicleMakes>
            <Make_ID>9902</Make_ID>
            <Make_Name>Test Make B</Make_Name>
          </AllVehicleMakes>
        </Results>
      </Response>
    `;

    const mockTypesXmlA = `
      <Response>
        <Count>1</Count>
        <Message>Response returned successfully</Message>
        <Results>
          <VehicleTypesForMakeIds>
            <VehicleTypeId>10</VehicleTypeId>
            <VehicleTypeName>Car</VehicleTypeName>
          </VehicleTypesForMakeIds>
        </Results>
      </Response>
    `;

    const mockTypesXmlB = `
      <Response>
        <Count>1</Count>
        <Message>Response returned successfully</Message>
        <Results>
          <VehicleTypesForMakeIds>
            <VehicleTypeId>20</VehicleTypeId>
            <VehicleTypeName>Truck</VehicleTypeName>
          </VehicleTypesForMakeIds>
        </Results>
      </Response>
    `;

    // Fetch makes XML, then fetch vehicle types for 9901, then fetch vehicle types for 9902
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockMakesXml),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockTypesXmlA),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockTypesXmlB),
      });

    // 2. Run Ingestion Service
    const ingestionService = app.get(NhtsaIngestionService);
    const stats = await ingestionService.ingest();

    expect(stats).toEqual({
      total: 2,
      succeeded: 2,
      failed: 0,
    });

    // 3. Verify PostgreSQL Persistence
    const prisma = app.get(PrismaService);
    const dbMakes = await prisma.make.findMany({
      include: { vehicleTypes: true },
      orderBy: { makeId: 'asc' },
    });

    expect(dbMakes).toHaveLength(2);
    expect(dbMakes[0].makeId).toBe(9901);
    expect(dbMakes[0].makeName).toBe('Test Make A');
    expect(dbMakes[0].vehicleTypes).toHaveLength(1);
    expect(dbMakes[0].vehicleTypes[0].typeId).toBe(10);
    expect(dbMakes[0].vehicleTypes[0].typeName).toBe('Car');

    expect(dbMakes[1].makeId).toBe(9902);
    expect(dbMakes[1].makeName).toBe('Test Make B');
    expect(dbMakes[1].vehicleTypes).toHaveLength(1);
    expect(dbMakes[1].vehicleTypes[0].typeId).toBe(20);
    expect(dbMakes[1].vehicleTypes[0].typeName).toBe('Truck');

    // 4. Query GraphQL makes list
    await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query {
            makes {
              makeId
              makeName
              vehicleTypes {
                typeId
                typeName
              }
            }
          }
        `,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeDefined();
        const makes = res.body.data.makes;
        expect(makes).toHaveLength(2);
        expect(makes[0].makeId).toBe(9901);
        expect(makes[0].makeName).toBe('Test Make A');
        expect(makes[0].vehicleTypes).toHaveLength(1);
        expect(makes[0].vehicleTypes[0].typeId).toBe(10);
        expect(makes[0].vehicleTypes[0].typeName).toBe('Car');
      });

    // 5. Query GraphQL single make
    await request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query {
            make(makeId: 9902) {
              makeId
              makeName
              vehicleTypes {
                typeId
                typeName
              }
            }
          }
        `,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeDefined();
        const make = res.body.data.make;
        expect(make.makeId).toBe(9902);
        expect(make.makeName).toBe('Test Make B');
        expect(make.vehicleTypes).toHaveLength(1);
        expect(make.vehicleTypes[0].typeId).toBe(20);
        expect(make.vehicleTypes[0].typeName).toBe('Truck');
      });
  });

  it('GraphQL: make(makeId) query (non-existent 404 error)', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query {
            make(makeId: 888888) {
              makeId
              makeName
            }
          }
        `,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.errors).toBeDefined();
        expect(res.body.errors[0].message).toContain('not found');
      });
  });
});
