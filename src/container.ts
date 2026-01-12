import { config } from './config';
import { InventoryProvider, RateShopper, RetentionCostCalculator } from './sourcing/interfaces';
import { DefaultInventoryProvider, DefaultRateShopper } from './services/providers';
import { HttpInventoryProvider, HttpRateShopper, HttpRetentionCalculator } from './services/http-providers';
import { CarrierService } from './services/carrier-service';
import { mockLocations, mockCarriers } from './mocks/data';
import { SourcingEngine } from './sourcing/engine';
import { CandidateSelector } from './sourcing/candidate-selector';

export class ServiceContainer {
    private static instance: ServiceContainer;

    private carrierService: CarrierService;
    private inventoryProvider: InventoryProvider;
    private rateShopper: RateShopper;
    private retentionCalculator: RetentionCostCalculator;
    private candidateSelector: CandidateSelector;
    private sourcingEngine: SourcingEngine;

    private constructor() {
        this.carrierService = new CarrierService();
        this.candidateSelector = new CandidateSelector();

        // 1. Inventory Provider
        if (config.services.inventoryUrl) {
            console.log(`Using HttpInventoryProvider: ${config.services.inventoryUrl}`);
            this.inventoryProvider = new HttpInventoryProvider(config.services.inventoryUrl);
        } else {
            console.log('Using DefaultInventoryProvider (Mock)');
            this.inventoryProvider = new DefaultInventoryProvider(mockLocations);
        }

        // 2. Rate Shopper
        if (config.services.rateShopperUrl) {
            console.log(`Using HttpRateShopper: ${config.services.rateShopperUrl}`);
            this.rateShopper = new HttpRateShopper(config.services.rateShopperUrl);
        } else {
            console.log('Using DefaultRateShopper (Mock)');
            this.rateShopper = new DefaultRateShopper(this.carrierService, mockCarriers);
        }

        // 3. Retention Service
        if (config.services.retentionUrl) {
            console.log(`Using HttpRetentionCalculator: ${config.services.retentionUrl}`);
            this.retentionCalculator = new HttpRetentionCalculator(config.services.retentionUrl);
        } else {
            console.log('Using Mock RetentionCalculator');
            this.retentionCalculator = {
                calculateRetentionCost: async () => 10.0
            };
        }

        // 4. Sourcing Engine
        this.sourcingEngine = new SourcingEngine(
            mockLocations, // Note: Locations might also need to be fetched remotely in a real app? 
            // For now, engine requires local location definition for capacity checks maybe?
            // Or we assume 'locations' ref passed to engine is just config.
            // The engine uses 'locations' effectively as the 'Configuration of nodes'. 
            this.inventoryProvider,
            this.rateShopper,
            this.retentionCalculator,
            this.candidateSelector,
            {
                strategy: config.sourcing.strategy as any,
                slaStrictness: config.sourcing.slaStrictness as any,
                maxSearchRadiusMiles: config.sourcing.maxSearchRadiusMiles
            }
        );
    }

    public static getInstance(): ServiceContainer {
        if (!ServiceContainer.instance) {
            ServiceContainer.instance = new ServiceContainer();
        }
        return ServiceContainer.instance;
    }

    public getSourcingEngine(): SourcingEngine {
        return this.sourcingEngine;
    }
}
