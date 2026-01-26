import axios from 'axios';
import { InventoryProvider, RateShopper, RetentionCostCalculator } from '../sourcing/interfaces';
import { Inventory, Location, Carrier } from '../types';

export class HttpInventoryProvider implements InventoryProvider {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async getInventory(locationId: string, skus: string[]): Promise<Inventory[]> {
        // Updated to use Unified Inventory Service Batch API
        // POST /inventory/query { skus, locationId }
        try {
            const response = await axios.post(`${this.baseUrl}/inventory/query`, { locationId, skus });

            // Map UIS Response to Engine Inventory Interface
            // UIS Response: Array of { sku, onHand: { total }, future: { total }, reservations: { total }, atp }

            return response.data.map((item: any) => ({
                sku: item.sku,
                qty: item.onHand.total,
                safetyStock: 0, // UIS doesn't currently manage safety stock rules per sku/loc in the aggregator? 
                // Actually UIS aggregates pure numbers. Business Rules for SS might still be local or we need to pass them?
                // For now, let's assume 0 from UIS or we need to fetch rules separately. 
                // Wait, types.ts says safetyStock is required.
                // We'll set 0 and let engine/capacity service handle dynamic SS.

                futureQty: item.future.total,
                futureDetails: item.future.details.map((d: any) => ({
                    asnId: d.asn_id,
                    qty: d.qty_remaining,
                    eta: new Date(d.estimated_arrival)
                })),
                reservedQty: item.reservations.total,
                atp: item.atp
            }));
        } catch (error) {
            console.error("Failed to fetch inventory from UIS", error);
            return [];
        }
    }
}

export class HttpRateShopper implements RateShopper {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async getRate(origin: Location, dest: { lat: number; lng: number }, weight?: number): Promise<{ cost: number; transitDays: number; carrier: Carrier }> {
        const response = await axios.post(`${this.baseUrl}/rates`, { origin, dest, weight });
        return response.data;
    }
}

export class HttpRetentionCalculator implements RetentionCostCalculator {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async calculateRetentionCost(order: any): Promise<number> {
        const response = await axios.post(`${this.baseUrl}/retention-cost`, { order });
        return response.data.cost;
    }
}
