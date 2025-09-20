/**
 * Standard Interfaces for RCC Pipeline System
 * RCC流水线系统的标准接口
 */

/**
 * Standard Request Interface
 */
export interface StandardRequest {
  protocol: string;
  payload: any;
  metadata?: {
    traceId?: string;
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
  protocol: string;
  payload: any;
  metadata?: {
    traceId?: string;
    timestamp?: number;
    duration?: number;
    source?: string;
    target?: string;
    [key: string]: any;
  };
}

/**
 * Standard Error Response Interface
 */
export interface StandardErrorResponse {
  protocol: string;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
  metadata?: {
    traceId?: string;
    timestamp?: number;
    source?: string;
    target?: string;
    [key: string]: any;
  };
}