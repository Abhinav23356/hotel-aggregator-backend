# Hotel Aggregator Backend

This is a small demo API that compares hotel prices from two mock suppliers. It picks the cheapest offer for each hotel and lets you search by city and price range. It does not make bookings, and the hotel prices are sample data.

## Start the app

You need Docker Desktop with Docker Compose. From this folder, run:

```sh
docker compose up --build
```

Docker builds the Node app and starts it with Redis and Temporal. The first startup can take a few minutes while Docker downloads images and Temporal sets up its database.

When the app is ready, it runs at <http://localhost:3000>. Keep this Terminal window open while using the app. To stop the containers, press `Ctrl+C` or run `docker compose down` from another Terminal window.

## Try it with Postman

1. In Postman, choose **Import**.
2. Select `postman/hotel-aggregator.postman_collection.json` from this project.
3. Send **Health** first. The response should say `"status":"ok"`.
4. Send **Supplier A - Delhi (checks overlap)** and **Supplier B - Delhi (checks overlap)**. Their tests check the response format and confirm that both suppliers list Taj Hotel and Radison.
5. Send **Hotels - Delhi** to see the cheapest offer for each hotel.
6. Send **Hotels - Delhi price range** to see offers from ₹5,000 through ₹6,000.

The collection also includes requests for an unknown city and invalid query parameters.

## API requests

You can also try these URLs in a browser or with `curl`:

```text
GET http://localhost:3000/api/hotels?city=delhi
GET http://localhost:3000/api/hotels?city=delhi&minPrice=5000&maxPrice=6000
GET http://localhost:3000/supplierA/hotels?city=delhi
GET http://localhost:3000/supplierB/hotels?city=delhi
GET http://localhost:3000/health
```

A hotel found at both suppliers appears once, with the cheaper offer selected. For example, Taj Hotel is returned from Supplier B at ₹5,500; Radison is returned from Supplier A at ₹5,900. Hotels found at only one supplier, such as Lemon Tree or Holtin, are included too.

The hotel endpoint accepts optional `minPrice` and `maxPrice` values. Both ends of the range are included. The API returns `400` if the city is missing, a price is invalid, or the minimum is greater than the maximum. An unknown city returns an empty array.

## How it works

1. Express checks the request and looks for recent results in Redis.
2. If there is no cached result, it starts a Temporal workflow.
3. Temporal asks Supplier A and Supplier B for offers at the same time.
4. The workflow keeps the lowest price for each hotel name.
5. The result is saved in a Redis sorted set. Price searches use Redis `ZRANGEBYSCORE`, so the app does not load every hotel and filter them in Node.js.

Results are cached for five minutes. Temporal tries a failed supplier activity up to three times; if it still fails, the API returns an error.

## Sample data

Supplier data is hardcoded in `src/suppliers/data.ts`. Delhi includes shared listings such as Taj Hotel, Radison, ITC Maurya, The Oberoi, The Leela Palace, and Hyatt Regency. It also includes hotels listed by just one supplier, such as Lemon Tree, Park Plaza, Holtin, and Bloom Hotel.

The supplier endpoints accept an optional `city` query parameter. Without it, they return their full sample lists.

## Run the app directly during development

The Docker command above is all you need for normal use. If you are changing code and want hot reload, run only the supporting services in Docker and run the Node app on your computer instead:

```sh
docker compose up -d redis temporal-db temporal
npm install
cp .env.example .env
npm run dev
```

Use this development mode instead of starting the `app` container too. Stop the Node app with `Ctrl+C`, then stop the supporting services with:

```sh
docker compose down
```

To simulate a supplier outage in the full Docker setup, set `SUPPLIER_A_FAIL=true` or `SUPPLIER_B_FAIL=true` under the `app` service in `docker-compose.yml`, then run `docker compose up --build` again.
