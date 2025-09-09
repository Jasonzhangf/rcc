import type { 
  IModel, 
  IModelVerificationResult,
  ITokenDetectionResult
} from '../../shared/types';

export interface IModelsManager {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  getAll(): Promise<IModel[]>;
  verifyModel(providerId: string, modelId: string): Promise<IModelVerificationResult>;
  detectTokens(providerId: string, modelId: string): Promise<ITokenDetectionResult>;
}

export { IModel, IModelVerificationResult, ITokenDetectionResult } from '../../shared/types';