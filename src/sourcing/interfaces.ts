import { Inventory, Location, Carrier } from '../types';

export interface InventoryProvider {
    /**
     * Get inventory for specific SKUs at a location.
     */
    getInventory(locationId: string, skus: string[]): Promise<Inventory[]>;
}

export interface RateShopper {
    /**
     * Get applicable rates for a shipment.
     */
    getRate(origin: Location, dest: { lat: number, lng: number }, weight?: number): Promise<{ cost: number, transitDays: number, carrier: Carrier }>;
}

export interface RetentionCostCalculator {
    /**
     * Calculate the maximum cost the business is willing to absorb to save this sale.
     * @param order The order context (customer, value, etc.)
     * @returns Maximum extra cost allowed (e.g., $10, $50).
     */
    calculateRetentionCost(order: any): Promise<number>;
}
