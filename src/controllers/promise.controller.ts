import { Request, Response } from 'express';
import { SourcingEngine } from '../sourcing/engine';
import { Order } from '../types';
import { config } from '../config';
import { DefaultInventoryProvider, DefaultRateShopper } from '../services/providers';
import { CarrierService } from '../services/carrier-service';
import { CandidateSelector } from '../sourcing/candidate-selector';
import { mockLocations, mockCarriers } from '../mocks/data';

// Initialize Services (Singleton-ish for this simple app)
// In a real app, these would be injected via DI container.
const carrierService = new CarrierService();
const inventoryProvider = new DefaultInventoryProvider(mockLocations);
const rateShopper = new DefaultRateShopper(carrierService, mockCarriers);
const candidateSelector = new CandidateSelector();

const engine = new SourcingEngine(
    mockLocations,
    inventoryProvider,
    rateShopper,
    { calculateRetentionCost: async () => 10.0 }, // Mock Retention
    candidateSelector,
    // Use config values
    {
        strategy: config.sourcing.strategy as any,
        slaStrictness: config.sourcing.slaStrictness as any,
        maxSearchRadiusMiles: config.sourcing.maxSearchRadiusMiles
    }
);

export class PromiseController {
    static async promiseOrder(req: Request, res: Response): Promise<void> {
        try {
            const order: Order = {
                ...req.body,
                orderDate: new Date(req.body.orderDate || Date.now())
            };

            if (!order.items || !order.destination) {
                res.status(400).json({ error: 'Missing items or destination' });
                return;
            }

            const response = await engine.calculatePromise(order);

            if (response) {
                res.json(response);
            } else {
                res.status(404).json({ error: 'Cannot fulfill order' });
            }
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
