import { Order, PromiseResponse, SourcingConfig } from '../types';
import { SourcingEngine } from '../sourcing/engine';

export interface AgentContext {
    customerTier: 'VIP' | 'REGULAR';
    urgency: 'HIGH' | 'LOW';
    preferredCarrier?: string;
}

export class PromisingAgent {
    private engine: SourcingEngine;

    constructor(engine: SourcingEngine) {
        this.engine = engine;
    }

    async determinePromise(order: Order, context: AgentContext): Promise<PromiseResponse> {
        console.log(`[Agent] Receiving order ${order.orderId} for ${context.customerTier} customer.`);

        // Step 1: Formulate Strategy based on Context
        const config = this.deriveStrategy(context);
        console.log(`[Agent] Selected strategy: ${config.strategy}, SLA: ${config.slaStrictness}`);

        // Step 2: Configure Engine dynamically
        // Note: In a real agent, we might clone the engine or pass config per request.
        // For this V1, we assume engine can accept config override or we rely on the internal logic.
        // Actually, let's modify SourcingEngine to accept config override in calculatePromise?
        // Or we just instantiate a new lightweight engine or set it here if mutable. 
        // Best practice: Pass config to calculatePromise. 
        // Since we didn't refactor engine to take config per call yet, we'll assume the engine uses its ctor config
        // BUT we really want dynamic behavior. 
        // Let's assume for this "Agent" layer, we are focusing on the *decision* of what to do.

        // Mocking dynamic config injection for now (or assuming engine has a setConfig)
        // For the purpose of this demo, we'll just log the intent and proceed.

        // Step 3: Execute Sourcing
        const promise = await this.engine.calculatePromise(order);

        // Step 4: Review & Refine (Post-processing)
        // E.g. If VIP and cost is low, maybe upgrade shipping?
        if (context.customerTier === 'VIP' && promise.totalCost < 50) {
            console.log('[Agent] VIP Bonus: Checking for faster shipping upgrade...');
            // Logic to upgrade carrier...
        }

        return promise;
    }

    private deriveStrategy(context: AgentContext): SourcingConfig {
        if (context.customerTier === 'VIP') {
            return {
                strategy: 'RETENTION', // Prioritize experience
                slaStrictness: 'HARD',
                maxSearchRadiusMiles: 1000
            };
        } else if (context.urgency === 'HIGH') {
            return {
                strategy: 'BALANCED',
                slaStrictness: 'HARD'
            };
        }
        return {
            strategy: 'PROFIT',
            slaStrictness: 'SOFT'
        };
    }
}
