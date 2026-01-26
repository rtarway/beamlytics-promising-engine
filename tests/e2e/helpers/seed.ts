import { createClient } from 'redis';
import { Client } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const REDIS_URL = process.env.REDIS_URL || 'redis://192.168.64.2:6379';
const POSTGRES_URL = process.env.DATABASE_URL || 'postgresql://admin:password@192.168.64.2:5432/inventory_future';

export class InventorySeeder {
    private redisClient;
    private pgClient;

    constructor() {
        this.redisClient = createClient({ url: REDIS_URL });
        this.pgClient = new Client({ connectionString: POSTGRES_URL });

        this.redisClient.on('error', (err) => console.error('Redis Seed Error', err));
    }

    async connect() {
        console.log('Seeder connecting to Redis/Postgres...');
        if (!this.redisClient.isOpen) await this.redisClient.connect();
        await this.pgClient.connect();
        console.log('Connected. Ensuring schema...');
        try {
            await this.ensureSchema();
            console.log('Schema ensured.');
        } catch (e) {
            console.error('Schema creation failed:', e);
            throw e;
        }
    }

    async disconnect() {
        if (this.redisClient.isOpen) await this.redisClient.disconnect();
        await this.pgClient.end();
    }

    async ensureSchema() {
        await this.pgClient.query(`
            CREATE TABLE IF NOT EXISTS asns (
                asn_id VARCHAR(50) PRIMARY KEY,
                destination_location_id VARCHAR(50),
                status VARCHAR(20),
                estimated_arrival TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS asn_items (
                asn_id VARCHAR(50),
                sku VARCHAR(50),
                qty_shipped INTEGER,
                qty_received INTEGER,
                PRIMARY KEY (asn_id, sku)
            );

            CREATE TABLE IF NOT EXISTS reservations (
                reservation_id VARCHAR(50) PRIMARY KEY,
                order_id VARCHAR(50),
                sku VARCHAR(50),
                location_id VARCHAR(50),
                qty INTEGER,
                type VARCHAR(20),
                status VARCHAR(20),
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
    }

    async clearData() {
        // Clear Redis
        await this.redisClient.del('inventory:totals');

        // Clear Postgres (Truncate tables)
        // Order matters due to FKs
        await this.pgClient.query('TRUNCATE TABLE reservations, asn_items, asns CASCADE');
    }

    async seedOnHand(sku: string, qty: number, locationId: string = 'WEB') {
        const key = `${locationId}-${sku}`;
        // HSET inventory:totals <key> <qty>
        // Note: Java/Service uses BigDecimal logic, but string representation works.
        await this.redisClient.hSet('inventory:totals', key, qty.toString());
    }

    async seedFuture(sku: string, qty: number, daysFromNow: number, locationId: string = 'WEB') {
        const asnId = `ASN-${uuidv4()}`;

        // Calculate Arrival Date
        const arrivalDate = new Date();
        arrivalDate.setDate(arrivalDate.getDate() + daysFromNow);
        const arrivalIso = arrivalDate.toISOString();

        // Insert ASN
        await this.pgClient.query(`
            INSERT INTO asns (asn_id, destination_location_id, status, estimated_arrival, created_at, updated_at)
            VALUES ($1, $2, 'IN_TRANSIT', $3, NOW(), NOW())
        `, [asnId, locationId, arrivalIso]);

        // Insert ASN Item
        await this.pgClient.query(`
            INSERT INTO asn_items (asn_id, sku, qty_shipped, qty_received)
            VALUES ($1, $2, $3, 0)
        `, [asnId, sku, qty]);

        return asnId;
    }
}
