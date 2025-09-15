/**
 * Basic Test to verify the testing environment is working
 */

describe('Basic Test Environment', () => {
  test('should run a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle async code', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });
});