import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import promiseRoutes from './routes/promise.routes';
import agentRoutes from './routes/agent.routes';

const app = express();

app.use(helmet());
app.use(
    express.json({
        limit: process.env.JSON_BODY_LIMIT || '1mb'
    })
);

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api', apiLimiter);

// Routes
app.use('/api/v1', promiseRoutes);
app.use('/api/v1/agent', agentRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

app.listen(Number(config.port), '0.0.0.0', () => {
    console.log(`Promising Engine running on port ${config.port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
