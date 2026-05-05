import { expect } from 'vitest';
import { fetchData } from '../../src/api'; // Adjust the import based on your actual API function

test('API integration test - fetchData', async () => {
	const response = await fetchData('/endpoint'); // Replace with your actual endpoint
	expect(response).toHaveProperty('data');
	expect(response.status).toBe(200);
});