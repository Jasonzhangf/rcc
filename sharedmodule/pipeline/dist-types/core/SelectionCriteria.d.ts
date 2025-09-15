/**
 * Selection Criteria for choosing node implementations
 */
export interface SelectionCriteria {
    /** Node identifier */
    nodeId?: string;
    /** Node type */
    nodeType: string;
    /** Input protocol requirement */
    inputProtocol?: string;
    /** Output protocol requirement */
    outputProtocol?: string;
    /** Input format requirement */
    inputFormat?: string;
    /** Output format requirement */
    outputFormat?: string;
    /** Required capabilities */
    requirements?: string[];
    /** Preferred implementations */
    preferences?: {
        implementationId?: string;
        priority?: number;
        tags?: string[];
    };
    /** Performance requirements */
    performance?: {
        maxLatency?: number;
        minThroughput?: number;
    };
    /** Context information for matching */
    context?: any;
}
//# sourceMappingURL=SelectionCriteria.d.ts.map