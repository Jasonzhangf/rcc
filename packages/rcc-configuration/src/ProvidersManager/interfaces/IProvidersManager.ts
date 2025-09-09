/**
 * ProvidersManager Interface Definitions
 */

import type { 
  IProvider, 
  IProviderTestResult,
  IProviderOptions,
  IValidationResult
} from '../../shared/types';

export interface IProvidersManager {
  // Lifecycle methods
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  // Provider CRUD operations
  getAll(): Promise<IProvider[]>;
  getById(id: string): Promise<IProvider | null>;
  create(providerData: Omit<IProvider, 'id' | 'created_at' | 'updated_at'>): Promise<IProvider>;
  update(id: string, updates: Partial<IProvider>): Promise<IProvider>;
  delete(id: string): Promise<boolean>;

  // Provider testing and validation
  testProvider(id: string): Promise<IProviderTestResult>;
  testAllProviders(): Promise<IProviderTestResult[]>;
  validateProvider(provider: Partial<IProvider>): Promise<IValidationResult>;

  // Model discovery
  discoverModels(id: string): Promise<IProvider>;
}

export { IProvider, IProviderTestResult, IProviderOptions } from '../../shared/types';