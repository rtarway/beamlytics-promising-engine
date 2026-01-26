import { SourcingEngine } from '../src/sourcing/engine';
import { InventoryProvider, RateShopper, RetentionCostCalculator } from '../src/sourcing/interfaces';
import { CandidateSelector } from '../src/sourcing/candidate-selector';
import { CarrierService } from '../src/services/carrier-service';
import { CapacityService } from '../src/services/capacity-service';
import { Order, Location, Inventory, Item } from '../src/types';

// Mocks
const mockInventoryProvider: jest.Mocked<InventoryProvider> = {
    getInventory: jest.fn()
};
const mockRateShopper: jest.Mocked<RateShopper> = {
    getRate: jest.fn()
};
const mockRetentionCalculator: jest.Mocked<RetentionCostCalculator> = {
    calculateRetentionCost: jest.fn()
};
const mockCandidateSelector = new CandidateSelector();
jest.spyOn(mockCandidateSelector, 'selectCandidates').mockImplementation((order, locs) => locs);

const mockCapacityService = new CapacityService();
jest.spyOn(mockCapacityService, 'getEffectiveCapacity').mockReturnValue(100);
jest.spyOn(mockCapacityService, 'getDynamicSafetyStock').mockReturnValue(0);

// Test Data
const mockLoc: Location = {
    locationId: 'LOC1',
    type: 'WAREHOUSE',
    name: 'Main DC',
    address: { address: '123 St', zip: '10001', lat: 0, lng: 0 },
    inventory: [],
    baseCapacity: 100
};

const mockOrder: Order = {
    orderId: 'ORD1',
    items: [{ sku: 'SKU1', qty: 5 }],
    destination: { address: '456 Ave', zip: '10002', lat: 1, lng: 1 },
    orderDate: new Date('2025-01-01T10:00:00Z')
};

describe('SourcingEngine', () => {
    let engine: SourcingEngine;

    beforeEach(() => {
        engine = new SourcingEngine(
            [mockLoc],
            mockInventoryProvider,
            mockRateShopper,
            mockRetentionCalculator,
            mockCandidateSelector,
            { strategy: 'PROFIT', slaStrictness: 'SOFT' }, // config
            mockCapacityService
        );
        jest.clearAllMocks();

        // Default Mock Behavior
        mockCapacityService.getEffectiveCapacity = jest.fn().mockReturnValue(100);
        mockRateShopper.getRate.mockResolvedValue({
            cost: 10,
            transitDays: 2,
            carrier: { name: 'Ground', pickupSchedule: 17, transitTimeMap: {} }
        });
    });

    test('promises from OnHand inventory when sufficient', async () => {
        mockInventoryProvider.getInventory.mockResolvedValue([{
            sku: 'SKU1',
            qty: 10,
            safetyStock: 0,
            atp: 10
        }]);

        const result = await engine.calculatePromise(mockOrder);

        expect(result.packages).toHaveLength(1);
        expect(result.packages[0].locationId).toBe('LOC1');
        // Ship date should be ~Order Date (plus processing)
        expect(result.packages[0].shipDate.toISOString().split('T')[0]).toBe('2025-01-01');
    });

    test('promises from Future Inventory when OnHand is insufficient', async () => {
        // ASN ETA is 5 days from Order Date
        const futureDate = new Date('2025-01-06T10:00:00Z');

        mockInventoryProvider.getInventory.mockResolvedValue([{
            sku: 'SKU1',
            qty: 0, // No On Hand
            safetyStock: 0,
            atp: 10, // ATP says yes
            futureQty: 10,
            futureDetails: [
                { asnId: 'ASN1', qty: 10, eta: futureDate }
            ]
        }]);

        const result = await engine.calculatePromise(mockOrder);

        expect(result.packages).toHaveLength(1);
        expect(result.packages[0].locationId).toBe('LOC1');

        // Ship Date should be >= Future Date
        // The implementation takes max(orderDate, availableDate) => futureDate
        // Then rate shopper calculates pickup from there.
        // Expect shipDate to be at least 2025-01-06
        expect(new Date(result.packages[0].shipDate) >= futureDate).toBe(true);
    });
});
