import haversine from 'haversine-distance';
import { Carrier, Location } from '../types';

export class CarrierService {

    /**
     * Calculates shipping cost based on distance.
     * @param origin 
     * @param dest 
     * @returns Cost in USD
     */
    calculateCost(origin: Location, dest: { lat: number; lng: number }): number {
        const distMeters = haversine(
            { lat: origin.address.lat, lng: origin.address.lng },
            { lat: dest.lat, lng: dest.lng }
        );
        const distMiles = distMeters / 1609.34;

        // Simple rate card: Base $5 + $0.50 per 100 miles
        // Long distance penalty: if > 1000 miles, rate increases to $0.80 per 100 miles
        let ratePer100 = 0.50;
        if (distMiles > 1000) {
            ratePer100 = 0.80;
        }

        return 5.0 + (distMiles / 100) * ratePer100;
    }

    /**
     * Calculates transit time in days.
     * @param origin
     * @param dest
     * @returns Transit days (integer)
     */
    calculateTransitTime(origin: Location, dest: { lat: number; lng: number }): number {
        const distMeters = haversine(
            { lat: origin.address.lat, lng: origin.address.lng },
            { lat: dest.lat, lng: dest.lng }
        );
        const distMiles = distMeters / 1609.34;

        // Simple zone logic:
        // < 200 miles: 1 day
        // < 600 miles: 2 days
        // < 1500 miles: 3 days
        // > 1500 miles: 4-5 days
        if (distMiles < 200) return 1;
        if (distMiles < 600) return 2;
        if (distMiles < 1500) return 3;
        return Math.ceil(distMiles / 500) + 1; // Rough estimation for long distances
    }

    /**
     * Calculates the pick up date based on order time and carrier schedule.
     * @param orderDate 
     * @param carrier 
     * @returns Date object of pickup
     */
    calculatePickupDate(orderDate: Date, carrier: Carrier): Date {
        const pickupDate = new Date(orderDate);
        const orderHour = orderDate.getHours();

        // If order is placed after pickup time, moves to next day
        if (orderHour >= carrier.pickupSchedule) {
            pickupDate.setDate(pickupDate.getDate() + 1);
        }

        // Reset time to pickup hour (or EOD, doesn't verify strictly here)
        pickupDate.setHours(carrier.pickupSchedule, 0, 0, 0);
        return pickupDate;
    }
}
