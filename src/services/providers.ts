import { InventoryProvider, RateShopper } from '../sourcing/interfaces';
import { Inventory, Location, Carrier } from '../types';
import { CarrierService } from '../services/carrier-service';

export class DefaultInventoryProvider implements InventoryProvider {
    private locations: Location[];

    constructor(locations: Location[]) {
        this.locations = locations;
    }

    async getInventory(locationId: string, skus: string[]): Promise<Inventory[]> {
        const loc = this.locations.find(l => l.locationId === locationId);
        if (!loc) return [];
        return loc.inventory.filter(i => skus.includes(i.sku));
    }
}

export class DefaultRateShopper implements RateShopper {
    private carrierService: CarrierService;
    private carriers: Carrier[];

    constructor(carrierService: CarrierService, carriers: Carrier[]) {
        this.carrierService = carrierService;
        this.carriers = carriers;
    }

    async getRate(origin: Location, dest: { lat: number, lng: number }, weight?: number): Promise<{ cost: number, transitDays: number, carrier: Carrier }> {
        // Simple logic: iterate carriers and pick cheapest for now, or just first valid
        // To keep it simple conforming to old logic:
        let best = null;
        for (const carrier of this.carriers) {
            const cost = this.carrierService.calculateCost(origin, dest); // uses carrier service logic
            const transitDays = this.carrierService.calculateTransitTime(origin, dest);

            if (!best || cost < best.cost) {
                best = { cost, transitDays, carrier };
            }
        }

        if (!best) throw new Error("No rate found");
        return best;
    }
}
