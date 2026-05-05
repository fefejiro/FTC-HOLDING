import { test, expect } from 'vitest';

test('load performance test', async () => {
	const startTime = performance.now();
	// Simulate a load scenario here
	await new Promise(resolve => setTimeout(resolve, 1000)); // Simulating load
	const endTime = performance.now();
	const duration = endTime - startTime;

	expect(duration).toBeLessThan(2000); // Expect the load to complete in less than 2 seconds
});