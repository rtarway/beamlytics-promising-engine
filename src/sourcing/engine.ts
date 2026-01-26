import { Order, Location, PromiseResponse, Package, Item, Carrier, SourcingConfig } from '../types';
import { CapacityService } from '../services/capacity-service';
import { CarrierService } from '../services/carrier-service';
import { InventoryProvider, RateShopper, RetentionCostCalculator } from './interfaces';
import { CandidateSelector } from './candidate-selector';

export class SourcingEngine {
    private capacityService: CapacityService;
    private inventoryProvider: InventoryProvider;
    private rateShopper: RateShopper;
    private retentionCalculator: RetentionCostCalculator;
    private candidateSelector: CandidateSelector;
    private locations: Location[];
    private config: SourcingConfig;

    constructor(
        locations: Location[],
        inventoryProvider: InventoryProvider,
        rateShopper: RateShopper,
        retentionCalculator: RetentionCostCalculator,
        candidateSelector: CandidateSelector,
        config: SourcingConfig,
        capacityService?: CapacityService
    ) {
        this.locations = locations;
        this.inventoryProvider = inventoryProvider;
        this.rateShopper = rateShopper;
        this.retentionCalculator = retentionCalculator;
        this.candidateSelector = candidateSelector;
        this.capacityService = capacityService || new CapacityService();
        this.config = config;
    }

    public async calculatePromise(order: Order): Promise<PromiseResponse> {
        // V3: Filter Candidates First
        // Instead of checking this.locations, we check candidates
        const candidates = this.candidateSelector.selectCandidates(
            order,
            this.locations,
            this.config.maxSearchRadiusMiles
        );

        // 1. Try single location
        const singleLocSolution = await this.findSingleLocationSolution(order, candidates);
        if (singleLocSolution) {
            return singleLocSolution;
        }

        // 2. Split shipment
        // For split, we might want to look at a wider pool? 
        // Or strictly stick to candidates to save perf. 
        // Let's stick to candidates for consistency with the design goal.
        return this.findSplitShipmentSolution(order, candidates);
    }

    private async findSingleLocationSolution(order: Order, locations: Location[]): Promise<PromiseResponse | null> {
        let bestOption: { loc: Location; cost: number; carrier: Carrier; shipDate: Date; deliveryDate: Date } | null = null;

        for (const loc of locations) {
            // a. Check Capacity
            const capacity = this.capacityService.getEffectiveCapacity(loc);
            if (capacity <= 0) continue;

            // b. Check Inventory (Async via Provider)
            const availability = await this.checkAvailability(loc, order.items);
            if (!availability.sufficient) continue;

            // c. Calculate Logistics (Async via Shopper)
            // Shopper returns best rate for this origin-dest pair
            try {
                const rate = await this.rateShopper.getRate(loc, order.destination);

                // Calculate Dates
                const carrierService = new CarrierService(); // Used for date utils

                // Base Date: Max(OrderDate, AvailabilityDate)
                const baseDate = (availability.availableDate && availability.availableDate > order.orderDate)
                    ? availability.availableDate
                    : order.orderDate;

                const pickupDate = carrierService.calculatePickupDate(baseDate, rate.carrier);

                // Apply Dynamic SLA (Prep Time)
                const maxPrepTime = Math.max(...order.items.map(i => i.prepTimeHours || 0));
                if (maxPrepTime > 0) {
                    pickupDate.setHours(pickupDate.getHours() + maxPrepTime);
                }

                const deliveryDate = new Date(pickupDate);
                deliveryDate.setDate(deliveryDate.getDate() + rate.transitDays);

                const option = { loc, cost: rate.cost, carrier: rate.carrier, shipDate: pickupDate, deliveryDate };

                // Default selection logic: Lowest Cost
                if (!bestOption || option.cost < bestOption.cost) {
                    bestOption = option;
                }
            } catch (e) {
                continue; // No rate found
            }
        }

        if (bestOption) {
            // Configuration Check: Retention vs Profit
            if (this.config.strategy === 'PROFIT') {
                // Minimal allowed.
            } else {
                // Ask the Retention Service
                try {
                    const maxRetentionCost = await this.retentionCalculator.calculateRetentionCost(order);
                    // Logic to use maxRetentionCost would go here
                } catch (e) {
                    // Fallback
                }
            }

            return {
                packages: [{
                    items: order.items,
                    shipDate: bestOption.shipDate,
                    deliveryDate: bestOption.deliveryDate,
                    carrier: bestOption.carrier.name,
                    locationId: bestOption.loc.locationId
                }],
                totalCost: bestOption.cost
            };
        }

        return null;
    }

    private async findSplitShipmentSolution(order: Order, locations: Location[]): Promise<PromiseResponse> {
        // Greedy approach with Provider calls

        let remainingItems = [...order.items.map(i => ({ ...i }))];
        const packages: Package[] = [];
        let totalCost = 0;

        let iterations = 0;
        while (remainingItems.length > 0 && iterations < 50) {
            iterations++;

            const bestPartial = await this.findBestPartialLocation(remainingItems, order.destination, order.orderDate, locations);

            if (!bestPartial) {
                return {
                    packages,
                    totalCost,
                    debugInfo: "Could not fulfill remaining: " + JSON.stringify(remainingItems)
                };
            }

            const pkg: Package = {
                items: bestPartial.fulfilledItems,
                shipDate: bestPartial.shipDate,
                deliveryDate: bestPartial.deliveryDate,
                carrier: bestPartial.carrier.name,
                locationId: bestPartial.loc.locationId
            };

            packages.push(pkg);
            totalCost += bestPartial.cost;
            remainingItems = this.subtractItems(remainingItems, bestPartial.fulfilledItems);
        }

        if (this.config.strategy === 'PROFIT' && packages.length > 1) {
            if (totalCost > 20) {
                // Reject logic placeholder
            }
        }

        return {
            packages,
            totalCost
        };
    }

    private async findBestPartialLocation(requiredItems: Item[], dest: { lat: number, lng: number }, orderDate: Date, locations: Location[]) {
        let bestCandidate = null;
        let bestScore = -Infinity;

        for (const loc of locations) {
            const cap = this.capacityService.getEffectiveCapacity(loc);
            if (cap <= 0) continue;

            const fulfillable = await this.getFulfillableItems(loc, requiredItems);
            if (fulfillable.length === 0) continue;

            const numItems = fulfillable.reduce((acc, i) => acc + i.qty, 0);

            try {
                const rate = await this.rateShopper.getRate(loc, dest);
                const carrierService = new CarrierService();
                const pickupDate = carrierService.calculatePickupDate(orderDate, rate.carrier);

                const deliveryDate = new Date(pickupDate);
                deliveryDate.setDate(deliveryDate.getDate() + rate.transitDays);

                const weight = this.config.strategy === 'RETENTION' ? 200 : 100;
                const score = (numItems * weight) - rate.cost;

                if (score > bestScore) {
                    bestScore = score;
                    bestCandidate = {
                        loc,
                        fulfilledItems: fulfillable,
                        carrier: rate.carrier,
                        cost: rate.cost,
                        shipDate: pickupDate,
                        deliveryDate
                    };
                }
            } catch (e) {
                continue;
            }
        }
        return bestCandidate;
    }

    private async checkAvailability(loc: Location, items: Item[]): Promise<{ sufficient: boolean; availableDate?: Date }> {
        const inventory = await this.inventoryProvider.getInventory(loc.locationId, items.map(i => i.sku));
        let maxStartDate = new Date(0); // Epoch

        for (const item of items) {
            const invRecord = inventory.find(inv => inv.sku === item.sku);
            if (!invRecord) return { sufficient: false };

            // 1. Check Total ATP
            // Use ATP from UIS if available, otherwise fallback to local calculation
            const atp = invRecord.atp !== undefined
                ? invRecord.atp
                : (invRecord.qty - this.capacityService.getDynamicSafetyStock(loc, invRecord.safetyStock));

            if (atp < item.qty) return { sufficient: false };

            // 2. Determine Availability Date
            // Calculate Net OnHand
            const safetyStock = this.capacityService.getDynamicSafetyStock(loc, invRecord.safetyStock);
            const reserved = invRecord.reservedQty || 0;
            const onHandNet = Math.max(0, invRecord.qty - safetyStock - reserved);

            if (onHandNet >= item.qty) {
                // Fully covered by OnHand
                // Date remains unchanged (Now)
            } else {
                // Needs Future Inventory
                const deficit = item.qty - onHandNet;

                if (!invRecord.futureDetails || invRecord.futureDetails.length === 0) {
                    // ATP says yes, but no future details? Mismatch. Fail safe.
                    return { sufficient: false };
                }

                // Sort ASNs by ETA
                const sortedASNs = [...invRecord.futureDetails].sort((a, b) => new Date(a.eta).getTime() - new Date(b.eta).getTime());

                let covered = 0;
                let neededDate = new Date();

                for (const asn of sortedASNs) {
                    covered += asn.qty;
                    neededDate = new Date(asn.eta);
                    if (covered >= deficit) break;
                }

                if (covered < deficit) return { sufficient: false }; // Should be caught by ATP check but double check

                if (neededDate > maxStartDate) {
                    maxStartDate = neededDate;
                }
            }
        }

        return { sufficient: true, availableDate: maxStartDate };
    }

    private async getFulfillableItems(loc: Location, required: Item[]): Promise<Item[]> {
        const inventory = await this.inventoryProvider.getInventory(loc.locationId, required.map(i => i.sku));
        const fulfilled: Item[] = [];

        for (const req of required) {
            const invRecord = inventory.find(inv => inv.sku === req.sku);
            if (invRecord) {
                const safetyStock = this.capacityService.getDynamicSafetyStock(loc, invRecord.safetyStock);
                const available = invRecord.qty - safetyStock;

                if (available > 0) {
                    const take = Math.min(available, req.qty);
                    fulfilled.push({ ...req, qty: take });
                }
            }
        }
        return fulfilled;
    }

    private subtractItems(all: Item[], remove: Item[]): Item[] {
        const result: Item[] = [];
        for (const item of all) {
            const toRemove = remove.find(r => r.sku === item.sku);
            if (toRemove) {
                const remainingQty = item.qty - toRemove.qty;
                if (remainingQty > 0) {
                    result.push({ ...item, qty: remainingQty });
                }
            } else {
                result.push(item);
            }
        }
        return result;
    }
}
