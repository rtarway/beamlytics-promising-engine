import { Location, Item } from '../types';

export class CapacityService {
    /**
     * Returns the effective capacity for a location.
     * Simulates "hazy" capacity by applying a traffic factor.
     */
    getEffectiveCapacity(location: Location, date: Date = new Date()): number {
        const base = location.baseCapacity;
        const currentLoad = location.currentLoad || 0;

        // TrafficFactor is random between 0.7 (busy day) and 1.0 (quiet day)
        const trafficFactor = this.getTrafficFactor(location);

        const effective = Math.floor((base - currentLoad) * trafficFactor);
        return Math.max(0, effective);
    }

    /**
     * Returns a safety stock buffer that increases as store traffic increases (capacity decreases).
     */
    getDynamicSafetyStock(location: Location, baseSafetyStock: number): number {
        const trafficFactor = this.getTrafficFactor(location);

        // If traffic is high (factor is low, e.g. 0.7), we want HIGHER safety stock.
        // If traffic is low (factor is high, e.g. 1.0), we want BASE safety stock.

        // Invert factor: 1.0 -> 0.0 impact, 0.7 -> 0.3 impact.
        const busyNess = 1.0 - trafficFactor;

        // Example logic: Add up to 5 units if very busy.
        const additionalBuffer = Math.ceil(busyNess * 10);

        return baseSafetyStock + additionalBuffer;
    }

    private getTrafficFactor(location: Location): number {
        // In a real app, this would be computed once per context or request
        // For simulation consistency, ideally we'd hash the locationId + hour.
        // But preserving randomness for the demo as before.
        return 0.7 + (Math.random() * 0.3);
    }
}
