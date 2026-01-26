
import { SourcingEngine } from '../src/sourcing/engine';
import { InventoryProvider, RateShopper, RetentionCostCalculator } from '../src/sourcing/interfaces';
import { CandidateSelector } from '../src/sourcing/candidate-selector';
import { CapacityService } from '../src/services/capacity-service';
import { Order, Location, InventoryRecord } from '../src/types';

// Mocks
const mockInventoryProvider: InventoryProvider = {
    getInventory: jest.fn()
};

const mockRateShopper: RateShopper = {
    getRate: jest.fn()
};

const mockRetention: RetentionCostCalculator = {
    calculateRetentionCost: jest.fn().mockResolvedValue(0)
};

const mockSelector: CandidateSelector = {
    selectCandidates: jest.fn()
} as unknown as CandidateSelector;

const locations: Location[] = [
    { locationId: 'LOC-1', type: 'STORE', address: { country: 'US' }, latitude: 0, longitude: 0, capabilities: ['SHIP'] }
];

describe('Future Promising Integration', () => {
    let engine: SourcingEngine;

    beforeEach(() => {
        engine = new SourcingEngine(
            locations,
            mockInventoryProvider,
            mockRateShopper,
            mockRetention,
            new CandidateSelector(), // Using real selector logic if possible, or mocked
            { strategy: 'PROFIT', slaStrictness: 'SOFT' },
            new CapacityService()
        );

        // Setup default Candidate Selector behavior to return our loc
        (mockSelector.selectCandidates as jest.Mock).mockReturnValue(locations);
        // Actually I instantiated real CandidateSelector in test but need to mock it if I want to control it completely.
        // Let's use the real CandidateSelector logic effectively by creating the engine with it.
        // But wait, the engine ctor takes CandidateSelector. I passed a new instance.
    });

    test('promises against future inventory when OnHand is zero', async () => {
        // 1. Arrange
        const order: Order = {
            orderId: 'O-FUTURE',
            orderDate: new Date('2026-06-01T10:00:00Z'),
            destination: { lat: 0, lng: 0, country: 'US' },
            items: [{ sku: 'SKU-FUT', qty: 5 }]
        };

        // Mock Inventory: 0 OnHand, but 1 ASN arriving June 5th (4 days later)
        const futureDate = new Date('2026-06-05T10:00:00Z');
        (mockInventoryProvider.getInventory as jest.Mock).mockResolvedValue([{
            sku: 'SKU-FUT',
            qty: 10,       // Total Qty (Physical)
            reservedQty: 10, // All physical is reserved/gone
            futureDetails: [
                { id: 'ASN-1', sku: 'SKU-FUT', qty: 20, eta: futureDate, status: 'IN_TRANSIT' }
            ]
        } as InventoryRecord]);

        // Mock Rate: 2 Day Transit
        (mockRateShopper.getRate as jest.Mock).mockResolvedValue({
            cost: 10,
            carrier: { name: 'Ground', pickupSchedule: 'DAILY' },
            transitDays: 2
        });

        // 2. Act
        const result = await engine.calculatePromise(order);

        // 3. Assert
        expect(result).not.toBeNull();
        const pkg = result.packages[0];

        // Ship Date should be >= Future Date (June 5th)
        expect(new Date(pkg.shipDate).getTime()).toBeGreaterThanOrEqual(futureDate.getTime());

        // Delivery Date should be ShipDate + 2 days
        const expectedDelivery = new Date(pkg.shipDate);
        expectedDelivery.setDate(expectedDelivery.getDate() + 2);

        expect(new Date(pkg.deliveryDate).toISOString().split('T')[0])
            .toBe(expectedDelivery.toISOString().split('T')[0]);

        console.log(`Promised Ship Date: ${pkg.shipDate.toISOString()}`);
    });
});
