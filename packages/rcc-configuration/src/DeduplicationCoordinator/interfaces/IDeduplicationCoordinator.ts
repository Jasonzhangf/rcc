import type { 
  IDeduplicationResult, 
  IDeduplicationOptions 
} from '../../shared/types';

export interface IDeduplicationCoordinator {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  performDeduplication(): Promise<IDeduplicationResult>;
  scheduleDeduplication(intervalMs: number): void;
  stopScheduledDeduplication(): void;
}

export { IDeduplicationResult, IDeduplicationOptions } from '../../shared/types';