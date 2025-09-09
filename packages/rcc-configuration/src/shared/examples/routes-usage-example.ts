/**
 * RoutesManager Usage Examples
 * 
 * This file demonstrates how to use the RoutesManager for model selection
 * and routing configuration management.
 */

import type { 
  IRoutesManager,
  IRoute,
  IVirtualModelCategory,
  IModelSelectionCriteria
} from '../RoutesManager/interfaces/IRoutesManager';

/**
 * Example: Using RoutesManager for model selection from multiple sources
 */
export async function demonstrateModelSelection(routesManager: IRoutesManager) {
  console.log('🔍 Demonstrating model selection from multiple sources...');

  // Get all available models for routing from all sources
  const allModels = await routesManager.getAvailableModelsForRouting({
    include_config: true,      // 配置文件中的模型
    include_providers: true,   // Provider 管理器中的模型
    include_pool: true,        // Pool 中的模型
    exclude_blacklisted: true  // 排除黑名单模型
  });

  console.log(`📊 Found ${allModels.length} total models across all sources:`);
  
  // Group by source
  const bySource = {
    config: allModels.filter(m => m.source === 'config'),
    provider: allModels.filter(m => m.source === 'provider'),
    pool: allModels.filter(m => m.source === 'pool')
  };

  console.log(`  • Config models: ${bySource.config.length}`);
  console.log(`  • Provider models: ${bySource.provider.length}`);
  console.log(`  • Pool models: ${bySource.pool.length}`);

  // Example: Get models suitable for coding tasks
  const codingCriteria: IModelSelectionCriteria = {
    supports_code: true,
    min_context_length: 128000,
    preferred_providers: ['openai', 'anthropic']
  };

  const codingModels = await routesManager.getAvailableModelsForRouting({
    include_config: true,
    include_providers: true,
    include_pool: true,
    exclude_blacklisted: true,
    filter_criteria: codingCriteria
  });

  console.log(`🔧 Found ${codingModels.length} models suitable for coding tasks`);
  
  return { allModels, codingModels };
}

/**
 * Example: Auto-generating routes based on available models
 */
export async function demonstrateRouteGeneration(routesManager: IRoutesManager) {
  console.log('⚙️ Demonstrating automatic route generation...');

  // Generate default routes using all available models
  const generatedRoutes = await routesManager.generateDefaultRoutes({
    create_default_categories: true,  // 创建默认虚拟模型类别
    use_pool_models: true,           // 使用 Pool 中的模型
    use_provider_models: true,       // 使用 Provider 中的模型
    default_load_balancing: 'weighted' // 使用权重负载均衡
  });

  console.log(`🛣️  Generated ${generatedRoutes.length} routes with targets:`);
  
  for (const route of generatedRoutes) {
    console.log(`  • ${route.name} (${route.virtual_model}): ${route.targets.length} targets`);
    console.log(`    Load balancing: ${route.load_balancing.type}`);
    
    // Show top 3 targets
    const topTargets = route.targets.slice(0, 3);
    for (const target of topTargets) {
      console.log(`    - ${target.provider_name}/${target.model_name} (weight: ${target.weight})`);
    }
  }

  return generatedRoutes;
}

/**
 * Example: Working with virtual model categories
 */
export async function demonstrateVirtualCategories(routesManager: IRoutesManager) {
  console.log('🎯 Demonstrating virtual model categories...');

  // Get all virtual categories
  const categories = await routesManager.getVirtualCategories();
  
  console.log(`📋 Available virtual categories (${categories.length}):`);
  for (const category of categories) {
    console.log(`  • ${category.name}: ${category.display_name}`);
    console.log(`    ${category.description}`);
    
    // Show selection criteria
    const criteria = category.selection_criteria;
    console.log(`    Criteria: min_context=${criteria.min_context_length || 'any'}, ` +
                `supports_code=${criteria.supports_code || false}, ` +
                `supports_reasoning=${criteria.supports_reasoning || false}`);
  }

  // Example: Create a custom virtual category
  const customCategory: Omit<IVirtualModelCategory, 'default_targets'> = {
    name: 'custom-llm',
    display_name: 'Custom LLM Category',
    description: 'Custom category for specialized LLM tasks',
    selection_criteria: {
      min_context_length: 256000,
      supports_functions: true,
      preferred_providers: ['openai', 'anthropic', 'google'],
      exclude_blacklisted: true
    }
  };

  const createdCategory = await routesManager.createVirtualCategory(customCategory);
  console.log(`✅ Created custom category: ${createdCategory.name}`);

  return { categories, customCategory: createdCategory };
}

/**
 * Example: Generating routing configuration for external routing engines
 */
export async function demonstrateConfigurationGeneration(routesManager: IRoutesManager) {
  console.log('📄 Demonstrating configuration generation for routing engines...');

  // Generate complete routing table configuration
  const routingTable = await routesManager.generateRoutingTable();
  
  console.log('🗂️  Generated routing configuration:');
  console.log(`  • Routes: ${routingTable.routes.length}`);
  console.log(`  • Virtual categories: ${routingTable.virtual_categories.length}`);
  console.log(`  • Load balancing strategies: ${Object.keys(routingTable.default_strategies).length}`);
  console.log(`  • Generated at: ${routingTable.generated_at}`);

  // Show available load balancing strategies
  console.log('\n⚖️  Available load balancing strategies:');
  for (const [name, strategy] of Object.entries(routingTable.default_strategies)) {
    console.log(`  • ${name}: ${strategy.type}`);
  }

  // Example: How a routing engine would use this configuration
  console.log('\n🔧 Example routing engine usage:');
  console.log('```typescript');
  console.log('// Routing engine consumes this configuration');
  console.log('const config = await routesManager.generateRoutingTable();');
  console.log('');
  console.log('// Find route for virtual model');
  console.log('const route = config.routes.find(r => r.virtual_model === "coding");');
  console.log('');
  console.log('// Select target using load balancing strategy');
  console.log('const strategy = route.load_balancing;');
  console.log('const target = selectTarget(route.targets, strategy);');
  console.log('```');

  return routingTable;
}

/**
 * Complete example showing the full workflow
 */
export async function completeRoutingWorkflowExample(routesManager: IRoutesManager) {
  console.log('🚀 Complete RoutesManager workflow example');
  console.log('='.repeat(50));

  try {
    // Initialize the routes manager
    await routesManager.initialize();

    // 1. Demonstrate model selection from multiple sources
    console.log('\n1️⃣ Model Selection from Multiple Sources:');
    const { allModels, codingModels } = await demonstrateModelSelection(routesManager);

    // 2. Show virtual model categories
    console.log('\n2️⃣ Virtual Model Categories:');
    const { categories } = await demonstrateVirtualCategories(routesManager);

    // 3. Generate routes automatically
    console.log('\n3️⃣ Automatic Route Generation:');
    const routes = await demonstrateRouteGeneration(routesManager);

    // 4. Generate configuration for routing engines
    console.log('\n4️⃣ Configuration Generation:');
    const config = await demonstrateConfigurationGeneration(routesManager);

    console.log('\n✅ Workflow completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  • Total models available: ${allModels.length}`);
    console.log(`  • Coding-suitable models: ${codingModels.length}`);
    console.log(`  • Virtual categories: ${categories.length}`);
    console.log(`  • Generated routes: ${routes.length}`);
    console.log(`  • Load balancing strategies: ${Object.keys(config.default_strategies).length}`);

    return {
      models: { total: allModels.length, coding: codingModels.length },
      categories: categories.length,
      routes: routes.length,
      strategies: Object.keys(config.default_strategies).length
    };

  } catch (error) {
    console.error('❌ Workflow failed:', error);
    throw error;
  } finally {
    // Cleanup
    await routesManager.destroy();
  }
}

/**
 * Export example configuration data
 */
export const EXAMPLE_USAGE_SCENARIOS = {
  // Scenario 1: High-performance coding assistant
  coding_assistant: {
    virtual_model: 'coding',
    criteria: {
      supports_code: true,
      min_context_length: 200000,
      preferred_providers: ['openai', 'anthropic'],
      max_response_time_ms: 15000
    },
    expected_load_balancing: 'weighted'
  },

  // Scenario 2: Fast general-purpose responses  
  fast_general: {
    virtual_model: 'fast',
    criteria: {
      max_response_time_ms: 5000,
      min_success_rate: 0.95,
      prefer_pool_models: true
    },
    expected_load_balancing: 'round_robin'
  },

  // Scenario 3: High-accuracy reasoning tasks
  reasoning_tasks: {
    virtual_model: 'reasoning',
    criteria: {
      supports_reasoning: true,
      min_success_rate: 0.98,
      preferred_providers: ['openai', 'anthropic'],
      max_cost_per_token: 0.01
    },
    expected_load_balancing: 'priority'
  },

  // Scenario 4: Vision and multimodal tasks
  multimodal_tasks: {
    virtual_model: 'vision', 
    criteria: {
      supports_vision: true,
      min_context_length: 128000,
      exclude_blacklisted: true
    },
    expected_load_balancing: 'health_based'
  }
} as const;