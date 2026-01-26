import { Router } from 'express';
import { ServiceContainer } from '../container';
import { PromisingAgent } from '../agent/promising-agent';

const router = Router();

// Lazy init agent
let agent: PromisingAgent;

const getAgent = () => {
    if (!agent) {
        const container = ServiceContainer.getInstance();
        agent = new PromisingAgent(container.getSourcingEngine());
    }
    return agent;
};

router.post('/promise', async (req, res) => {
    try {
        const { order, context } = req.body;

        if (!order || !order.items || !order.destination) {
            res.status(400).json({ error: 'Invalid order structure' });
            return;
        }

        const agentFn = getAgent();
        const response = await agentFn.determinePromise(order, context || { customerTier: 'REGULAR', urgency: 'LOW' });

        res.json(response);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
