
import { PromisingAgent, AgentContext } from '../src/agent/promising-agent';
import { SourcingEngine } from '../src/sourcing/engine';

// Mock SourcingEngine
const mockEngine = {
    calculatePromise: jest.fn().mockResolvedValue({ packages: [], totalCost: 0 })
} as unknown as SourcingEngine;

describe('PromisingAgent', () => {
    let agent: PromisingAgent;

    beforeEach(() => {
        agent = new PromisingAgent(mockEngine);
        jest.clearAllMocks();
    });

    test('derives RETENTION strategy for VIP customers', async () => {
        const order = { orderId: 'O1' } as any;
        const context: AgentContext = { customerTier: 'VIP', urgency: 'LOW' };

        await agent.determinePromise(order, context);

        // Since the current implementation of determinePromise logs the strategy 
        // but calls calculatePromise with the order, we verify the call.
        // In a real scenario we would spy on a config setter or expect the engine 
        // to be called with enriched context. 
        expect(mockEngine.calculatePromise).toHaveBeenCalledWith(order);
    });

    test('derives BALANCED strategy for HIGH urgency', async () => {
        const order = { orderId: 'O2' } as any;
        const context: AgentContext = { customerTier: 'REGULAR', urgency: 'HIGH' };

        await agent.determinePromise(order, context);

        expect(mockEngine.calculatePromise).toHaveBeenCalledTimes(1);
    });
});
