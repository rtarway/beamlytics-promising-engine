export interface Item {
  sku: string;
  qty: number;
  prepTimeHours?: number; // V2: New field for dynamic SLA
}

export interface Order {
  orderId: string;
  items: Item[];
  destination: {
    address: string;
    zip: string;
    lat: number;
    lng: number;
  };
  orderDate: Date;
}

export interface Inventory {
  sku: string;
  qty: number;
  safetyStock: number;
  futureQty?: number;
  reservedQty?: number;
  atp?: number;
  futureDetails?: FutureInventoryDetail[];
}

export interface FutureInventoryDetail {
  asnId: string;
  qty: number;
  eta: Date;
}

export interface Location {
  locationId: string;
  type: 'STORE' | 'WAREHOUSE';
  name: string;
  address: {
    address: string;
    zip: string;
    lat: number;
    lng: number;
  };
  inventory: Inventory[];
  baseCapacity: number;
  // Dynamic factor loaded at runtime, not persisted in static config usually, but here for simplicity
  currentLoad?: number;
}

export interface Carrier {
  name: string;
  pickupSchedule: number; // Hour of day (0-23)
  transitTimeMap: Record<string, number>; // Simple zone/distance -> days map or function
}

export interface Package {
  items: Item[];
  shipDate: Date;
  deliveryDate: Date;
  carrier: string;
  locationId: string;
}

export type OptimizationStrategy = 'PROFIT' | 'RETENTION' | 'BALANCED';

export interface SourcingConfig {
  strategy: OptimizationStrategy;
  maxSplitShipments?: number;
  retentionCostThreshold?: number; // Start allowing higher costs if below this
  slaStrictness: 'HARD' | 'SOFT'; // HARD = never fail SLA, SOFT = allow if no other option
  maxSearchRadiusMiles?: number; // V3: Geo-Filtering
}

export interface PromiseResponse {
  packages: Package[];
  totalCost: number;
  debugInfo?: string;
}
