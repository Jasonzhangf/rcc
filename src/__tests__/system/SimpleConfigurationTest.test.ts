/**
 * Simple Configuration Module Test
 *
 * This test verifies the basic functionality of the configuration module
 * using the published rcc-configuration package.
 */

import { createConfigurationSystem, createConfigurationTemplate, isValidConfigurationStructure } from 'rcc-configuration';

describe('Simple Configuration Module Test', () => {
  test('should create configuration system instance', async () => {
    // Act
    const configSystem = await createConfigurationSystem({
      id: 'test-config-system',
      name: 'Test Configuration System'
    });

    // Assert
    expect(configSystem).toBeDefined();
    expect(typeof configSystem.initialize).toBe('function');
    expect(typeof configSystem.destroy).toBe('function');
  });

  test('should create configuration template', async () => {
    // Act
    const template = createConfigurationTemplate('test-config', 'Test configuration');

    // Assert
    expect(template).toBeDefined();
    expect(template.version).toBe('1.0.0');
    expect(template.providers).toEqual({});
    expect(template.virtualModels).toEqual({});
    expect(template.createdAt).toBeDefined();
    expect(template.updatedAt).toBeDefined();
  });

  test('should validate configuration structure', () => {
    // Arrange
    const validConfig = {
      version: '1.0.0',
      providers: {},
      virtualModels: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const invalidConfig = {
      // Missing required fields
    };

    // Act
    const validResult = isValidConfigurationStructure(validConfig);
    const invalidResult = isValidConfigurationStructure(invalidConfig);

    // Assert
    expect(validResult).toBe(true);
    expect(invalidResult).toBe(false);
  });
});