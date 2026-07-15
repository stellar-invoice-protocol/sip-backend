# Health Endpoint Guide

The health endpoint exposes a compact snapshot of the API's database health and Soroban RPC configuration.

+## Request

Send a `GET` request to `/health`; the endpoint does not require a request body.

+The endpoint currently returns HTTP `200` for both healthy and unhealthy database states.
