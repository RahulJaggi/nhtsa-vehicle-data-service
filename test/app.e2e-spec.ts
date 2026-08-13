import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('GraphQL: makes query (returns list of makes)', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query {
            makes(take: 2) {
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
        expect(res.body.data.makes).toBeDefined();
        expect(res.body.data.makes.length).toBeLessThanOrEqual(2);
        if (res.body.data.makes.length > 0) {
          const make = res.body.data.makes[0];
          expect(make.makeId).toBeDefined();
          expect(make.makeName).toBeDefined();
          expect(make.vehicleTypes).toBeDefined();
        }
      });
  });

  it('GraphQL: make(makeId) query (returns single make or 404)', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query {
            make(makeId: 12858) {
              makeId
              makeName
            }
          }
        `,
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeDefined();
        if (res.body.errors) {
          // If makeId doesn't exist, it should fail with a 404 not found error
          expect(res.body.errors[0].message).toContain('not found');
        } else {
          expect(res.body.data.make.makeId).toBe(12858);
          expect(res.body.data.make.makeName).toBe('#1 ALPINE CUSTOMS');
        }
      });
  });

  it('GraphQL: make(makeId) query (non-existent 404 error)', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: `
          query {
            make(makeId: 999999) {
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

  afterEach(async () => {
    await app.close();
  });
});
