import express from 'express';
import { config } from './config';
import promiseRoutes from './routes/promise.routes';

const app = express();

app.use(express.json());

// Routes
app.use('/api/v1', promiseRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

app.listen(config.port, () => {
    console.log(`Promising Engine running on port ${config.port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
