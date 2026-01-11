import express from 'express';
import { SourcingEngine } from './sourcing/engine';
import { Location, Carrier, Order } from './types';
import { DefaultInventoryProvider, DefaultRateShopper } from './services/providers';
import { RetentionCostCalculator } from './sourcing/interfaces';
import { CarrierService } from './services/carrier-service';
import { CandidateSelector } from './sourcing/candidate-selector';

const app = express();
app.use(express.json());

// Mock Data Setup
const locations: Location[] = [
    {
        locationId: 'LOC-1',
        type: 'STORE',
        name: 'Downtown Store',
        address: { address: '123 Main St', zip: '10001', lat: 40.7128, lng: -74.0060 },
        inventory: [
            { sku: 'ITEM-A', qty: 10, safetyStock: 2 },
            { sku: 'ITEM-B', qty: 5, safetyStock: 2 }
        ],
        baseCapacity: 50,
        currentLoad: 10
    },
    {
        locationId: 'LOC-2',
        type: 'WAREHOUSE',
        name: 'Central Warehouse',
        address: { address: '456 Industrial Pkwy', zip: '90001', lat: 34.0522, lng: -118.2437 },
        inventory: [
            { sku: 'ITEM-A', qty: 100, safetyStock: 0 },
            { sku: 'ITEM-B', qty: 100, safetyStock: 0 }
        ],
        baseCapacity: 500,
        currentLoad: 50
    }
];

const carriers: Carrier[] = [
    {
        name: 'SwiftLogistics',
        pickupSchedule: 16,
        transitTimeMap: {}
    }
];

const carrierService = new CarrierService();
const inventoryProvider = new DefaultInventoryProvider(locations);
const rateShopper = new DefaultRateShopper(carrierService, carriers);
const retentionCalculator: RetentionCostCalculator = {
    calculateRetentionCost: async (order) => {
        return 10.0;
    }
};
const candidateSelector = new CandidateSelector();

// Default Config
const defaultConfig = {
    strategy: 'BALANCED' as const,
    slaStrictness: 'SOFT' as const,
    maxSearchRadiusMiles: 2000 // Limit for test
};

const engine = new SourcingEngine(
    locations,
    inventoryProvider,
    rateShopper,
    retentionCalculator,
    candidateSelector,
    defaultConfig
);

app.post('/promise', async (req, res) => {
    try {
        const order: Order = {
            ...req.body,
            orderDate: new Date(req.body.orderDate || Date.now())
        };

        if (!order.items || !order.destination) {
            res.status(400).json({ error: 'Missing items or destination' });
            return;
        }

        const response = await engine.calculatePromise(order);

        if (response) {
            res.json(response);
        } else {
            res.status(404).json({ error: 'Cannot fulfill order' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Promising Engine running on port ${PORT}`);
});
