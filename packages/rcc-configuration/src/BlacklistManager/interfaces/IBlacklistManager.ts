import type { IBlacklistEntry, IBlacklistOptions } from '../../shared/types';

export interface IBlacklistManager {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  getAll(): Promise<IBlacklistEntry[]>;
  add(entry: Omit<IBlacklistEntry, 'id'>): Promise<IBlacklistEntry>;
  remove(id: string): Promise<boolean>;
  isBlacklisted(providerId: string, modelId: string): Promise<boolean>;
}

export { IBlacklistEntry, IBlacklistOptions } from '../../shared/types';