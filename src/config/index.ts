import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    logLevel: process.env.LOG_LEVEL || 'info',
    sourcing: {
        strategy: process.env.SOURCING_STRATEGY || 'BALANCED', // PROFIT, RETENTION, BALANCED
        slaStrictness: process.env.SLA_STRICTNESS || 'SOFT',
        maxSearchRadiusMiles: parseInt(process.env.MAX_SEARCH_RADIUS_MILES || '2000', 10)
    }
};
