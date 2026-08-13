# NHTSA Vehicle Data Service

A production-grade NestJS microservice that ingests vehicle make and type data from the [NHTSA vPIC API](https://vpic.nhtsa.dot.gov/api/), persists it to PostgreSQL via Prisma, and exposes it through a GraphQL API.

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Architecture](#2-architecture)
3. [Features](#3-features)
4. [Technology Stack](#4-technology-stack)
5. [Project Structure](#5-project-structure)
6. [Prerequisites](#6-prerequisites)
7. [Local Setup](#7-local-setup)
8. [Environment Variables](#8-environment-variables)
9. [Database](#9-database)
10. [Data Ingestion](#10-data-ingestion)
11. [GraphQL API](#11-graphql-api)
12. [Logging](#12-logging)
13. [Error Handling](#13-error-handling)
14. [Testing](#14-testing)
15. [Docker](#15-docker)
16. [Troubleshooting](#16-troubleshooting)
17. [Common Commands](#17-common-commands)
18. [End-to-End Usage](#18-end-to-end-usage)
19. [Configuration and Operational Notes](#19-configuration-and-operational-notes)

---

## 1. Application Overview

The NHTSA Vehicle Data Service fetches raw XML data from the NHTSA vPIC (Vehicle Product Information Catalog) API, parses and transforms it, and persists vehicle makes and their associated vehicle types into a PostgreSQL database. Clients can then query this data through a GraphQL API.

**Main Data Flow:**

```
NHTSA vPIC API (XML)
  → HTTP Client with retry logic
  → XML Parser
  → Data Transformer
  → Ingestion Orchestrator
  → Repository (upsert transactions)
  → PostgreSQL via Prisma
```

Ingestion is triggered explicitly via a standalone CLI command and is never triggered automatically on application startup.

---

## 2. Architecture

### Write Path — Data Ingestion

```mermaid
flowchart LR
    A[NHTSA XML API] --> B[NhtsaClientService\nHTTP + Retry]
    B --> C[XmlParserService\nfast-xml-parser]
    C --> D[NhtsaTransformerService\nStructured DTOs]
    D --> E[NhtsaIngestionService\nConcurrency Pool]
    E --> F[MakesRepository\nUpsert Transaction]
    F --> G[PrismaService\nPg Adapter]
    G --> H[(PostgreSQL)]
```

### Read Path — GraphQL Queries

```mermaid
flowchart LR
    A[GraphQL Client] --> B[VehicleResolver\n@Query]
    B --> C[VehicleService]
    C --> D[MakesRepository\nfindMany / findByMakeId]
    D --> E[PrismaService]
    E --> F[(PostgreSQL)]
```

---

## 3. Features

| Feature | Description |
|---|---|
| **XML Ingestion** | Fetches raw XML from NHTSA vPIC API via HTTP with timeout and retry logic |
| **XML Parsing** | Parses NHTSA XML responses using `fast-xml-parser` |
| **Data Transformation** | Normalises raw parsed data into typed, clean domain objects |
| **PostgreSQL Persistence** | Upserts makes and vehicle types inside atomic Prisma transactions |
| **GraphQL API** | Code-first GraphQL schema exposing `makes` (paginated) and `make` (by ID) queries |
| **Structured Logging** | JSON logs via Pino with context, level, and redaction of sensitive fields |
| **Error Handling** | Typed exceptions for HTTP errors, timeouts, network failures, XML parse errors, and DB errors |
| **Configuration Validation** | Joi schema validates all required environment variables at startup |
| **Unit & E2E Testing** | Jest unit tests with mocked dependencies; E2E integration tests against a real test database |
| **Docker Support** | Multi-stage Alpine Docker build; Docker Compose stack with PostgreSQL healthcheck and auto-migration |
| **CLI Ingestion Command** | Standalone ingestion script runnable without the HTTP server; accepts an optional make limit |

---

## 4. Technology Stack

| Category | Technology | Version |
|---|---|---|
| Runtime | Node.js | 22 |
| Framework | NestJS | ^11.0.1 |
| Language | TypeScript | ^5.7.3 |
| GraphQL Server | Apollo Server + NestJS GraphQL | ^5.5.1 / ^13.4.4 |
| ORM | Prisma | ^7.9.1 |
| Database Driver | `pg` (node-postgres) | ^8.23.0 |
| Prisma Adapter | `@prisma/adapter-pg` | ^7.9.1 |
| XML Parser | fast-xml-parser | ^5.10.1 |
| Logger | Pino | ^10.3.1 |
| Config Validation | Joi | ^18.2.3 |
| Testing | Jest + ts-jest + Supertest | ^30.0.0 / ^29.2.5 / ^7.0.0 |
| Container | Docker + Docker Compose | — |
| Database | PostgreSQL | 15 |

---

## 5. Project Structure

```
nhtsa-vehicle-data-service/
├── src/
│   ├── app.module.ts          # Root NestJS module; wires ConfigModule and NhtsaModule
│   ├── main.ts                # HTTP server bootstrap with graceful shutdown
│   ├── cli/
│   │   └── ingest.ts          # Standalone CLI entrypoint for data ingestion
│   ├── config/
│   │   ├── configuration.ts   # Typed configuration factory (reads env vars)
│   │   └── validation.ts      # Joi schema for startup environment validation
│   ├── logger/
│   │   ├── logger.module.ts   # Global NestJS logger module
│   │   └── pino-logger.service.ts  # Pino JSON logger implementation
│   ├── nhtsa/
│   │   ├── nhtsa.module.ts          # Feature module wiring all NHTSA services
│   │   ├── nhtsa-client.service.ts  # HTTP client with retry and timeout
│   │   ├── nhtsa-exceptions.ts      # Typed exception hierarchy (HTTP/Timeout/Network)
│   │   ├── xml-parser.service.ts    # XML parsing using fast-xml-parser
│   │   ├── xml-parse.exception.ts   # Typed XML parse exception
│   │   ├── nhtsa-transformer.service.ts  # Raw parsed data → typed domain objects
│   │   ├── nhtsa-ingestion.service.ts    # Orchestrates ingestion with concurrency pool
│   │   ├── makes.repository.ts           # Prisma upsert and query repository
│   │   ├── vehicle.service.ts            # Business logic for GraphQL reads
│   │   ├── vehicle.resolver.ts           # GraphQL resolver (queries)
│   │   └── vehicle.types.ts             # GraphQL ObjectType definitions
│   └── prisma/
│       └── prisma.service.ts    # PrismaClient with pg pool adapter lifecycle management
├── prisma/
│   ├── schema.prisma            # Database schema (Make, VehicleType models)
│   └── migrations/              # Prisma migration history
├── test/
│   ├── app.e2e-spec.ts          # E2E integration tests against nhtsa_test_db
│   └── jest-e2e.json            # E2E Jest configuration
├── Dockerfile                   # Multi-stage production Docker image
├── docker-compose.yml           # PostgreSQL + backend service definitions
├── prisma.config.js             # Prisma CLI configuration (JS, native Node.js)
└── .env.example                 # Example environment variables (copy to .env)
```

---

## 6. Prerequisites

### Local Development

- **Node.js** >= 22
- **npm** >= 10
- **PostgreSQL** >= 13 running locally
- A `.env` file configured from `.env.example`

### Docker

- **Docker** >= 24
- **Docker Compose** >= 2
- No local PostgreSQL installation required (provided by Docker Compose)

---

## 7. Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/nhtsa-vehicle-data-service.git
cd nhtsa-vehicle-data-service

# 2. Install dependencies
npm install

# 3. Create your local environment file
cp .env.example .env

# 4. Edit .env and set your local DATABASE_URL
#    Example: postgresql://youruser:yourpassword@localhost:5432/nhtsa_db

# 5. Create the database (if it does not exist)
createdb nhtsa_db

# 6. Apply Prisma migrations to set up the schema
npx prisma migrate deploy

# 7. Start the application in development mode (with hot-reload)
npm run start:dev
```

The application starts on **http://localhost:3000** by default.  
The GraphQL Playground is available at **http://localhost:3000/graphql**.

---

## 8. Environment Variables

All variables are validated at startup using Joi. The application will refuse to start if any required variable is missing or invalid.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Required** | — | PostgreSQL connection string. Example: `postgresql://user:pass@localhost:5432/nhtsa_db` |
| `NODE_ENV` | Optional | `development` | Application environment. One of: `development`, `production`, `test`, `provision` |
| `PORT` | Optional | `3000` | HTTP port the NestJS server listens on |
| `NHTSA_BASE_URL` | Optional | `https://vpic.nhtsa.dot.gov/api` | NHTSA vPIC API base URL |
| `NHTSA_GET_ALL_MAKES_URL` | Optional | `https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes` | Full URL for the GetAllMakes endpoint |
| `NHTSA_VEHICLE_TYPES_URL` | Optional | `https://vpic.nhtsa.dot.gov/api/vehicles/GetVehicleTypesForMakeId` | Base URL for GetVehicleTypesForMakeId endpoint |
| `NHTSA_TIMEOUT` | Optional | `5000` | HTTP request timeout in milliseconds |
| `NHTSA_MAX_RETRIES` | Optional | `3` | Maximum number of retry attempts per NHTSA request |
| `NHTSA_CONCURRENCY` | Optional | `5` | Maximum number of concurrent make ingestion tasks |
| `LOG_LEVEL` | Optional | `log` | Log level. One of: `log`, `error`, `warn`, `debug`, `verbose`, `fatal` |

> **Note:** `DATABASE_URL` is never logged. Sensitive fields (`password`, `secret`, `token`, `key`, `apiKey`) are automatically redacted to `[REDACTED]` in all log output.

---

## 9. Database

### Technology

- **PostgreSQL 15** as the data store
- **Prisma 7** as the ORM with `@prisma/adapter-pg` for native `node-postgres` pool integration

### Models

#### `Make`

Represents a vehicle manufacturer as registered in the NHTSA database.

| Column | Type | Description |
|---|---|---|
| `id` | `Int` (PK, autoincrement) | Internal surrogate key |
| `makeId` | `Int` (unique) | NHTSA-assigned make ID |
| `makeName` | `String` | Manufacturer name |
| `createdAt` | `DateTime` | Record creation timestamp |
| `updatedAt` | `DateTime` | Record last-updated timestamp |

Index on `makeName`.

#### `VehicleType`

Represents a vehicle category (e.g., Passenger Car, Truck) associated with a make.

| Column | Type | Description |
|---|---|---|
| `id` | `Int` (PK, autoincrement) | Internal surrogate key |
| `typeId` | `Int` | NHTSA-assigned vehicle type ID |
| `typeName` | `String` | Vehicle type name |
| `makeId` | `Int` (FK → `Make.makeId`) | Foreign key to the parent make |
| `createdAt` | `DateTime` | Record creation timestamp |
| `updatedAt` | `DateTime` | Record last-updated timestamp |

Unique constraint on `(makeId, typeId)`. Index on `makeId`. Cascade delete from `Make`.

### Relationships

- `Make` has many `VehicleType` (one-to-many)
- `VehicleType` belongs to one `Make` (cascade delete on parent removal)

### Migrations

```bash
# Apply all pending migrations (safe for production)
npx prisma migrate deploy

# Create a new migration during development
npx prisma migrate dev --name <migration_name>

# View current migration status
npx prisma migrate status

# Open Prisma Studio to browse data
npx prisma studio
```

---

## 10. Data Ingestion

Ingestion is triggered manually via the CLI command. It is **never** triggered automatically on application startup.

### Ingestion Flow

```
1. NhtsaClientService     → GET /vehicles/getallmakes (XML)
2. XmlParserService       → Parse raw XML string into a JS object
3. NhtsaTransformerService → Extract Make_ID and Make_Name arrays
4. For each make (with concurrency pooling):
   a. NhtsaClientService  → GET /vehicles/GetVehicleTypesForMakeId/{makeId} (XML)
   b. XmlParserService    → Parse vehicle types XML
   c. NhtsaTransformerService → Extract VehicleTypeID and VehicleTypeName arrays
   d. NhtsaIngestionService → Combine make + types
   e. MakesRepository     → Upsert make + delete/re-create types (inside one transaction)
5. Return { total, succeeded, failed } summary
```

### Ingestion Command

```bash
# Ingest all makes (full sync — may take several minutes)
npm run ingest

# Ingest only the first N makes (useful for testing or incremental loads)
npm run ingest -- 10
npm run ingest -- 2
```

The command exits with code `0` on full success and `1` if any makes failed during ingestion or if the ingestion itself threw a critical error.

### Idempotency

Each ingestion run is fully idempotent. Makes are upserted (created or updated), and their vehicle types are deleted and re-created atomically inside a database transaction.

---

## 11. GraphQL API

### Endpoint

```
POST http://localhost:3000/graphql
```

The Apollo Server GraphQL Playground is available at the same URL via a browser.

### Queries

#### `makes` — List all makes with optional pagination

```graphql
query {
  makes(skip: 0, take: 10) {
    id
    makeId
    makeName
    vehicleTypes {
      typeId
      typeName
    }
    createdAt
    updatedAt
  }
}
```

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `skip` | `Int` | No | Number of records to skip (offset pagination) |
| `take` | `Int` | No | Maximum number of records to return |

#### `make` — Retrieve a single make by NHTSA make ID

```graphql
query {
  make(makeId: 440) {
    id
    makeId
    makeName
    vehicleTypes {
      typeId
      typeName
    }
    createdAt
    updatedAt
  }
}
```

**Arguments:**

| Argument | Type | Required | Description |
|---|---|---|---|
| `makeId` | `Int` | **Yes** | The NHTSA-assigned vehicle make ID |

### GraphQL Types

```graphql
type Make {
  id: Int!
  makeId: Int!
  makeName: String!
  vehicleTypes: [VehicleType!]!
  createdAt: String!
  updatedAt: String!
}

type VehicleType {
  id: Int!
  typeId: Int!
  typeName: String!
  makeId: Int!
  createdAt: String!
  updatedAt: String!
}
```

### Example curl Request

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ makes(take: 5) { makeId makeName vehicleTypes { typeName } } }"}'
```

---

## 12. Logging

All logs are emitted as structured JSON using **Pino** and implement the NestJS `LoggerService` interface.

### Log Format

```json
{
  "level": "info",
  "time": "2026-08-13T20:39:51.000Z",
  "pid": 12345,
  "hostname": "server-01",
  "context": "NhtsaIngestionService",
  "msg": "Ingestion completed. Total processed: 500, Succeeded: 498, Failed: 2"
}
```

### Log Levels

| NestJS Level | Pino Level | Usage |
|---|---|---|
| `log` | `info` | Normal operational events |
| `error` | `error` | Errors that affect functionality |
| `warn` | `warn` | Recoverable issues (e.g., per-make retry or failure) |
| `debug` | `debug` | Detailed per-request tracing |
| `verbose` | `trace` | Highly granular internal state |

### What Gets Logged

- Application startup and graceful shutdown
- Each NHTSA HTTP request (URL, attempt number, response size)
- HTTP retry attempts with backoff delay and error reason
- Terminal HTTP failures after all retries exhausted
- XML parse errors
- Per-make ingestion success and failure with make ID and name
- Overall ingestion summary (total, succeeded, failed)
- Database transaction errors with make ID context
- GraphQL resolver activity (debug level)

### Safe Logging

The following fields are automatically redacted to `[REDACTED]` in all log output regardless of source:

`DATABASE_URL`, `databaseUrl`, `database.url`, `password`, `secret`, `token`, `key`, `apiKey`

Stack traces are never forwarded to GraphQL clients in production or test environments.

---

## 13. Error Handling

### NHTSA HTTP Client

| Error Type | Class | Behaviour |
|---|---|---|
| Non-2xx HTTP response | `NhtsaHttpException` | Retried up to `NHTSA_MAX_RETRIES` times with exponential backoff (1s, 2s, 4s, …) |
| Request timeout | `NhtsaTimeoutException` | Retried up to `NHTSA_MAX_RETRIES` times |
| Network / connection error | `NhtsaNetworkException` | Retried up to `NHTSA_MAX_RETRIES` times |
| All retries exhausted | Any of the above | Logged at `error` level and exception is thrown to the caller |

### XML Parsing

Invalid XML or unexpected structure causes a typed exception that is caught by the ingestion service. Critical parse failures on the makes response abort the entire run. Per-make vehicle type parse failures are logged as warnings and counted in the `failed` tally without halting other makes.

### Database Errors

All Prisma transaction errors are caught in `MakesRepository`, logged with the make ID and error message at `error` level, and re-thrown to the ingestion service which counts them as failures.

### GraphQL Errors

In `production` and `test` environments, the `formatError` handler strips stack traces and internal error details before returning errors to clients. Clients receive a safe, sanitised error message with no internal state exposure.

---

## 14. Testing

### Unit Tests

Unit tests use Jest with all external dependencies (NHTSA HTTP client, Prisma, ConfigService) mocked via `jest.fn()`. No real network or database connections are made.

```bash
# Run all unit tests
npm run test

# Run unit tests with code coverage report
npm run test:cov

# Run unit tests in watch mode
npm run test:watch
```

**Test Suites:**

| File | What it tests |
|---|---|
| `nhtsa-client.service.spec.ts` | HTTP retry logic, timeout handling, error classification |
| `xml-parser.service.spec.ts` | XML parsing, malformed input handling |
| `nhtsa-transformer.service.spec.ts` | Makes and vehicle types transformation, edge cases |
| `nhtsa-ingestion.service.spec.ts` | Ingestion orchestration, concurrency, partial failure handling |
| `makes.repository.spec.ts` | Repository upsert logic, database error propagation |
| `app.controller.spec.ts` | Root controller health check |

### E2E Integration Tests

E2E tests boot a full NestJS application context against a dedicated **`nhtsa_test_db`** PostgreSQL database. NHTSA HTTP calls are intercepted and replaced with mock XML responses — no real API calls are made.

The tests verify:
- Ingestion persists `Make` and `VehicleType` records correctly
- GraphQL `makes` query returns paginated results
- GraphQL `make` query returns a single record by ID
- GraphQL `make` query returns `null` for a non-existent ID
- Test data is cleaned up after each test

```bash
# Run E2E tests (requires nhtsa_test_db PostgreSQL database)
npm run test:e2e

# Run E2E tests serially (recommended to avoid connection race conditions)
npm run test:e2e -- --runInBand
```

**E2E Database Setup:**

```bash
# Create the test database
createdb nhtsa_test_db

# Apply migrations to the test database
DATABASE_URL=postgresql://youruser@localhost:5432/nhtsa_test_db npx prisma migrate deploy
```

---

## 15. Docker

The Docker setup uses a **multi-stage build** (Node 22 Alpine):
- **Stage 1 (build):** Installs all dependencies, generates Prisma client, compiles TypeScript, then prunes dev dependencies.
- **Stage 2 (runtime):** Copies only `dist/`, `node_modules/`, `prisma/`, and `prisma.config.js`. Runs as a non-root `node` user.

On container start, Prisma migrations are applied automatically before the application boots.

### Environment Configuration

Create a `.env` file in the project root (based on `.env.example`) before running Docker Compose. Docker Compose reads this file for `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`:

```bash
# .env (example values — change before use)
POSTGRES_DB=nhtsa_db
POSTGRES_USER=nhtsa_user
POSTGRES_PASSWORD=secure_db_password
LOG_LEVEL=info
```

### Commands

```bash
# Build the Docker images
docker compose build

# Build without cache (force clean rebuild)
docker compose build --no-cache

# Start all services (PostgreSQL + backend) in detached mode
docker compose up -d

# Start and follow logs
docker compose up

# Stop all services (preserves volumes)
docker compose down

# Stop and remove all volumes (destroys database data)
docker compose down -v

# View backend container logs
docker compose logs -f backend

# View PostgreSQL container logs
docker compose logs -f db
```

### Running Ingestion Inside Docker

```bash
# Ingest all makes inside the running backend container
docker compose exec backend node dist/cli/ingest.js

# Ingest a limited number of makes
docker compose exec backend node dist/cli/ingest.js 10
```

### Service Details

| Service | Container Name | Port | Notes |
|---|---|---|---|
| PostgreSQL | `nhtsa-db` | `5432` | Healthcheck via `pg_isready`; backend waits for healthy status |
| NestJS Backend | `nhtsa-backend` | `3000` | Starts only after db is healthy; runs migrations on boot |

### Persistent Volume

PostgreSQL data is stored in the Docker named volume **`nhtsa_pgdata`**. Data persists across container restarts and is only removed when running `docker compose down -v`.

### Accessing GraphQL in Docker

```
http://localhost:3000/graphql
```

---

## 16. Troubleshooting

### Port 3000 Already in Use

```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

Or change the `PORT` environment variable in `.env`.

### PostgreSQL Not Healthy / Backend Keeps Restarting

```bash
# Check PostgreSQL container health status
docker compose ps

# Check PostgreSQL logs
docker compose logs db

# Verify pg_isready manually inside the container
docker compose exec db pg_isready -U $POSTGRES_USER -d $POSTGRES_DB
```

### Missing or Invalid Environment Variables

The application logs a validation error and refuses to start. Check that all required variables (especially `DATABASE_URL`) are present in your `.env` file.

```bash
# Verify .env is present
cat .env

# Test DATABASE_URL connection locally
psql "$DATABASE_URL" -c "SELECT 1;"
```

### Prisma Migration Problems

```bash
# Check migration status
npx prisma migrate status

# Reset and re-apply all migrations (DESTRUCTIVE — development only)
npx prisma migrate reset

# Apply pending migrations only
npx prisma migrate deploy
```

### Backend Container Exits After Start

```bash
# Inspect the backend exit logs
docker compose logs backend

# Common causes:
# - DATABASE_URL is wrong or db container is not yet healthy
# - Prisma migration failed
# - Missing environment variable caught by Joi validation
```

### Empty Database After Ingestion

Check whether the ingestion command completed with exit code 0:

```bash
docker compose exec backend node dist/cli/ingest.js 5
echo "Exit code: $?"
```

If exit code is `1`, check logs for API or database errors.

---

## 17. Common Commands

```bash
# --- Development ---
npm run start:dev          # Start with hot-reload
npm run start:debug        # Start with Node.js debugger attached
npm run build              # Compile TypeScript to dist/
npm run start:prod         # Run compiled production build locally
npm run format             # Auto-format all source and test files with Prettier
npm run lint               # Lint and auto-fix all TypeScript files

# --- Ingestion ---
npm run ingest             # Ingest all NHTSA makes
npm run ingest -- 10       # Ingest first 10 makes only

# --- Testing ---
npm run test               # Run all unit tests
npm run test:cov           # Run unit tests with coverage report
npm run test:watch         # Run unit tests in watch mode
npm run test:e2e           # Run E2E integration tests
npm run test:e2e -- --runInBand  # Run E2E tests serially

# --- Database ---
npx prisma migrate deploy  # Apply pending migrations
npx prisma migrate status  # Show migration status
npx prisma studio          # Open Prisma data browser GUI
npx prisma generate        # Re-generate Prisma client after schema changes
```

---

## 18. End-to-End Usage

This walkthrough demonstrates the complete flow from a fresh state.

### Step 1 — Start the Application

```bash
# Local development
npm run start:dev

# OR with Docker
docker compose up -d
```

Wait for the log line:
```
{"level":"info","msg":"Application is running on: http://localhost:3000"}
```

### Step 2 — Ingest Data

```bash
# Ingest a small batch to verify the pipeline
npm run ingest -- 5
```

Expected log output:
```json
{"level":"info","context":"NhtsaIngestionService","msg":"Starting ingestion flow..."}
{"level":"info","context":"NhtsaIngestionService","msg":"Found 5 makes to process."}
{"level":"info","context":"NhtsaIngestionService","msg":"Ingestion completed. Total processed: 5, Succeeded: 5, Failed: 0"}
{"level":"info","context":"IngestCLI","msg":"CLI Ingestion completed successfully","total":5,"succeeded":5,"failed":0}
```

### Step 3 — Query GraphQL

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ makes(take: 3) { makeId makeName vehicleTypes { typeName } } }"
  }'
```

### Step 4 — Verify Response

```json
{
  "data": {
    "makes": [
      {
        "makeId": 440,
        "makeName": "ASTON MARTIN",
        "vehicleTypes": [
          { "typeName": "Passenger Car" }
        ]
      },
      {
        "makeId": 441,
        "makeName": "TESLA",
        "vehicleTypes": [
          { "typeName": "Passenger Car" },
          { "typeName": "Multipurpose Passenger Vehicle (MPV)" }
        ]
      }
    ]
  }
}
```

---

## 19. Configuration and Operational Notes

### HTTP Client Behaviour

- **Timeout:** Each NHTSA request times out after `NHTSA_TIMEOUT` ms (default: 5000ms). The timeout is enforced via `AbortController`.
- **Retries:** Failed requests are retried up to `NHTSA_MAX_RETRIES` times (default: 3) with exponential backoff: 1s, 2s, 4s.
- **Retry scope:** Applies to HTTP errors (non-2xx), timeouts, and network connection failures.

### Ingestion Concurrency

- Makes are processed concurrently using a bounded pool of size `NHTSA_CONCURRENCY` (default: 5).
- A per-make failure (API error, parse error, DB error) is counted in the `failed` tally and logged as a warning. It does not halt processing of remaining makes.
- A critical failure fetching or parsing the initial makes list aborts the entire run.

### Persistence Behaviour

- Make upsert: If the make already exists, only `makeName` is updated.
- Vehicle types: All existing types for a make are deleted and replaced in the same transaction to ensure the data matches the current NHTSA state.
- All persistence operations are idempotent — repeated ingestion runs produce the same database state.

### Graceful Shutdown

The NestJS application registers OS signal handlers (`SIGTERM`, `SIGINT`) for graceful shutdown. On shutdown, the Prisma client disconnects and the `node-postgres` pool is drained before the process exits.

### GraphQL Error Safety

In `production` and `test` environments, `formatError` strips internal exception details and stack traces. Clients receive only a safe error message. In development, full error details are returned to assist debugging.
