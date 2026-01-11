import { SourcingEngine } from './engine';
import { Location, Carrier, Order, SourcingConfig } from '../types';
import { DefaultInventoryProvider, DefaultRateShopper } from '../services/providers';
import { CarrierService } from '../services/carrier-service';
import { RetentionCostCalculator } from './interfaces';
import { CandidateSelector } from './candidate-selector';

describe('SourcingEngine V3 (Performance)', () => {
    let locations: Location[];
    let carriers: Carrier[];
    let engine: SourcingEngine;
    let config: SourcingConfig;
    let mockRetention: RetentionCostCalculator;
    let candidateSelector: CandidateSelector;

    beforeEach(() => {
        locations = [
            {
                locationId: 'LOC-1',
                type: 'STORE',
                name: 'Nearby',
                address: { address: 'A', zip: '10001', lat: 40, lng: -74 }, // NYC
                inventory: [{ sku: 'ITEM-A', qty: 10, safetyStock: 2 }],
                baseCapacity: 100,
            },
            {
                locationId: 'LOC-2',
                type: 'WAREHOUSE',
                name: 'Far',
                address: { address: 'B', zip: '90001', lat: 34, lng: -118 }, // LA
                inventory: [{ sku: 'ITEM-A', qty: 100, safetyStock: 0 }],
                baseCapacity: 1000,
            }
        ];

        carriers = [{
            name: 'Standard',
            pickupSchedule: 18,
            transitTimeMap: {}
        }];

        config = { strategy: 'PROFIT', slaStrictness: 'SOFT', maxSearchRadiusMiles: 50 }; // Very restrictive radius

        const cs = new CarrierService();
        const ip = new DefaultInventoryProvider(locations);
        const rs = new DefaultRateShopper(cs, carriers);

        mockRetention = {
            calculateRetentionCost: jest.fn().mockResolvedValue(5.0)
        };

        candidateSelector = new CandidateSelector();

        engine = new SourcingEngine(locations, ip, rs, mockRetention, candidateSelector, config);
    });

    test('should Exclude far location based on Radius Filter', async () => {
        const order: Order = {
            orderId: '1',
            items: [{ sku: 'ITEM-A', qty: 1 }],
            destination: { address: 'Local', zip: '10002', lat: 40.1, lng: -74.1 },
            orderDate: new Date()
        };

        locations[0].inventory = []; // No stock in nearby
        const ip = new DefaultInventoryProvider(locations);
        const engineRestricted = new SourcingEngine(locations, ip,
            new DefaultRateShopper(new CarrierService(), carriers),
            mockRetention, candidateSelector, config);

        const result = await engineRestricted.calculatePromise(order);
        // Result will not be null, but will have empty packages or debug info
        expect(result.packages.length).toBe(0);
        expect(result.debugInfo).toBeDefined();
    });

    test('should Include far location if Radius is Large', async () => {
        config.maxSearchRadiusMiles = 3000; // Covers entire US

        locations[0].inventory = []; // No stock in nearby
        const ip = new DefaultInventoryProvider(locations);
        const engineWide = new SourcingEngine(locations, ip,
            new DefaultRateShopper(new CarrierService(), carriers),
            mockRetention, candidateSelector, config);

        const order: Order = {
            orderId: '1',
            items: [{ sku: 'ITEM-A', qty: 1 }],
            destination: { address: 'Local', zip: '10002', lat: 40.1, lng: -74.1 },
            orderDate: new Date()
        };

        const result = await engineWide.calculatePromise(order);
        expect(result).toBeDefined();
        if (result) {
            expect(result.packages[0].locationId).toBe('LOC-2');
        }
    });
});
