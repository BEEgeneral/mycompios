# Tests

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest tests/unit/services.test.ts
```

## Test Structure

```
tests/
├── api/
│   └── health.test.ts    # API endpoint tests
└── unit/
    └── services.test.ts    # Service unit tests
```

## CI/CD

Tests run automatically on push to main via GitHub Actions or Vercel.
