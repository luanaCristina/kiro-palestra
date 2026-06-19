# Tech Stack & Commands

## Runtime & Language

- **Runtime**: Node.js
- **Language**: TypeScript (strict mode, target ES2020, commonjs modules)
- **Module system**: CommonJS (`"type": "commonjs"`)

## Frameworks & Libraries

- **Web framework**: Express 4.x
- **Database**: PostgreSQL via `pg` (raw SQL, no ORM)
- **Validation**: Zod schemas
- **ID generation**: `uuid` (v4)
- **Config**: `dotenv` for environment variables

## Testing

- **Test runner**: Jest with ts-jest
- **HTTP testing**: Supertest
- **Property-based testing**: fast-check
- Test file conventions:
  - Unit tests: `*.test.ts`
  - Property tests: `*.property.test.ts`

## Common Commands

```bash
# Development
npm run dev          # Start with ts-node
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled output

# Testing
npm test             # Run all tests (--run-in-band)
npm run test:watch   # Watch mode
npm run test:coverage # With coverage report

# Database
npm run migrate      # Run SQL migrations
```

## Environment Variables

| Variable      | Default                  |
|---------------|--------------------------|
| DB_HOST       | localhost                |
| DB_PORT       | 5432                     |
| DB_NAME       | appointment_scheduling   |
| DB_USER       | postgres                 |
| DB_PASSWORD   | postgres                 |
| PORT          | 3000                     |

## TypeScript Path Alias

- `@/*` maps to `src/*` (configured in both tsconfig.json and jest.config.ts)
