/**
 * Dynamic Routing Configuration Types
 * 动态路由配置类型
 */

export interface RoutingTarget {
  providerId: string;
  modelId: string;
  weight?: number;
  enabled?: boolean;
  keyIndex?: number;
}

export interface DynamicRoutingConfig {
  id: string;
  name: string;
  description?: string;
  modelId: string;
  provider: string;
  endpoint?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  enabled: boolean;
  targets?: RoutingTarget[];
  capabilities?: string[];
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutingRule {
  id: string;
  routingId: string;
  pattern: string;
  priority: number;
  condition: {
    field: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
    value: string;
  };
  action: {
    type: 'route' | 'modify' | 'block';
    target?: string;
    modifications?: Record<string, any>;
  };
  enabled: boolean;
  description?: string;
}

export interface DynamicRoutingManager {
  id: string;
  name: string;
  description?: string;
  defaultModelId: string;
  rules: RoutingRule[];
  fallbackStrategy: 'first-available' | 'round-robin' | 'weighted';
  enabled: boolean;
  metadata?: Record<string, any>;
}