# Hotel Aggregator Backend

A TypeScript/Express API that requests mock hotel offers from two suppliers in parallel through a Temporal workflow, selects the cheapest offer per hotel, and caches the result in a Redis sorted set. Price range queries are served by Redis `ZRANGEBYSCORE`.

## Run with Docker Compose

Requirements: Docker Desktop with Compose.

```sh
docker compose up --build
```

The first startup may take a minute while Temporal initializes its PostgreSQL schema. The API is available at `http://localhost:3000`; Temporal gRPC is exposed on port `7233`.

```sh
curl 'http://localhost:3000/api/hotels?city=delhi'
curl 'http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=6000'
curl 'http://localhost:3000/health'
```

Import `postman/hotel-aggregator.postman_collection.json` into Postman for the full request set. The Supplier A and Supplier B requests include Postman tests for HTTP 200, JSON array shape, required hotel fields, and the shared `Taj Hotel` and `Radison` names.

## Endpoints

- `GET /api/hotels?city=<city>&minPrice=<number>&maxPrice=<number>` — aggregates on a cache miss, then queries the Redis sorted set. Prices are inclusive.
- `GET /supplierA/hotels?city=<city>` and `GET /supplierB/hotels?city=<city>` — deterministic mock suppliers. Delhi data contains shared hotels (including Taj Hotel, Radison, ITC Maurya, The Oberoi, The Leela Palace, and Hyatt Regency) plus supplier-only hotels (including Lemon Tree, Park Plaza, Holtin, and Bloom Hotel).
- `GET /health` — reports Redis, Temporal, and both supplier endpoint states; responds `503` if any dependency is unavailable.

Missing/blank city, negative/non-numeric prices, and `minPrice > maxPrice` return `400`. Unknown cities return `[]`. Workflow activity failures are retried three times with exponential backoff, then returned as `502` by the API.

## Architecture

Express validates requests and checks a short-lived cache marker. On a miss, it starts `hotelAggregationWorkflow`. The Temporal worker runs two HTTP-fetch activities concurrently; the workflow merges by normalized city and hotel name, choosing the lowest price. Express persists those offers to `hotels:<city>` as sorted-set members scored by price. A separate marker key records even an empty result so unknown cities are cached too. Every result, including the first response after aggregation, is read from Redis with `ZRANGEBYSCORE`.

## Local development

Choose one run mode at a time. For normal use, run the complete stack with the Docker Compose command above; Docker installs dependencies and builds the app inside its container. You do not also need to run `npm install` or `npm run dev`.

For code changes with hot reload, run only Redis and Temporal in Docker, then run the Node app directly on your computer:

```sh
docker compose up -d redis temporal-db temporal
npm install
cp .env.example .env
npm run dev
```

When running the app locally, the default service addresses in `.env.example` point to the Docker services through localhost. Stop the development server with `Ctrl+C`; stop its supporting services with `docker compose down`.

To simulate a supplier outage in the full Compose setup, add `SUPPLIER_A_FAIL=true` or `SUPPLIER_B_FAIL=true` under the app service environment, then recreate the app with `docker compose up --build app`.
