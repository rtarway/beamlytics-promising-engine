
import { SourcingEngine } from '../src/sourcing/engine';
import { InventoryProvider, RateShopper, RetentionCostCalculator } from '../src/sourcing/interfaces';
import { CandidateSelector } from '../src/sourcing/candidate-selector';
import { CapacityService } from '../src/services/capacity-service';
import { Order, Location, Inventory } from '../src/types';

const mockInventoryProvider: jest.Mocked<InventoryProvider> = {
    getInventory: jest.fn()
};

const mockRateShopper: jest.Mocked<RateShopper> = {
    getRate: jest.fn()
};

const mockRetention: jest.Mocked<RetentionCostCalculator> = {
    calculateRetentionCost: jest.fn().mockResolvedValue(0)
};

const mockCandidateSelector = new CandidateSelector();
jest.spyOn(mockCandidateSelector, 'selectCandidates').mockImplementation((_order, locs) => locs);

const mockCapacityService = new CapacityService();
jest.spyOn(mockCapacityService, 'getEffectiveCapacity').mockReturnValue(100);
jest.spyOn(mockCapacityService, 'getDynamicSafetyStock').mockReturnValue(0);

const location: Location = {
    locationId: 'LOC-1',
    type: 'STORE',
    name: 'Test Store',
    address: { address: '1 St', zip: '10001', lat: 0, lng: 0 },
    inventory: [],
    baseCapacity: 100
};

const locations: Location[] = [location];

describe('Future Promising Integration', () => {
    let engine: SourcingEngine;

    beforeEach(() => {
        engine = new SourcingEngine(
            locations,
            mockInventoryProvider,
            mockRateShopper,
            mockRetention,
            mockCandidateSelector,
            { strategy: 'PROFIT', slaStrictness: 'SOFT' },
            mockCapacityService
        );
        mockCapacityService.getEffectiveCapacity = jest.fn().mockReturnValue(100);
        mockRateShopper.getRate.mockResolvedValue({
            cost: 10,
            transitDays: 2,
            carrier: { name: 'Ground', pickupSchedule: 17, transitTimeMap: {} }
        });
        jest.clearAllMocks();
    });

    test('promises against future inventory when OnHand is zero', async () => {
        const order: Order = {
            orderId: 'O-FUTURE',
            orderDate: new Date('2026-06-01T10:00:00Z'),
            destination: { address: 'Dest', zip: '10002', lat: 0, lng: 0 },
            items: [{ sku: 'SKU-FUT', qty: 5 }]
        };

        const futureDate = new Date('2026-06-05T10:00:00Z');
        const inv: Inventory = {
            sku: 'SKU-FUT',
            qty: 0,
            safetyStock: 0,
            atp: 20,
            futureQty: 20,
            futureDetails: [
                { asnId: 'ASN-1', qty: 20, eta: futureDate }
            ]
        };
        mockInventoryProvider.getInventory.mockResolvedValue([inv]);

        const result = await engine.calculatePromise(order);

        expect(result).not.toBeNull();
        const pkg = result!.packages[0];
        expect(new Date(pkg.shipDate).getTime()).toBeGreaterThanOrEqual(futureDate.getTime());
        const expectedDelivery = new Date(pkg.shipDate);
        expectedDelivery.setDate(expectedDelivery.getDate() + 2);
        expect(new Date(pkg.deliveryDate).toISOString().split('T')[0])
            .toBe(expectedDelivery.toISOString().split('T')[0]);
    });
});
