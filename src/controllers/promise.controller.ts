import { Request, Response } from 'express';
import { ServiceContainer } from '../container';
import { Order } from '../types';

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

            const engine = ServiceContainer.getInstance().getSourcingEngine();
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
