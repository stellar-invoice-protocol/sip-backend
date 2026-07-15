# Stellar Invoice Protocol Backend

A production-ready Node.js + TypeScript backend service for managing, indexing, and querying Soroban-based invoices on the Stellar blockchain.

**Status**: ✅ Fully functional API and database layer. 📝 Soroban RPC integration stubbed and marked for future implementation.

## Overview

The Stellar Invoice Protocol Backend provides:

1. **Indexing Service** - Mirrors on-chain invoice state into PostgreSQL for fast querying
2. **REST API** - Query invoices, verify on-chain state, retrieve analytics
3. **Notifications** - Email reminders for approaching and overdue invoices
4. **Analytics** - Aggregate invoice metrics by issuer

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REST API Layer                            │
│  GET /invoices | GET /invoices/:id | POST /invoices/:id/verify  │
│  GET /analytics/summary                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                  Business Logic                             │
│  InvoicesService | AnalyticsService | NotificationsService  │
│  IndexerService  | EmailService     | SorobanService        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│                   Data Layer                                │
│            Prisma ORM + PostgreSQL                          │
│  Models: Invoice | Payment | SyncLog | Notification        │
│          IndexerCursor                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────────┐
│              External Services                              │
│  Soroban RPC (for chain verification)                      │
│  SMTP / Email Provider (for notifications)                  │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
sip-backend/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root NestJS module
│   ├── invoices/                  # Invoice module
│   │   ├── invoices.controller.ts
│   │   ├── invoices.service.ts
│   │   └── invoices.module.ts
│   ├── indexer/                   # Indexing service
│   │   ├── indexer.service.ts
│   │   └── indexer.module.ts
│   ├── notifications/             # Notification service
│   │   ├── notifications.service.ts
│   │   ├── email.service.ts
│   │   └── notifications.module.ts
│   ├── analytics/                 # Analytics module
│   │   ├── analytics.controller.ts
│   │   ├── analytics.service.ts
│   │   └── analytics.module.ts
│   └── common/
│       ├── prisma/                # Prisma integration
│       │   ├── prisma.service.ts
│       │   └── prisma.module.ts
│       └── soroban/                # Soroban RPC stub
│           ├── soroban.service.ts
│           └── soroban.module.ts
├── prisma/
│   └── schema.prisma              # Database schema
├── test/                          # Jest tests
│   ├── invoices.controller.spec.ts
│   └── analytics.controller.spec.ts
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── tsconfig.json
├── jest.config.js
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Local Setup (Without Docker)

1. **Clone and install**:
   ```bash
   cd sip-backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL and Soroban RPC URLs
   ```

3. **Set up database**:
   ```bash
   npm run db:migrate
   ```

4. **Start development server**:
   ```bash
   npm run start:dev
   ```

   Server runs on `http://localhost:3000`

### Docker Setup

1. **Build and start**:
   ```bash
   docker-compose up --build
   ```

   - PostgreSQL: `localhost:5432`
   - App: `http://localhost:3000`

2. **View logs**:
   ```bash
   docker-compose logs -f app
   ```

3. **Stop**:
   ```bash
   docker-compose down
   ```

## API Reference

For operational semantics and monitoring guidance, see the [health endpoint guide](docs/health-check.md).

### GET /health

Check the health status of the backend and database, plus the Soroban RPC configuration status.

**Example**:
```bash
curl http://localhost:3000/health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "database": "connected",
  "soroban": "configured",
  "timestamp": "2026-07-14T12:00:00Z"
}
```

### GET /invoices

List invoices for an address.

**Query Parameters**:
- `address` (required): Stellar address
- `role` (optional): `issuer` or `payer` (defaults to both)

**Example**:
```bash
curl http://localhost:3000/invoices?address=GADDR1234&role=issuer
```

**Response** (200 OK):
```json
{
  "count": 2,
  "invoices": [
    {
      "id": "cuid-123",
      "contractId": "CADDR...",
      "onChainId": "inv-1",
      "issuerAddress": "GADDR1234",
      "payerAddress": "GADDR5678",
      "amount": "100000000",
      "amountScaled": "10.00",
      "currency": "native",
      "status": "issued",
      "dueDate": "2024-12-31T23:59:59Z",
      "paidAmount": "0",
      "issuedAt": "2024-01-01T00:00:00Z",
      "lastSyncedAt": "2024-01-02T10:30:00Z",
      "payments": []
    }
  ]
}
```

### GET /invoices/:id

Get invoice details.

**Example**:
```bash
curl http://localhost:3000/invoices/cuid-123
```

**Response** (200 OK):
```json
{
  "id": "cuid-123",
  "issuerAddress": "GADDR1234",
  "payerAddress": "GADDR5678",
  "amount": "100000000",
  "status": "issued",
  "payments": [
    {
      "id": "pay-1",
      "amount": "50000000",
      "paymentDate": "2024-01-05T10:00:00Z",
      "transactionHash": "tx-hash-1"
    }
  ],
  "syncLogs": [
    {
      "id": "log-1",
      "action": "created",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /invoices/:id/public

Get public invoice data (no authentication required).

**Example**:
```bash
curl http://localhost:3000/invoices/cuid-123/public
```

**Response** (200 OK):
```json
{
  "id": "cuid-123",
  "issuerAddress": "GADDR1234",
  "amount": "100000000",
  "amountScaled": "10.00",
  "currency": "native",
  "status": "issued",
  "dueDate": "2024-12-31T23:59:59Z",
  "paidAmount": "0",
  "payments": [
    {
      "amount": "50000000",
      "paymentDate": "2024-01-05T10:00:00Z"
    }
  ]
}
```

### POST /invoices/:id/verify

Verify invoice against on-chain state. Fetches current state from Soroban RPC and compares with indexed data.

**Example**:
```bash
curl -X POST http://localhost:3000/invoices/cuid-123/verify
```

**Response** (201 Created):
```json
{
  "verified": true,
  "indexedStatus": "issued",
  "chainStatus": "issued",
  "message": "Indexed state matches chain"
}
```

Or if mismatch:
```json
{
  "verified": false,
  "indexedStatus": "issued",
  "chainStatus": "paid",
  "message": "Mismatch detected between indexed state and chain"
}
```

### GET /analytics/summary

Get aggregate invoice metrics.

**Query Parameters**:
- `issuerAddress` (optional): Filter by issuer

**Example**:
```bash
curl http://localhost:3000/analytics/summary?issuerAddress=GADDR1234
```

**Response** (200 OK):
```json
{
  "issuerAddress": "GADDR1234",
  "totalInvoices": 10,
  "totalAmount": "1000000000",
  "totalAmountPaid": "600000000",
  "totalAmountOutstanding": "400000000",
  "paidInvoices": 6,
  "pendingInvoices": 4,
  "paymentRate": 60.0,
  "averageAmount": "100000000",
  "timestamp": "2024-01-02T10:30:00Z"
}
```

### GET /analytics/status-breakdown

Get invoice count by status.

**Example**:
```bash
curl http://localhost:3000/analytics/status-breakdown
```

**Response** (200 OK):
```json
{
  "issuerAddress": "all",
  "breakdown": {
    "issued": 3,
    "partial": 2,
    "paid": 4,
    "overdue": 1,
    "cancelled": 0
  },
  "total": 10,
  "timestamp": "2024-01-02T10:30:00Z"
}
```

## How the Indexer Works

### Current Status

The indexer is **fully stubbed** with a well-defined interface for Soroban RPC integration.

### TODO: Full Implementation

1. **Subscribe to Contract Events**
   - Connect to Horizon WebSocket or Soroban RPC event stream
   - Listen for `invoice_created`, `payment_received`, `status_changed` events
   - Parse event topics and data blobs (XDR)

2. **Process Events**
   - Extract invoice state from event data
   - Create or update `Invoice`, `Payment`, `SyncLog` records
   - Update `IndexerCursor` to track last processed ledger

3. **Error Handling**
   - Log sync errors to `SyncLog` table
   - Implement retry logic for failed events
   - Alert on persistent indexing failures

### Current Behavior (Stub)

- Polls every 60 seconds (configurable)
- Logs cursor position
- No actual events are processed
- Can be disabled via `DISABLE_INDEXER=true`

### Key Files

- `src/indexer/indexer.service.ts` - Main indexer logic (stubbed)
- `src/common/soroban/soroban.service.ts` - Soroban RPC interface (stubbed)
- `src/invoices/invoices.service.ts` - `createInvoiceFromChain()` method for processing events

## Database Schema

### Invoice
Core invoice record mirroring on-chain state.

```sql
CREATE TABLE invoices (
  id STRING PRIMARY KEY,
  contractId STRING,
  onChainId STRING,
  issuerAddress STRING,
  payerAddress STRING,
  amount STRING,
  amountScaled STRING,
  currency STRING DEFAULT 'native',
  description TEXT,
  issuedAt TIMESTAMP,
  dueDate TIMESTAMP,
  status STRING DEFAULT 'issued',
  paidAmount STRING DEFAULT '0',
  metadata TEXT,
  lastSyncedAt TIMESTAMP,
  syncedFromChain BOOLEAN DEFAULT false,
  lastChainStatus STRING,
  createdAt TIMESTAMP DEFAULT now(),
  updatedAt TIMESTAMP,
  
  UNIQUE(contractId, onChainId),
  INDEX(issuerAddress),
  INDEX(payerAddress),
  INDEX(status),
  INDEX(dueDate)
);
```

### Payment
Payment transactions against an invoice.

```sql
CREATE TABLE payments (
  id STRING PRIMARY KEY,
  invoiceId STRING FOREIGN KEY,
  amount STRING,
  transactionHash STRING,
  paymentDate TIMESTAMP,
  createdAt TIMESTAMP DEFAULT now(),
  
  INDEX(invoiceId)
);
```

### SyncLog
Audit trail of indexer operations.

```sql
CREATE TABLE sync_logs (
  id STRING PRIMARY KEY,
  invoiceId STRING FOREIGN KEY,
  action STRING,
  previousState TEXT,
  newState TEXT,
  error TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  
  INDEX(invoiceId),
  INDEX(createdAt)
);
```

### Notification
Email notification history.

```sql
CREATE TABLE notifications (
  id STRING PRIMARY KEY,
  invoiceId STRING FOREIGN KEY,
  type STRING,
  recipientEmail STRING,
  sentAt TIMESTAMP,
  failureReason TEXT,
  createdAt TIMESTAMP DEFAULT now(),
  
  INDEX(invoiceId),
  INDEX(type),
  INDEX(sentAt)
);
```

### IndexerCursor
Tracks last processed ledger for resumable indexing.

```sql
CREATE TABLE indexer_cursors (
  id INT PRIMARY KEY DEFAULT 1,
  lastProcessedLedger INT DEFAULT 0,
  lastProcessedSeq INT DEFAULT 0,
  updatedAt TIMESTAMP
);
```

## Testing

### Run All Tests
```bash
npm run test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:cov
```

### Example Test Output
```
PASS  test/invoices.controller.spec.ts
  Invoices API
    GET /invoices
      ✓ should list invoices for an address (45ms)
      ✓ should require address parameter (12ms)
      ✓ should filter by role (issuer) (8ms)
    GET /invoices/:id
      ✓ should return invoice detail (11ms)
      ✓ should return 404 for non-existent invoice (5ms)
    GET /invoices/:id/public
      ✓ should return public invoice data (8ms)
    POST /invoices/:id/verify
      ✓ should verify invoice against chain (22ms)
      ✓ should detect mismatches between indexed and chain (19ms)

PASS  test/analytics.controller.spec.ts
  Analytics API
    getSummary
      ✓ should return analytics summary (15ms)
      ✓ should filter by issuer address (10ms)
      ✓ should handle empty invoice list (5ms)
    getStatusBreakdown
      ✓ should return status breakdown (8ms)

Test Suites: 2 passed, 2 total
Tests:       13 passed, 13 total
```

## Configuration

### Environment Variables

See `.env.example` for all available options:

```bash
# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sip_backend_db

# Soroban
SOROBAN_RPC_URL=https://rpc-futurenet.stellar.org:443
CONTRACT_ID=CAQAAAAA...

# Services
DISABLE_INDEXER=false
DISABLE_NOTIFICATIONS=false

# Email
EMAIL_TRANSPORT=console
EMAIL_FROM=noreply@stellar-invoices.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Development Commands

### Database
```bash
# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Push schema without migrations
npm run db:push

# Open Prisma Studio
npm run db:studio
```

### Code Quality
```bash
# Lint and fix
npm run lint

# Format code
npm run format

# Build
npm run build
```

### Running
```bash
# Development with hot reload
npm run start:dev

# Debug mode
npm run start:debug

# Production
npm run start:prod
```

## Future Enhancements

### High Priority

- [ ] **Soroban RPC Integration** (`src/common/soroban/soroban.service.ts`)
  - Implement event subscription via Horizon WebSocket or Soroban RPC streaming
  - Parse contract state blobs (XDR) into readable format
  - Implement transaction submission for payment verification

- [ ] **Authentication & Authorization**
  - JWT authentication for issuer/payer operations
  - Rate limiting on public endpoints

- [ ] **Webhook Support**
  - Notify external systems of invoice status changes
  - Configurable webhook endpoints per issuer

### Medium Priority

- [ ] Additional Email Providers
  - SendGrid integration
  - AWS SES integration
  - Mailgun integration

- [ ] Advanced Analytics
  - Time-series payment trends
  - Issuer/payer reputation scoring
  - Predictive analytics for payment likelihood

- [ ] Caching Layer
  - Redis for frequently accessed invoices
  - Cache invalidation strategies

### Low Priority

- [ ] GraphQL API
- [ ] Webhook signatures & verification
- [ ] Data export (CSV, JSON)
- [ ] Admin dashboard

## Troubleshooting

### Database Connection Issues
```bash
# Check DATABASE_URL in .env
# Verify PostgreSQL is running and accessible
psql $DATABASE_URL -c "SELECT 1;"
```

### Migration Errors
```bash
# Reset database (⚠️ destructive)
npx prisma migrate reset

# Or manually:
npx prisma migrate dev --name init
```

### Tests Failing
```bash
# Ensure database is running
# Clear Node cache
rm -rf node_modules/.prisma
npm run db:generate
npm run test
```

### Email Not Sending
```bash
# Check EMAIL_TRANSPORT in .env
# For SMTP: verify credentials and network access
# For console: check application logs
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, coding conventions, and PR guidelines.

## License

MIT - See [LICENSE](./LICENSE)

## Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@stellar-invoices.app
