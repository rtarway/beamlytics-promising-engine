import { z } from 'zod';
import { Order } from '../types';
import type { AgentContext } from '../agent/promising-agent';

const destinationSchema = z
    .object({
        address: z.string(),
        zip: z.string(),
        lat: z.number(),
        lng: z.number()
    })
    .strict();

const itemSchema = z
    .object({
        sku: z.string(),
        qty: z.number().int().positive(),
        prepTimeHours: z.number().nonnegative().optional()
    })
    .strict();

const orderInputSchema = z
    .object({
        orderId: z.string().min(1),
        items: z.array(itemSchema).min(1),
        destination: destinationSchema,
        orderDate: z.union([z.string(), z.number(), z.coerce.date()]).optional()
    })
    .strict();

const agentContextFieldsSchema = z
    .object({
        customerTier: z.enum(['VIP', 'REGULAR']).optional(),
        urgency: z.enum(['HIGH', 'LOW']).optional(),
        preferredCarrier: z.string().optional()
    })
    .strict();

const agentBodySchema = z
    .object({
        order: orderInputSchema,
        context: agentContextFieldsSchema.optional()
    })
    .strict();

function toOrderDate(raw: z.infer<typeof orderInputSchema>['orderDate']): Date {
    if (raw === undefined) {
        return new Date();
    }
    if (raw instanceof Date) {
        return raw;
    }
    return new Date(raw);
}

function orderFromParsed(parsed: z.infer<typeof orderInputSchema>): Order {
    return {
        orderId: parsed.orderId,
        items: parsed.items,
        destination: parsed.destination,
        orderDate: toOrderDate(parsed.orderDate)
    };
}

export function parseOrderBody(body: unknown): Order {
    return orderFromParsed(orderInputSchema.parse(body));
}

const defaultAgentContext: AgentContext = { customerTier: 'REGULAR', urgency: 'LOW' };

export function parseAgentBody(body: unknown): { order: Order; context: AgentContext } {
    const { order, context } = agentBodySchema.parse(body);
    const fullContext: AgentContext = {
        customerTier: context?.customerTier ?? defaultAgentContext.customerTier,
        urgency: context?.urgency ?? defaultAgentContext.urgency,
        preferredCarrier: context?.preferredCarrier
    };
    return {
        order: orderFromParsed(order),
        context: fullContext
    };
}
