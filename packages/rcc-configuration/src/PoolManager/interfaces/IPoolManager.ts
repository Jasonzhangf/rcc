import type { IPoolEntry, IPoolOptions } from '../../shared/types';

export interface IPoolManager {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  getAll(): Promise<IPoolEntry[]>;
  add(entry: Omit<IPoolEntry, 'id'>): Promise<IPoolEntry>;
  remove(id: string): Promise<boolean>;
  isInPool(providerId: string, modelId: string): Promise<boolean>;
}

export { IPoolEntry, IPoolOptions } from '../../shared/types';