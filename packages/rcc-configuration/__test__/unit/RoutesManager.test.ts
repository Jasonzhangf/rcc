/**
 * Unit tests for RoutesManager - Load Balancing Configuration Focus
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ConfigManager, RoutesManager } from '../../src';
import type { IRoute, ILoadBalancingStrategy } from '../../src';

describe('RoutesManager', () => {
  let configManager: ConfigManager;
  let routesManager: RoutesManager;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rcc-routes-test-'));
    const configPath = path.join(tempDir, 'config.json');
    
    configManager = new ConfigManager(configPath);
    await configManager.initialize();
    
    routesManager = new RoutesManager(configManager);
    await routesManager.initialize();
  });

  afterEach(async () => {
    if (routesManager) await routesManager.destroy();
    if (configManager) await configManager.destroy();
    await fs.remove(tempDir);
  });

  describe('Load Balancing Configuration', () => {
    let testRoute: IRoute;

    beforeEach(async () => {
      // Create a test route
      testRoute = await routesManager.create({
        name: 'Test Route',
        category: 'default',
        virtual_model: 'test-model',
        targets: [
          {
            id: 'target-1',
            provider_id: 'provider-1',
            provider_name: 'Provider 1',
            model_id: 'model-1',
            model_name: 'Model 1',
            weight: 1,
            priority: 1,
            status: 'active'
          }
        ],
        load_balancing: {
          type: 'round_robin',
          config: { current_index: 0 }
        },
        status: 'active'
      });
    });

    test('should update load balancing to round_robin', async () => {
      const roundRobinStrategy: ILoadBalancingStrategy = {
        type: 'round_robin',
        config: {
          current_index: 0
        }
      };

      await routesManager.updateLoadBalancingConfig(testRoute.id, roundRobinStrategy);
      
      const config = await routesManager.getLoadBalancingConfig(testRoute.id);
      expect(config).toBeDefined();
      expect(config!.type).toBe('round_robin');
      expect(config!.config?.current_index).toBe(0);
    });

    test('should update load balancing to weighted', async () => {
      const weightedStrategy: ILoadBalancingStrategy = {
        type: 'weighted',
        config: {
          total_weight: 100
        }
      };

      await routesManager.updateLoadBalancingConfig(testRoute.id, weightedStrategy);
      
      const config = await routesManager.getLoadBalancingConfig(testRoute.id);
      expect(config).toBeDefined();
      expect(config!.type).toBe('weighted');
      expect(config!.config?.total_weight).toBe(100);
    });

    test('should update load balancing to health_based', async () => {
      const healthBasedStrategy: ILoadBalancingStrategy = {
        type: 'health_based',
        config: {
          health_threshold: 0.8,
          failure_timeout_ms: 300000
        }
      };

      await routesManager.updateLoadBalancingConfig(testRoute.id, healthBasedStrategy);
      
      const config = await routesManager.getLoadBalancingConfig(testRoute.id);
      expect(config).toBeDefined();
      expect(config!.type).toBe('health_based');
      expect(config!.config?.health_threshold).toBe(0.8);
      expect(config!.config?.failure_timeout_ms).toBe(300000);
    });

    test('should update load balancing to priority', async () => {
      const priorityStrategy: ILoadBalancingStrategy = {
        type: 'priority',
        config: {
          failover_enabled: true
        }
      };

      await routesManager.updateLoadBalancingConfig(testRoute.id, priorityStrategy);
      
      const config = await routesManager.getLoadBalancingConfig(testRoute.id);
      expect(config).toBeDefined();
      expect(config!.type).toBe('priority');
      expect(config!.config?.failover_enabled).toBe(true);
    });

    test('should update load balancing to random', async () => {
      const randomStrategy: ILoadBalancingStrategy = {
        type: 'random',
        config: {}
      };

      await routesManager.updateLoadBalancingConfig(testRoute.id, randomStrategy);
      
      const config = await routesManager.getLoadBalancingConfig(testRoute.id);
      expect(config).toBeDefined();
      expect(config!.type).toBe('random');
    });

    test('should update load balancing to least_connections', async () => {
      const leastConnectionsStrategy: ILoadBalancingStrategy = {
        type: 'least_connections',
        config: {
          connection_counts: {
            'target-1': 5,
            'target-2': 3
          }
        }
      };

      await routesManager.updateLoadBalancingConfig(testRoute.id, leastConnectionsStrategy);
      
      const config = await routesManager.getLoadBalancingConfig(testRoute.id);
      expect(config).toBeDefined();
      expect(config!.type).toBe('least_connections');
      expect(config!.config?.connection_counts).toEqual({
        'target-1': 5,
        'target-2': 3
      });
    });

    test('should throw error for non-existent route', async () => {
      const strategy: ILoadBalancingStrategy = {
        type: 'round_robin',
        config: {}
      };

      await expect(
        routesManager.updateLoadBalancingConfig('non-existent-route', strategy)
      ).rejects.toThrow('Route not found');
    });

    test('should return null for non-existent route config', async () => {
      const config = await routesManager.getLoadBalancingConfig('non-existent-route');
      expect(config).toBeNull();
    });

    test('should persist load balancing config changes', async () => {
      const weightedStrategy: ILoadBalancingStrategy = {
        type: 'weighted',
        config: {
          total_weight: 50
        }
      };

      await routesManager.updateLoadBalancingConfig(testRoute.id, weightedStrategy);
      
      // Create new routes manager to test persistence
      const newRoutesManager = new RoutesManager(configManager);
      await newRoutesManager.initialize();
      
      const config = await newRoutesManager.getLoadBalancingConfig(testRoute.id);
      expect(config).toBeDefined();
      expect(config!.type).toBe('weighted');
      expect(config!.config?.total_weight).toBe(50);
      
      await newRoutesManager.destroy();
    });
  });

  describe('Route CRUD Operations', () => {
    test('should create route with default round_robin load balancing', async () => {
      const route = await routesManager.create({
        name: 'Default Route',
        category: 'default',
        targets: [],
        load_balancing: {
          type: 'round_robin',
          config: {}
        },
        status: 'active'
      });

      expect(route).toBeDefined();
      expect(route.load_balancing.type).toBe('round_robin');
    });

    test('should get all routes', async () => {
      await routesManager.create({
        name: 'Route 1',
        category: 'default',
        targets: [],
        load_balancing: { type: 'round_robin', config: {} },
        status: 'active'
      });

      await routesManager.create({
        name: 'Route 2',
        category: 'coding',
        targets: [],
        load_balancing: { type: 'weighted', config: {} },
        status: 'active'
      });

      const routes = await routesManager.getAll();
      expect(routes).toHaveLength(2);
    });

    test('should get route by ID', async () => {
      const createdRoute = await routesManager.create({
        name: 'Test Route',
        category: 'default',
        targets: [],
        load_balancing: { type: 'round_robin', config: {} },
        status: 'active'
      });

      const retrievedRoute = await routesManager.getById(createdRoute.id);
      expect(retrievedRoute).toBeDefined();
      expect(retrievedRoute!.name).toBe('Test Route');
    });

    test('should update route', async () => {
      const route = await routesManager.create({
        name: 'Original Name',
        category: 'default',
        targets: [],
        load_balancing: { type: 'round_robin', config: {} },
        status: 'active'
      });

      const updatedRoute = await routesManager.update(route.id, {
        name: 'Updated Name',
        status: 'inactive'
      });

      expect(updatedRoute.name).toBe('Updated Name');
      expect(updatedRoute.status).toBe('inactive');
      expect(updatedRoute.updated_at).not.toBe(route.updated_at);
    });

    test('should delete route', async () => {
      const route = await routesManager.create({
        name: 'To Delete',
        category: 'default',
        targets: [],
        load_balancing: { type: 'round_robin', config: {} },
        status: 'active'
      });

      const deleted = await routesManager.delete(route.id);
      expect(deleted).toBe(true);

      const retrievedRoute = await routesManager.getById(route.id);
      expect(retrievedRoute).toBeNull();
    });
  });

  describe('Virtual Categories', () => {
    test('should get default virtual categories', async () => {
      const categories = await routesManager.getVirtualCategories();
      expect(categories.length).toBeGreaterThan(0);
      
      const defaultCategory = categories.find(c => c.name === 'default');
      expect(defaultCategory).toBeDefined();
      expect(defaultCategory!.display_name).toBe('Default Models');
    });

    test('should create virtual category', async () => {
      const category = await routesManager.createVirtualCategory({
        name: 'custom',
        display_name: 'Custom Models',
        description: 'Custom model category for testing',
        selection_criteria: {
          min_context_length: 50000
        }
      });

      expect(category.name).toBe('custom');
      expect(category.display_name).toBe('Custom Models');
    });

    test('should update virtual category', async () => {
      await routesManager.createVirtualCategory({
        name: 'test-category',
        display_name: 'Test Category',
        description: 'Original description',
        selection_criteria: {}
      });

      const updated = await routesManager.updateVirtualCategory('test-category', {
        description: 'Updated description'
      });

      expect(updated.description).toBe('Updated description');
    });
  });

  describe('Route Generation', () => {
    test('should generate routing table', async () => {
      await routesManager.create({
        name: 'Test Route',
        category: 'default',
        targets: [],
        load_balancing: { type: 'round_robin', config: {} },
        status: 'active'
      });

      const routingTable = await routesManager.generateRoutingTable();
      
      expect(routingTable.routes).toHaveLength(1);
      expect(routingTable.virtual_categories).toHaveLength(6); // Default categories
      expect(routingTable.default_strategies).toBeDefined();
      expect(routingTable.generated_at).toBeDefined();
    });

    test('should include default load balancing strategies in routing table', async () => {
      const routingTable = await routesManager.generateRoutingTable();
      
      expect(routingTable.default_strategies.round_robin).toBeDefined();
      expect(routingTable.default_strategies.weighted).toBeDefined();
      expect(routingTable.default_strategies.random).toBeDefined();
      expect(routingTable.default_strategies.health_based).toBeDefined();
      expect(routingTable.default_strategies.priority).toBeDefined();
      expect(routingTable.default_strategies.least_connections).toBeDefined();
    });
  });
});