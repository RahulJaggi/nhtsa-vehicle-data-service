import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  NHTSA_BASE_URL: Joi.string()
    .uri()
    .default('https://vpic.nhtsa.dot.gov/api'),
  NHTSA_GET_ALL_MAKES_URL: Joi.string()
    .uri()
    .default('https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json'),
  NHTSA_VEHICLE_TYPES_URL: Joi.string()
    .uri()
    .default('https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleTypesForMakeId'),
  LOG_LEVEL: Joi.string()
    .valid('log', 'error', 'warn', 'debug', 'verbose', 'fatal')
    .default('log'),
  NHTSA_TIMEOUT: Joi.number().integer().min(0).default(5000),
  NHTSA_MAX_RETRIES: Joi.number().integer().min(0).default(3),
  NHTSA_CONCURRENCY: Joi.number().integer().min(1).default(5),
});