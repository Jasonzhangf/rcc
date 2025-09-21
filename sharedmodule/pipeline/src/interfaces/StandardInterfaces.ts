/**
 * Standard Interfaces for RCC Pipeline System
 * RCC流水线系统的标准接口
 */

import { ProtocolType } from './ModularInterfaces';

/**
 * Standard Request Interface
 */
export interface StandardRequest {
  protocol: ProtocolType;
  payload: any;
  metadata?: {
    traceId?: string;
    sessionId?: string;
    requestId?: string;
    timestamp?: number;
    source?: string;
    target?: string;
    [key: string]: any;
  };
}

/**
 * Standard Response Interface
 */
export interface StandardResponse {
  protocol: ProtocolType;
  payload: any;
  metadata?: {
    traceId?: string;
    sessionId?: string;
    requestId?: string;
    timestamp?: number;
    processingTime?: number;
    duration?: number;
    source?: string;
    target?: string;
    transformerName?: string;
    [key: string]: any;
  };
}

/**
 * Standard Error Response Interface
 */
export interface StandardErrorResponse {
  protocol: ProtocolType;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
  metadata?: {
    traceId?: string;
    sessionId?: string;
    requestId?: string;
    timestamp?: number;
    processingTime?: number;
    source?: string;
    target?: string;
    [key: string]: any;
  };
}