import axios from 'axios';
import { InventoryProvider, RateShopper, RetentionCostCalculator } from '../sourcing/interfaces';
import { Inventory, Location, Carrier } from '../types';

export class HttpInventoryProvider implements InventoryProvider {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async getInventory(locationId: string, skus: string[]): Promise<Inventory[]> {
        const response = await axios.post(`${this.baseUrl}/inventory`, { locationId, skus });
        return response.data;
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
