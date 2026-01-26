import { InventorySeeder } from './helpers/seed';

async function run() {
    console.log('Initializing Seeder...');
    const seeder = new InventorySeeder();
    try {
        console.log('Connecting...');
        await seeder.connect();
        console.log('✅ Connection Successful!');
        console.log('✅ Schema Ensured.');
    } catch (error) {
        console.error('❌ Connection Failed:', error);
    } finally {
        await seeder.disconnect();
        console.log('Disconnected.');
    }
}

run();
