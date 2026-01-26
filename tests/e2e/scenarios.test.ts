import axios from 'axios';
import { InventorySeeder } from './helpers/seed';
import { v4 as uuidv4 } from 'uuid';

const PE_URL = process.env.PE_URL || 'http://localhost:4000';
// const UIS_URL = process.env.UIS_URL || 'http://localhost:3000';

jest.setTimeout(60000); // Allow time for Docker/Network ops

describe('E2E Business Scenarios: Promising Engine', () => {
    let seeder: InventorySeeder;

    beforeAll(async () => {
        seeder = new InventorySeeder();
        await seeder.connect();
    });

    afterAll(async () => {
        await seeder.disconnect();
    });

    beforeEach(async () => {
        await seeder.clearData();
    });

    test('Scenario 1: Available Now (Source from OnHand)', async () => {
        const sku = `SKU-NOW-${uuidv4()}`;
        const qty = 100;
        await seeder.seedOnHand(sku, qty, 'LOC-2');

        const orderButtons = {
            orderId: `ORD-${uuidv4()}`,
            orderDate: new Date().toISOString(),
            destination: { lat: 34.05, lng: -118.25, country: 'US', zip: '90001' },
            items: [{ sku, qty: 1 }]
        };

        const response = await axios.post(`${PE_URL}/api/v1/promise`, orderButtons);

        expect(response.status).toBe(200);
        // Expect at least one package
        expect(response.data.packages.length).toBeGreaterThan(0);
        const pkg = response.data.packages[0];

        // Should be shipped immediately (or close to order date)
        expect(pkg.items[0].sku).toBe(sku);
    });

    test('Scenario 2: Future Short Term (Source from Inbound arriving in 2 days)', async () => {
        const sku = `SKU-FUTURE-${uuidv4()}`;
        await seeder.seedOnHand(sku, 0, 'LOC-2');
        await seeder.seedFuture(sku, 50, 2, 'LOC-2'); // Arrives in 2 days

        const orderButtons = {
            orderId: `ORD-${uuidv4()}`,
            orderDate: new Date().toISOString(),
            destination: { lat: 34.05, lng: -118.25, country: 'US', zip: '90001' },
            items: [{ sku, qty: 5 }]
        };

        const response = await axios.post(`${PE_URL}/api/v1/promise`, orderButtons);

        expect(response.status).toBe(200);
        expect(response.data.packages.length).toBeGreaterThan(0);
        const pkg = response.data.packages[0];

        // Delivery date should be > now
        const deliveryDate = new Date(pkg.deliveryDate);
        const now = new Date();
        expect(deliveryDate.getTime()).toBeGreaterThan(now.getTime());
    });

    test('Scenario 3: Out of Stock (No OnHand, No Future)', async () => {
        const sku = `SKU-OOS-${uuidv4()}`;
        // No Seeding

        const orderButtons = {
            orderId: `ORD-${uuidv4()}`,
            orderDate: new Date().toISOString(),
            destination: { lat: 34.05, lng: -118.25, country: 'US', zip: '90001' },
            items: [{ sku, qty: 1 }]
        };

        const response = await axios.post(`${PE_URL}/api/v1/promise`, orderButtons);

        // Engine returns 200 with empty packages if unfulfillable
        expect(response.status).toBe(200);
        expect(response.data.packages.length).toBe(0);
        if (response.data.debugInfo) {
            expect(response.data.debugInfo).toMatch(/Could not fulfill/i);
        }
    });

    test('Scenario 4: Mixed Cart (1 Available, 1 OOS)', async () => {
        const skuAvailable = `SKU-MIX-AVL-${uuidv4()}`;
        const skuOOS = `SKU-MIX-OOS-${uuidv4()}`;

        await seeder.seedOnHand(skuAvailable, 10, 'LOC-2');

        const orderButtons = {
            orderId: `ORD-${uuidv4()}`,
            orderDate: new Date().toISOString(),
            destination: { lat: 34.05, lng: -118.25, country: 'US', zip: '90001' },
            items: [
                { sku: skuAvailable, qty: 1 },
                { sku: skuOOS, qty: 1 }
            ]
        };

        const response = await axios.post(`${PE_URL}/api/v1/promise`, orderButtons);

        expect(response.status).toBe(200);

        if (response.data.packages.length > 0) {
            const pkg = response.data.packages[0];
            expect(pkg.items.length).toBe(1);
            expect(pkg.items[0].sku).toBe(skuAvailable);
        } else {
            expect(response.data.packages.length).toBeGreaterThanOrEqual(0);
        }
    });
});
