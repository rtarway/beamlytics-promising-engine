import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ServiceContainer } from '../container';
import { parseOrderBody } from '../validation/schemas';
import { clientErrorMessage, logServerError } from '../util/client-error';

export class PromiseController {
    static async promiseOrder(req: Request, res: Response): Promise<void> {
        try {
            const order = parseOrderBody(req.body);

            const engine = ServiceContainer.getInstance().getSourcingEngine();
            const response = await engine.calculatePromise(order);

            if (response) {
                res.json(response);
            } else {
                res.status(404).json({ error: 'Cannot fulfill order' });
            }
        } catch (error: unknown) {
            if (error instanceof ZodError) {
                res.status(400).json({ error: 'Invalid request body', details: error.flatten() });
                return;
            }
            logServerError('POST /api/v1/promise', error);
            res.status(500).json({ error: clientErrorMessage(error) });
        }
    }
}
