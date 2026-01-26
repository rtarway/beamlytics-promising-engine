# Deployment & Verification Plan

## 1. Automated Testing Strategy

### Unit & Integration Tests
I have created robust test suites for both services.

#### Unified Inventory Service
- **Location**: `unified-inventory-service/tests/InventoryService.test.ts`
- **Coverage**:
    - Aggregation of Redis (Live) and Postgres (Future) data.
    - **New**: Validation of `HARD` reservation enforcement (Application Layer Locking).
- **Run Command**:
    ```bash
    cd unified-inventory-service
    npm test
    ```

#### Beamlytics Promising Engine
- **Location**: `beamlytics-promising-engine/tests/`
- **Coverage**:
    - `PromisingAgent.test.ts`: verifying AI Strategy derivation.
    - **New**: `FuturePromising.test.ts`: Integration scenario verifying that the engine correctly promises against inbound ASNs when On-Hand is zero.
- **Run Command**:
    ```bash
    cd beamlytics-promising-engine
    npm test
    ```

## 2. Containerization (Docker)

### Dockerfile: Unified Inventory Service
Create `unified-inventory-service/Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Dockerfile: Promising Engine
Create `beamlytics-promising-engine/Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

## 3. Orchestration (Docker Compose)

Use this `docker-compose.yml` for local development and e2e verification.

```yaml
version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
      POSTGRES_DB: inventory_future
    ports:
      - "5432:5432"

  kafka:
    image: confluentinc/cp-kafka:latest
    environment:
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181

  unified-inventory:
    build: ./unified-inventory-service
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://admin:password@postgres:5432/inventory_future
      - KAFKA_BROKERS=kafka:9092
    depends_on:
      - redis
      - postgres

  promising-engine:
    build: ./beamlytics-promising-engine
    environment:
      - INVENTORY_SERVICE_URL=http://unified-inventory:3000
    depends_on:
      - unified-inventory
```

## 4. Kubernetes Deployment

For production, apply the following manifests (simplified).

### Unified Inventory Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unified-inventory
spec:
  replicas: 3
  selector:
    matchLabels:
      app: unified-inventory
  template:
    metadata:
      labels:
        app: unified-inventory
    spec:
      containers:
      - name: main
        image: my-registry/unified-inventory:latest
        envFrom:
        - configMapRef:
            name: inventory-config
        - secretRef:
            name: inventory-secrets
```

### Horizontal Pod Autoscaling (HPA)
Enable HPA for the Promising Engine to handle high traffic bursts.
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: promising-engine-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: promising-engine
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 5. Verification Checklist
1.  **Build**: `docker-compose build` passing.
2.  **Up**: `docker-compose up -d` healthy.
3.  **Seed**: Load Postgres with dummy ASNs.
4.  **Test**: Curl Promising Engine for a SKU with 0 OnHand but incoming ASN. Expect `shipDate` = ASN Arrival.
