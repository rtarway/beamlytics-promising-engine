import { Router } from 'express';
import { ZodError } from 'zod';
import { ServiceContainer } from '../container';
import { PromisingAgent } from '../agent/promising-agent';
import { parseAgentBody } from '../validation/schemas';
import { clientErrorMessage, logServerError } from '../util/client-error';

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
        const { order, context } = parseAgentBody(req.body);
        const agentFn = getAgent();
        const response = await agentFn.determinePromise(order, context);

        res.json(response);
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            res.status(400).json({ error: 'Invalid request body', details: error.flatten() });
            return;
        }
        logServerError('POST /api/v1/agent/promise', error);
        res.status(500).json({ error: clientErrorMessage(error) });
    }
});

export default router;
