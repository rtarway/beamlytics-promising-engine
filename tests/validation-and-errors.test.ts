import { ZodError } from 'zod';
import { parseOrderBody, parseAgentBody } from '../src/validation/schemas';
import { clientErrorMessage, logServerError } from '../src/util/client-error';

describe('parseOrderBody', () => {
    it('parses a minimal valid order', () => {
        const o = parseOrderBody({
            orderId: 'ORD-1',
            items: [{ sku: 'SKU-A', qty: 2 }],
            destination: { address: '1 Main', zip: '10001', lat: 40, lng: -74 }
        });
        expect(o.orderId).toBe('ORD-1');
        expect(o.items).toHaveLength(1);
        expect(o.destination.zip).toBe('10001');
        expect(o.orderDate).toBeInstanceOf(Date);
    });

    it('rejects unknown top-level keys', () => {
        expect(() =>
            parseOrderBody({
                orderId: '1',
                items: [{ sku: 'a', qty: 1 }],
                destination: { address: '', zip: '', lat: 0, lng: 0 },
                evil: true
            } as never)
        ).toThrow(ZodError);
    });
});

describe('parseAgentBody', () => {
    it('parses order and merges default context', () => {
        const { order, context } = parseAgentBody({
            order: {
                orderId: 'O1',
                items: [{ sku: 's', qty: 1 }],
                destination: { address: 'a', zip: 'z', lat: 0, lng: 0 }
            }
        });
        expect(order.orderId).toBe('O1');
        expect(context.customerTier).toBe('REGULAR');
        expect(context.urgency).toBe('LOW');
    });

    it('applies explicit context', () => {
        const { context } = parseAgentBody({
            order: {
                orderId: 'O1',
                items: [{ sku: 's', qty: 1 }],
                destination: { address: 'a', zip: 'z', lat: 0, lng: 0 }
            },
            context: { customerTier: 'VIP', urgency: 'HIGH' }
        });
        expect(context.customerTier).toBe('VIP');
        expect(context.urgency).toBe('HIGH');
    });
});

describe('clientErrorMessage', () => {
    const orig = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = orig;
    });

    it('returns generic text in production', () => {
        process.env.NODE_ENV = 'production';
        expect(clientErrorMessage(new Error('secret stack'))).toBe('Internal server error');
    });

    it('returns Error message outside production', () => {
        process.env.NODE_ENV = 'test';
        expect(clientErrorMessage(new Error('visible'))).toBe('visible');
    });
});

describe('logServerError', () => {
    it('logs without throwing', () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        logServerError('t', new Error('e'));
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});
