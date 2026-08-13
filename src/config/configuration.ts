export default () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  nhtsa: {
    baseUrl: process.env.NHTSA_BASE_URL || 'https://vpic.nhtsa.dot.gov/api',
    getAllMakesUrl: process.env.NHTSA_GET_ALL_MAKES_URL || 'https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes',
    vehicleTypesUrl: process.env.NHTSA_VEHICLE_TYPES_URL || 'https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleTypesForMakeId',
    timeout: parseInt(process.env.NHTSA_TIMEOUT || '5000', 10),
    maxRetries: parseInt(process.env.NHTSA_MAX_RETRIES || '3', 10),
    concurrency: parseInt(process.env.NHTSA_CONCURRENCY || '5', 10),
  },
  logLevel: process.env.LOG_LEVEL || 'log',
});