/**
 * 虚拟模型路由表管理 API
 * 
 * 正确实现虚拟模型类别到 provider.model 的映射关系
 */

const fs = require('fs');
const path = require('path');

// Default virtual model categories (English)
const DEFAULT_VIRTUAL_CATEGORIES = {
  "default": {
    name: "default",
    display_name: "General Models",
    description: "General-purpose models suitable for most tasks",
    routes: [],
    load_balancing: {
      strategy: "round_robin",
      config: {}
    },
    status: "active",
    created_at: new Date().toISOString()
  },
  "longtext": {
    name: "longtext",
    display_name: "Long Text Processing",
    description: "Models specialized for long text processing",
    routes: [],
    load_balancing: {
      strategy: "weighted",
      config: { total_weight: 0 }
    },
    status: "active",
    created_at: new Date().toISOString()
  },
  "coding": {
    name: "coding",
    display_name: "Code Generation",
    description: "Models specialized for code generation tasks",
    routes: [],
    load_balancing: {
      strategy: "priority",
      config: {}
    },
    status: "active",
    created_at: new Date().toISOString()
  },
  "reasoning": {
    name: "reasoning",
    display_name: "Reasoning & Analysis",
    description: "Models specialized for logical reasoning and analysis",
    routes: [],
    load_balancing: {
      strategy: "weighted",
      config: { total_weight: 0 }
    },
    status: "active",
    created_at: new Date().toISOString()
  },
  "background": {
    name: "background",
    display_name: "Background Processing",
    description: "Models suitable for background and batch processing tasks",
    routes: [],
    load_balancing: {
      strategy: "round_robin",
      config: {}
    },
    status: "active",
    created_at: new Date().toISOString()
  },
  "websearch": {
    name: "websearch",
    display_name: "Web Search",
    description: "Models specialized for web search and information retrieval",
    routes: [],
    load_balancing: {
      strategy: "weighted",
      config: { total_weight: 0 }
    },
    status: "active",
    created_at: new Date().toISOString()
  }
};

class VirtualRoutesManager {
  constructor(configManager, providersManager, poolManager) {
    this.configManager = configManager;
    this.providersManager = providersManager;
    this.poolManager = poolManager;
    this.virtualCategories = { ...DEFAULT_VIRTUAL_CATEGORIES };
    this.loadFromConfig();
  }

  loadFromConfig() {
    try {
      const config = this.configManager.getConfig();
      if (config.virtual_routes) {
        // Check if existing categories have English display names
        const hasEnglishNames = Object.values(config.virtual_routes).some(cat => 
          cat.display_name && /^[a-zA-Z\s&]+$/.test(cat.display_name)
        );
        
        if (hasEnglishNames) {
          // Use existing English configuration
          this.virtualCategories = { ...this.virtualCategories, ...config.virtual_routes };
        } else {
          // Replace with English defaults and preserve routes
          const newCategories = { ...DEFAULT_VIRTUAL_CATEGORIES };
          
          // Preserve routes from existing categories if they match
          Object.keys(config.virtual_routes).forEach(categoryName => {
            if (newCategories[categoryName] && config.virtual_routes[categoryName].routes) {
              newCategories[categoryName].routes = config.virtual_routes[categoryName].routes;
              newCategories[categoryName].load_balancing = config.virtual_routes[categoryName].load_balancing || newCategories[categoryName].load_balancing;
              newCategories[categoryName].updated_at = config.virtual_routes[categoryName].updated_at;
            }
          });
          
          this.virtualCategories = newCategories;
          this.saveToConfig(); // Save the English version
        }
      } else {
        // Check if we need to add missing categories to existing English config
        const existingCategories = Object.keys(config.virtual_routes || {});
        const defaultCategories = Object.keys(DEFAULT_VIRTUAL_CATEGORIES);
        const missingCategories = defaultCategories.filter(cat => !existingCategories.includes(cat));
        
        if (missingCategories.length > 0) {
          // Add missing categories
          this.virtualCategories = { ...config.virtual_routes };
          missingCategories.forEach(categoryName => {
            this.virtualCategories[categoryName] = { ...DEFAULT_VIRTUAL_CATEGORIES[categoryName] };
          });
          this.saveToConfig(); // Save with new categories
        }
      }
    } catch (error) {
      console.log('Using default virtual categories');
    }
  }

  saveToConfig() {
    try {
      const config = this.configManager.getConfig();
      config.virtual_routes = this.virtualCategories;
      this.configManager.saveConfig(config);
    } catch (error) {
      console.error('Failed to save virtual routes:', error);
    }
  }

  // 获取所有虚拟模型类别
  getAllCategories() {
    return Object.values(this.virtualCategories);
  }

  // 获取指定类别
  getCategory(name) {
    return this.virtualCategories[name] || null;
  }

  // 创建新类别
  createCategory(categoryData) {
    const { name, display_name, description, load_balancing } = categoryData;
    
    if (this.virtualCategories[name]) {
      throw new Error(`Category ${name} already exists`);
    }

    this.virtualCategories[name] = {
      name,
      display_name,
      description,
      routes: [],
      load_balancing: load_balancing || { strategy: "round_robin", config: {} },
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.saveToConfig();
    return this.virtualCategories[name];
  }

  // 删除类别
  deleteCategory(name) {
    if (!this.virtualCategories[name]) {
      return false;
    }

    delete this.virtualCategories[name];
    this.saveToConfig();
    return true;
  }

  // 获取可用的模型源 (pool + config)
  async getAvailableModelSources() {
    const sources = [];

    try {
      // 从配置文件获取模型
      const config = this.configManager.getConfig();
      if (config.providers) {
        config.providers.forEach(provider => {
          if (provider.models) {
            provider.models.forEach(model => {
              sources.push({
                provider_id: provider.id,
                provider_name: provider.name,
                model_id: model.id,
                model_name: model.name,
                source: 'config',
                context_length: model.context_length,
                supports_code: model.supports_code,
                supports_reasoning: model.supports_reasoning,
                route_compatible: true
              });
            });
          }
        });
      }

      // 从Pool获取模型
      if (this.poolManager) {
        const poolEntries = this.poolManager.getAll();
        poolEntries.forEach(entry => {
          // 找到对应的provider和model信息
          const provider = config.providers.find(p => p.id === entry.providerId);
          if (provider) {
            const model = provider.models.find(m => m.id === entry.modelId);
            if (model) {
              sources.push({
                provider_id: provider.id,
                provider_name: provider.name,
                model_id: model.id,
                model_name: model.name,
                source: 'pool',
                context_length: model.context_length,
                supports_code: model.supports_code,
                supports_reasoning: model.supports_reasoning,
                route_compatible: true
              });
            }
          }
        });
      }
    } catch (error) {
      console.error('Error getting available model sources:', error);
    }

    return sources;
  }

  // 添加路由到类别
  addRouteToCategory(categoryName, routeData) {
    const category = this.virtualCategories[categoryName];
    if (!category) {
      throw new Error(`Category ${categoryName} not found`);
    }

    // 检查是否已存在相同的路由
    const existingRoute = category.routes.find(route => 
      route.provider_id === routeData.provider_id && 
      route.model_id === routeData.model_id
    );

    if (existingRoute) {
      throw new Error(`Route for ${routeData.provider_id}.${routeData.model_id} already exists in ${categoryName}`);
    }

    const newRoute = {
      id: `route-${categoryName}-${routeData.provider_id}-${routeData.model_id}-${Date.now()}`,
      provider_id: routeData.provider_id,
      provider_name: routeData.provider_name,
      model_id: routeData.model_id,
      model_name: routeData.model_name,
      source: routeData.source,
      priority: routeData.priority || 1,
      weight: routeData.weight || 1,
      status: 'active',
      created_at: new Date().toISOString()
    };

    category.routes.push(newRoute);
    category.updated_at = new Date().toISOString();

    // 更新负载均衡配置
    if (category.load_balancing.strategy === 'weighted') {
      const totalWeight = category.routes.reduce((sum, route) => sum + (route.weight || 1), 0);
      category.load_balancing.config.total_weight = totalWeight;
    }

    this.saveToConfig();
    return newRoute;
  }

  // 从类别移除路由
  removeRouteFromCategory(categoryName, routeId) {
    const category = this.virtualCategories[categoryName];
    if (!category) {
      return false;
    }

    const routeIndex = category.routes.findIndex(route => route.id === routeId);
    if (routeIndex === -1) {
      return false;
    }

    category.routes.splice(routeIndex, 1);
    category.updated_at = new Date().toISOString();

    // 更新负载均衡配置
    if (category.load_balancing.strategy === 'weighted') {
      const totalWeight = category.routes.reduce((sum, route) => sum + (route.weight || 1), 0);
      category.load_balancing.config.total_weight = totalWeight;
    }

    this.saveToConfig();
    return true;
  }

  // 生成路由表配置
  generateRoutingTableConfig() {
    return {
      virtual_categories: this.virtualCategories,
      metadata: {
        version: "1.0.0",
        created_at: new Date().toISOString(),
        description: "虚拟模型路由配置表 - 用于服务器启动解析"
      }
    };
  }

  // 获取路由统计
  getRoutingStats() {
    const categories = Object.values(this.virtualCategories);
    const totalRoutes = categories.reduce((sum, cat) => sum + cat.routes.length, 0);
    
    const routesBySource = {
      pool: 0,
      config: 0
    };

    const strategyCounts = {};

    categories.forEach(category => {
      category.routes.forEach(route => {
        routesBySource[route.source] = (routesBySource[route.source] || 0) + 1;
      });

      const strategy = category.load_balancing.strategy;
      strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;
    });

    return {
      total_categories: categories.length,
      total_routes: totalRoutes,
      routes_by_source: routesBySource,
      load_balancing_strategies: strategyCounts
    };
  }
}

// API处理函数
function handleVirtualRoutesAPI(req, res, configManager, providersManager, poolManager) {
  const routesManager = new VirtualRoutesManager(configManager, providersManager, poolManager);
  const url = req.url;
  const method = req.method;

  try {
    // GET /api/virtual-routes - 获取所有虚拟类别
    if (method === 'GET' && url === '/api/virtual-routes') {
      const categories = routesManager.getAllCategories();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(categories));
      return;
    }

    // GET /api/virtual-routes/available-models - 获取可用模型源
    if (method === 'GET' && url === '/api/virtual-routes/available-models') {
      routesManager.getAvailableModelSources().then(sources => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sources));
      }).catch(error => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      });
      return;
    }

    // GET /api/virtual-routes/stats - 获取路由统计
    if (method === 'GET' && url === '/api/virtual-routes/stats') {
      const stats = routesManager.getRoutingStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
      return;
    }

    // GET /api/virtual-routes/export - 导出路由配置
    if (method === 'GET' && url === '/api/virtual-routes/export') {
      const config = routesManager.generateRoutingTableConfig();
      const stats = routesManager.getRoutingStats();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        config,
        stats,
        exported_at: new Date().toISOString()
      }));
      return;
    }

    // POST /api/virtual-routes/categories - 创建新类别
    if (method === 'POST' && url === '/api/virtual-routes/categories') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const categoryData = JSON.parse(body);
          const newCategory = routesManager.createCategory(categoryData);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(newCategory));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // POST /api/virtual-routes/categories/:name/routes - 添加路由到类别
    const addRouteMatch = url.match(/^\/api\/virtual-routes\/categories\/([^\/]+)\/routes$/);
    if (method === 'POST' && addRouteMatch) {
      const categoryName = decodeURIComponent(addRouteMatch[1]);
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const routeData = JSON.parse(body);
          const newRoute = routesManager.addRouteToCategory(categoryName, routeData);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(newRoute));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
      return;
    }

    // DELETE /api/virtual-routes/categories/:name/routes/:routeId - 移除路由
    const deleteRouteMatch = url.match(/^\/api\/virtual-routes\/categories\/([^\/]+)\/routes\/([^\/]+)$/);
    if (method === 'DELETE' && deleteRouteMatch) {
      const categoryName = decodeURIComponent(deleteRouteMatch[1]);
      const routeId = decodeURIComponent(deleteRouteMatch[2]);
      
      const success = routesManager.removeRouteFromCategory(categoryName, routeId);
      if (success) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Route not found' }));
      }
      return;
    }

    // 404 - API not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API endpoint not found' }));

  } catch (error) {
    console.error('Virtual Routes API Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

module.exports = { handleVirtualRoutesAPI, VirtualRoutesManager };