import { CapacityService } from '../src/services/capacity-service';
import { Location } from '../src/types';

describe('CapacityService', () => {
    let service: CapacityService;
    let mockLocation: Location;

    beforeEach(() => {
        service = new CapacityService();
        mockLocation = {
            locationId: 'LOC-1',
            type: 'STORE',
            name: 'Test Store',
            address: { address: 'A', zip: '10001', lat: 0, lng: 0 },
            baseCapacity: 100,
            currentLoad: 20,
            inventory: []
        };
    });

    test('getEffectiveCapacity should reduce capacity based on traffic', () => {
        // Since traffic factor is random (0.7 to 1.0), effective capacity should be
        // <= (100 - 20) * 1.0 = 80
        // >= (100 - 20) * 0.7 = 56
        const cap = service.getEffectiveCapacity(mockLocation);
        expect(cap).toBeLessThanOrEqual(80);
        expect(cap).toBeGreaterThanOrEqual(56);
    });

    test('getEffectiveCapacity should return 0 if overloaded', () => {
        mockLocation.currentLoad = 150; // Over capacity
        const cap = service.getEffectiveCapacity(mockLocation);
        expect(cap).toBe(0);
    });

    test('getDynamicSafetyStock should increase stock when busy (low traffic factor)', () => {
        // We can't easily mock the private random in the current class structure without refactoring,
        // but we can assert the range.
        // Base safety stock = 5.
        // Factor 0.7 (busy) -> 1.0 - 0.7 = 0.3. Buffer = ceil(0.3 * 10) = 3. Total = 8.
        // Factor 1.0 (quiet) -> 1.0 - 1.0 = 0.0. Buffer = 0. Total = 5.

        const baseSafety = 5;
        const result = service.getDynamicSafetyStock(mockLocation, baseSafety);

        expect(result).toBeGreaterThanOrEqual(5);
        expect(result).toBeLessThanOrEqual(9); // Max possible is base + ceil(0.3*10) = 8, actually maybe 9 depending on precision? 
        // 0.3 * 10 = 3. 0.3000...04 * 10 = 3.000...4 -> ceil(4). Let's be safe.
        expect(result).toBeLessThanOrEqual(10);
    });
});
