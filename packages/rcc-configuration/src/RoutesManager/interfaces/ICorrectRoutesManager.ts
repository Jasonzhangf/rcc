/**
 * 正确的路由管理器接口定义
 * 
 * 基于用户澄清的正确架构：
 * - 虚拟模型类别 (default, longtext, coding, etc.)  
 * - 每个类别包含多个 provider.model 路由
 * - 一个 provider.model = 一条单独路由
 * - 路由来源：pool + config 文件
 * - 网页管理器只负责简化配置生成
 */

import type { IManagerOptions } from '../../shared/types';

// 路由条目 - 一个 provider.model 组合
export interface IRouteEntry {
  id: string;
  provider_id: string;
  provider_name: string; 
  model_id: string;
  model_name: string;
  source: 'pool' | 'config';  // 来源：pool内模型 或 配置文件内模型
  priority: number;
  weight: number;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

// 负载均衡策略配置
export interface ILoadBalancingConfig {
  strategy: 'round_robin' | 'weighted' | 'priority' | 'random' | 'health_based';
  config: {
    total_weight?: number;
    current_index?: number;
    health_threshold?: number;
    [key: string]: any;
  };
}

// 虚拟模型类别
export interface IVirtualModelCategory {
  name: string; // default, longtext, coding, reasoning, etc.
  display_name: string;
  description: string;
  routes: IRouteEntry[];  // 该类别下的所有 provider.model 路由
  load_balancing: ILoadBalancingConfig;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

// 完整路由表配置 - 用于服务器启动解析的简化配置
export interface IRoutingTableConfig {
  virtual_categories: Record<string, IVirtualModelCategory>;
  metadata: {
    version: string;
    created_at: string;
    updated_at: string; 
    description: string;
  };
}

// 可用模型源 - 用于选择添加到路由的模型
export interface IAvailableModelSource {
  provider_id: string;
  provider_name: string;
  model_id: string;
  model_name: string;
  source: 'pool' | 'config';
  context_length?: number;
  supports_code?: boolean;
  supports_reasoning?: boolean;
  supports_vision?: boolean;
  route_compatible: boolean;
  already_routed: boolean; // 是否已经被添加到某个路由类别
  routed_categories?: string[]; // 已被添加到哪些类别
}

// 路由统计信息
export interface IRoutingStats {
  total_categories: number;
  total_routes: number;
  routes_by_source: {
    pool: number;
    config: number;
  };
  routes_by_status: {
    active: number;
    inactive: number;
  };
  load_balancing_strategies: Record<string, number>;
}

// 路由管理器主接口
export interface ICorrectRoutesManager {
  // 生命周期管理
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  
  // ============ 虚拟模型类别管理 ============
  
  /** 获取所有虚拟模型类别 */
  getAllCategories(): Promise<IVirtualModelCategory[]>;
  
  /** 根据名称获取虚拟模型类别 */
  getCategory(name: string): Promise<IVirtualModelCategory | null>;
  
  /** 创建新的虚拟模型类别 */
  createCategory(categoryData: {
    name: string;
    display_name: string;
    description: string;
    load_balancing?: ILoadBalancingConfig;
  }): Promise<IVirtualModelCategory>;
  
  /** 更新虚拟模型类别 */
  updateCategory(name: string, updates: Partial<IVirtualModelCategory>): Promise<IVirtualModelCategory>;
  
  /** 删除虚拟模型类别 */
  deleteCategory(name: string): Promise<boolean>;
  
  // ============ 路由条目管理 ============
  
  /** 获取指定类别下的所有路由 */
  getCategoryRoutes(categoryName: string): Promise<IRouteEntry[]>;
  
  /** 添加路由到指定类别 */
  addRouteToCategory(categoryName: string, routeData: {
    provider_id: string;
    model_id: string;
    source: 'pool' | 'config';
    priority?: number;
    weight?: number;
  }): Promise<IRouteEntry>;
  
  /** 从类别中移除路由 */
  removeRouteFromCategory(categoryName: string, routeId: string): Promise<boolean>;
  
  /** 更新路由配置 */
  updateRoute(categoryName: string, routeId: string, updates: Partial<IRouteEntry>): Promise<IRouteEntry>;
  
  /** 批量添加路由到类别 */
  batchAddRoutesToCategory(categoryName: string, routes: Array<{
    provider_id: string;
    model_id: string; 
    source: 'pool' | 'config';
    weight?: number;
    priority?: number;
  }>): Promise<IRouteEntry[]>;
  
  // ============ 负载均衡配置 ============
  
  /** 更新类别的负载均衡策略 */
  updateLoadBalancing(categoryName: string, config: ILoadBalancingConfig): Promise<void>;
  
  /** 获取类别的负载均衡配置 */
  getLoadBalancing(categoryName: string): Promise<ILoadBalancingConfig | null>;
  
  // ============ 可用模型源管理 ============
  
  /** 获取所有可用的模型源 (pool + config) */
  getAvailableModelSources(options?: {
    exclude_blacklisted?: boolean;
    exclude_already_routed?: boolean;
    category_filter?: string; // 排除已在指定类别中的模型
  }): Promise<IAvailableModelSource[]>;
  
  /** 检查模型是否已被路由 */
  isModelRouted(providerId: string, modelId: string): Promise<{
    routed: boolean;
    categories: string[];
  }>;
  
  // ============ 配置生成和导出 ============
  
  /** 生成完整的路由表配置 - 用于服务器解析 */
  generateRoutingTableConfig(): Promise<IRoutingTableConfig>;
  
  /** 导出路由配置为JSON */
  exportRoutingConfig(): Promise<{
    config: IRoutingTableConfig;
    stats: IRoutingStats;
    exported_at: string;
  }>;
  
  /** 从配置导入路由表 */
  importRoutingConfig(config: IRoutingTableConfig): Promise<{
    imported_categories: number;
    imported_routes: number;
    skipped: number;
    errors: string[];
  }>;
  
  // ============ 统计和验证 ============
  
  /** 获取路由统计信息 */
  getRoutingStats(): Promise<IRoutingStats>;
  
  /** 验证路由配置 */
  validateRoutingConfig(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
  
  /** 检测路由配置冲突 */
  detectRoutingConflicts(): Promise<{
    conflicts: Array<{
      type: 'duplicate_route' | 'missing_model' | 'invalid_provider';
      category: string;
      route_id: string;
      description: string;
    }>;
  }>;
}

// 路由管理器选项
export interface ICorrectRoutesManagerOptions extends IManagerOptions {
  /** 是否自动创建默认类别 */
  autoCreateDefaultCategories?: boolean;
  /** 默认负载均衡策略 */
  defaultLoadBalancingStrategy?: ILoadBalancingConfig['strategy'];
  /** 是否启用路由验证 */
  enableRouteValidation?: boolean;
  /** 最大路由数量限制 */
  maxRoutesPerCategory?: number;
}