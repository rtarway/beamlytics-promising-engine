import axios from 'axios';
import { HttpInventoryProvider } from '../src/services/http-providers';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HttpInventoryProvider', () => {
    let provider: HttpInventoryProvider;
    const baseUrl = 'http://mock-uis:3000';

    beforeEach(() => {
        provider = new HttpInventoryProvider(baseUrl);
        jest.clearAllMocks();
    });

    it('should fetch and map inventory correctly', async () => {
        const mockResponse = {
            data: [
                {
                    sku: 'SKU_1',
                    onHand: { total: 10 },
                    future: {
                        total: 5,
                        details: [
                            { asn_id: 'ASN1', qty_remaining: 5, estimated_arrival: '2023-01-01T12:00:00Z' }
                        ]
                    },
                    reservations: { total: 2 },
                    atp: 8
                }
            ]
        };

        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await provider.getInventory('LOC1', ['SKU_1']);

        expect(mockedAxios.post).toHaveBeenCalledWith(`${baseUrl}/inventory/query`, {
            locationId: 'LOC1',
            skus: ['SKU_1']
        });

        expect(result).toHaveLength(1);
        expect(result[0].sku).toBe('SKU_1');
        expect(result[0].qty).toBe(10);
        expect(result[0].reservedQty).toBe(2);
        expect(result[0].atp).toBe(8);
        expect(result[0].futureQty).toBe(5);
        expect(result[0].futureDetails).toHaveLength(1);
        expect(result[0].futureDetails![0].asnId).toBe('ASN1');
        expect(result[0].futureDetails![0].eta).toEqual(new Date('2023-01-01T12:00:00Z'));
    });

    it('should handle errors gracefully', async () => {
        mockedAxios.post.mockRejectedValue(new Error('Network Error'));

        const result = await provider.getInventory('LOC1', ['SKU_1']);

        expect(result).toEqual([]);
    });
});
