# Testing & Deployment Instructions

## Prerequisites
- Docker & Docker Compose
- Node.js 18+

## Running Unit Tests
Unit tests cover core logic and do not require external services.
```bash
npm test
```

## Running End-to-End (E2E) Tests
E2E tests require the full stack (Redis, Postgres, Unified Inventory Service) to be running.

### 1. Start the Stack
```bash
docker-compose up -d --build
```
*Note: Services will be available on ports 5435 (Postgres), 4001 (Promising Engine), and 3001 (Unified Inventory).*

### 2. Wait for Services
Ensure all containers are healthy. You can check status with:
```bash
docker-compose ps
```

### 3. Run E2E Tests
```bash
npm run test:e2e
```

## Docker Build
To build the image manually:
```bash
docker build -t beamlytics-promising-engine .
```
