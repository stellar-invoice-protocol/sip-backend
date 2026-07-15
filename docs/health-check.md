# Health Endpoint Guide

The health endpoint exposes a compact snapshot of the API's database health and Soroban RPC configuration.

## Request

Send a `GET` request to `/health`; the endpoint does not require a request body.

The endpoint currently returns HTTP `200` for both healthy and unhealthy database states.

Clients should inspect the response body instead of relying only on the HTTP status code.

## Overall status

`status` is `healthy` when the database query succeeds.

`status` is `unhealthy` when the database query fails.

Soroban configuration does not currently change the overall `status` value.

## Database status

`database: connected` means the service completed a `SELECT 1` query.

`database: disconnected` means that query threw an error.

The response intentionally omits the database error message to avoid exposing internal details.

## Soroban status

`configured` means `SOROBAN_RPC_URL` is present and parses as a URL.

`not_configured` means `SOROBAN_RPC_URL` is absent.

`invalid_rpc_url` means the configured value is not a valid URL.

`configured` does not prove that the remote RPC service is reachable.

A future live RPC probe may introduce a separate connectivity status.

## Timestamp

`timestamp` is generated in ISO 8601 UTC format for every response.

Consumers can use the timestamp to detect stale cached responses.

The endpoint does not intentionally cache its result.

## Example request

```bash
curl --fail-with-body http://localhost:3000/health
```

The default local port is `3000`, unless `PORT` overrides it.

## Example response

```json
{
  "status": "healthy",
  "database": "connected",
  "soroban": "configured",
  "timestamp": "2026-07-15T00:00:00.000Z"
}
```

Response field names are stable, but consumers should tolerate additional fields.

## Configuration

Set `SOROBAN_RPC_URL` in `.env` to expose the `configured` status.

The value must include a URL scheme such as `https://`.

Restart the application after changing `.env` so the service reads the new value.

The database status uses the connection configured by `DATABASE_URL`.

## Docker Compose

The Compose application container probes `/health` with `curl`.

The probe runs every 30 seconds after a 10-second startup delay.

Three consecutive probe failures mark the application container unhealthy.

Because the route returns `200` for database failures, the current Compose probe checks process availability rather than database readiness.

## Monitoring

Alert when `database` remains `disconnected` across repeated checks.

Do not interpret `soroban: configured` as an RPC latency or availability signal.

Record the response timestamp with monitoring samples to simplify incident timelines.

Use a short client timeout so a stalled process is detected even when no response is returned.

## Security

The payload contains status labels only and does not include credentials.

Keep database URLs and RPC credentials out of health responses and monitoring logs.

Review network exposure before making the unauthenticated endpoint publicly reachable.

## Verification

The endpoint integration tests live in `test/health.controller.spec.ts`.

Run the health tests with `npm test -- --runInBand test/health.controller.spec.ts`.

Run `npm run build` to verify the controller and service compile.
