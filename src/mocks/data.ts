import { Location, Carrier } from '../types';

export const mockLocations: Location[] = [
    {
        locationId: 'LOC-1',
        type: 'STORE',
        name: 'Downtown Store',
        address: { address: '123 Main St', zip: '10001', lat: 40.7128, lng: -74.0060 },
        inventory: [
            { sku: 'ITEM-A', qty: 10, safetyStock: 2 },
            { sku: 'ITEM-B', qty: 5, safetyStock: 2 }
        ],
        baseCapacity: 50,
        currentLoad: 10
    },
    {
        locationId: 'LOC-2',
        type: 'WAREHOUSE',
        name: 'Central Warehouse',
        address: { address: '456 Industrial Pkwy', zip: '90001', lat: 34.0522, lng: -118.2437 },
        inventory: [
            { sku: 'ITEM-A', qty: 100, safetyStock: 0 },
            { sku: 'ITEM-B', qty: 100, safetyStock: 0 }
        ],
        baseCapacity: 500,
        currentLoad: 50
    }
];

export const mockCarriers: Carrier[] = [
    {
        name: 'SwiftLogistics',
        pickupSchedule: 16,
        transitTimeMap: {}
    }
];
