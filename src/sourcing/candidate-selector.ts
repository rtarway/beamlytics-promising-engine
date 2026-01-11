import { Location, Order } from '../types';
import haversine from 'haversine-distance';

export class CandidateSelector {
    /**
     * Selects a subset of locations that are viable candidates for fulfilling the order.
     * Uses geo-filtering (radius or top-N nearest) to reduce search space.
     * 
     * @param order 
     * @param allLocations 
     * @param maxRadiusMiles Optional override or config value
     */
    public selectCandidates(order: Order, allLocations: Location[], maxRadiusMiles?: number): Location[] {
        if (!maxRadiusMiles) {
            // If no limit, return all (or top N default? Let's just return all for safety if unconfigured)
            return allLocations;
        }

        const filtered = allLocations.filter(loc => {
            const distMeters = haversine(
                { lat: loc.address.lat, lng: loc.address.lng },
                { lat: order.destination.lat, lng: order.destination.lng }
            );
            const distMiles = distMeters / 1609.34;
            return distMiles <= maxRadiusMiles;
        });

        // Optimization: Sort by distance so the engine checks nearest first (Greedy win)
        filtered.sort((a, b) => {
            const distA = haversine(
                { lat: a.address.lat, lng: a.address.lng },
                { lat: order.destination.lat, lng: order.destination.lng }
            );
            const distB = haversine(
                { lat: b.address.lat, lng: b.address.lng },
                { lat: order.destination.lat, lng: order.destination.lng }
            );
            return distA - distB;
        });

        return filtered;
    }
}
