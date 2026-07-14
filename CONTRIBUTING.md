# Contributing to Stellar Invoice Protocol Backend

Thank you for your interest in contributing! This guide will help you get started with local development and submitting pull requests.

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Git

### Initial Setup

1. **Fork and clone**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/sip-backend.git
   cd sip-backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local database URL
   # DATABASE_URL=postgresql://localhost/sip_backend_dev
   ```

4. **Initialize database**:
   ```bash
   npm run db:migrate
   ```

5. **Verify setup**:
   ```bash
   npm run lint
   npm run test
   ```

   All tests should pass.

### Docker Development

Prefer Docker for a consistent environment:

```bash
docker-compose up --build
docker-compose exec app npm run test
```

## Development Workflow

### Creating a Branch

Use descriptive branch names:

```bash
# Feature
git checkout -b feature/invoice-pagination

# Bug fix
git checkout -b fix/indexer-race-condition

# Documentation
git checkout -b docs/api-examples
```

### Running Code

**Development mode** (hot reload):
```bash
npm run start:dev
```

Server runs on `http://localhost:3000`

**Watch tests**:
```bash
npm run test:watch
```

**Database studio** (browse/edit data):
```bash
npm run db:studio
```

### Making Changes

#### TypeScript Best Practices

- Use strict types (no `any` unless documented)
- Prefer interfaces over types
- Add comments for non-obvious logic
- Use descriptive variable names

#### Example - Adding an Endpoint

1. **Add to schema if needed** (`prisma/schema.prisma`):
   ```prisma
   model InvoiceComment {
     id        String    @id @default(cuid())
     invoiceId String
     invoice   Invoice   @relation(fields: [invoiceId], references: [id])
     text      String
     createdAt DateTime  @default(now())
     
     @@index([invoiceId])
   }
   ```

2. **Create migration**:
   ```bash
   npm run db:migrate -- --name add_invoice_comments
   ```

3. **Add service method** (`src/invoices/invoices.service.ts`):
   ```typescript
   async addComment(invoiceId: string, text: string) {
     return this.prisma.invoiceComment.create({
       data: {
         invoiceId,
         text,
       },
     });
   }
   ```

4. **Add controller endpoint** (`src/invoices/invoices.controller.ts`):
   ```typescript
   @Post(':id/comments')
   async addComment(@Param('id') id: string, @Body() dto: CreateCommentDto) {
     return this.invoicesService.addComment(id, dto.text);
   }
   ```

5. **Write tests** (`test/invoices.controller.spec.ts`):
   ```typescript
   it('should add comment to invoice', async () => {
     mockPrismaService.invoiceComment.create.mockResolvedValue({
       id: 'comment-1',
       invoiceId: 'inv-1',
       text: 'Payment received',
     });
     
     const response = await request(app.getHttpServer())
       .post('/invoices/inv-1/comments')
       .send({ text: 'Payment received' })
       .expect(201);
       
     expect(response.body.text).toBe('Payment received');
   });
   ```

6. **Update documentation** (README.md if public API)

### Code Quality

#### Linting

```bash
npm run lint
```

Fixes most issues automatically. Common rules:
- Unused imports: removed automatically
- Semicolons: added automatically
- Quote style: enforced (single quotes)
- Trailing commas: added automatically

#### Formatting

```bash
npm run format
```

Uses Prettier. No configuration needed.

#### Testing

All new code must have tests:

```bash
# Run tests
npm run test

# Watch mode (recommended during development)
npm run test:watch

# Coverage
npm run test:cov
```

**Test patterns**:

- **Unit tests**: Service methods, utilities
- **Integration tests**: Controller endpoints (mock Prisma)
- **Mock Prisma**: `jest.fn()` for all database calls

**Example**:
```typescript
describe('InvoicesService', () => {
  let service: InvoicesService;

  const mockPrismaService = {
    invoice: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch invoice by id', async () => {
    const mockInvoice = { id: 'inv-1', status: 'issued' };
    mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

    const result = await service.getInvoiceDetail('inv-1');

    expect(result).toEqual(mockInvoice);
    expect(mockPrismaService.invoice.findUnique).toHaveBeenCalledWith({
      where: { id: 'inv-1' },
      include: { payments: true, syncLogs: { take: 10 } },
    });
  });
});
```

### Building

```bash
npm run build
```

Output goes to `dist/`. This is the production build used in Docker.

## Coding Conventions

### File Organization

```typescript
// 1. Imports (external, then internal)
import { Injectable } from '@nestjs/common';
import { MyService } from './my.service';

// 2. Types/Interfaces
interface MyDto {
  id: string;
}

// 3. Class definition
@Injectable()
export class MyService {
  // 4. Constructor
  constructor(private prisma: PrismaService) {}

  // 5. Public methods
  async getItem(id: string) {
    return this.prisma.item.findUnique({ where: { id } });
  }

  // 6. Private methods
  private validate(data: any) {
    // validation logic
  }
}
```

### Naming

- **Classes**: PascalCase (`UserService`, `InvoiceController`)
- **Functions/Methods**: camelCase (`getUserById`, `sendEmail`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Files**: kebab-case (`user.service.ts`, `invoice.controller.ts`)
- **Database models**: PascalCase (follows Prisma schema)

### Error Handling

```typescript
// ✅ Good
import { NotFoundException, BadRequestException } from '@nestjs/common';

async getInvoice(id: string) {
  const invoice = await this.prisma.invoice.findUnique({ where: { id } });
  
  if (!invoice) {
    throw new NotFoundException(`Invoice ${id} not found`);
  }
  
  if (invoice.status === 'cancelled') {
    throw new BadRequestException('Cannot modify cancelled invoice');
  }
  
  return invoice;
}

// ❌ Avoid
async getInvoice(id: string) {
  try {
    return await this.prisma.invoice.findUnique({ where: { id } });
  } catch (error) {
    return null; // Swallows errors
  }
}
```

### Logging

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  async doSomething() {
    this.logger.log('Starting operation');
    this.logger.debug('Detailed info', { data: 'value' });
    this.logger.warn('Something unexpected');
    this.logger.error('Operation failed', error);
  }
}
```

## Submitting a Pull Request

### Before Submitting

1. **Update from main**:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. **Run full check**:
   ```bash
   npm run lint
   npm run test
   npm run build
   ```

3. **Commit with clear message**:
   ```bash
   git commit -m "Add invoice pagination to list endpoint"
   ```

### Creating the PR

1. Push your branch:
   ```bash
   git push origin feature/invoice-pagination
   ```

2. Open PR on GitHub with:
   - **Title**: Descriptive (e.g., "feat: Add invoice pagination")
   - **Description**: Explain what and why
   - **Checklist**:
     - [ ] Tests added/updated
     - [ ] Documentation updated
     - [ ] Linting passes
     - [ ] All tests pass

### Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:
```
feat(invoices): Add pagination support to list endpoint

- Implement offset/limit pagination
- Add tests for pagination
- Update API documentation

Closes #123
```

```
fix(indexer): Prevent race condition in sync cursor update

Use database transaction to atomically update cursor and events.

Fixes #456
```

## Working on TODOs

Several features are marked as TODO. These are good starting points:

- **Soroban RPC Integration** (`src/common/soroban/soroban.service.ts`)
  - Implement event subscription
  - Parse XDR contract state
  - Submit transactions for payment verification

- **Email Providers** (`src/notifications/email.service.ts`)
  - Add SendGrid support
  - Add AWS SES support

- **Authentication** (`src/invoices/invoices.controller.ts`)
  - Add JWT guards to endpoints
  - Implement API keys for issuers

To work on a TODO:

1. Create a GitHub issue with the TODO title
2. Create a branch: `git checkout -b feature/soroban-integration`
3. Update the TODO to remove it when complete
4. Document any new environment variables in `.env.example`
5. Update README if user-facing

## Troubleshooting Development

### Module not found errors

```bash
# Regenerate Prisma client
npm run db:generate

# Clear cache
rm -rf node_modules/.prisma
```

### Tests failing due to database

```bash
# Reset database
npm run db:migrate -- --force-reset

# Or with Docker
docker-compose down -v
docker-compose up --build
```

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 npm run start:dev
```

## Getting Help

- Check existing issues and discussions
- Read the README thoroughly
- Ask in GitHub Discussions
- Review similar code in the codebase
- Look at test files for usage examples

## Code Review Process

When you submit a PR:

1. **Automated checks** run (CI pipeline)
   - Linting
   - Tests
   - Build

2. **Code review** (maintainer)
   - Design feedback
   - Best practices
   - Performance considerations

3. **Requested changes**
   - Make updates
   - Commit and push (no force push)
   - Re-request review

4. **Approval and merge**
   - Squash and merge to main
   - Close associated issues

## Releasing

Maintainers only. Follow semver:

```bash
# Patch: bug fixes (1.0.1)
# Minor: new features (1.1.0)
# Major: breaking changes (2.0.0)

git tag v1.0.0
git push origin v1.0.0
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
