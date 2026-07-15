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
