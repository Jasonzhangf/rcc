import { ModuleInfo } from 'rcc-basemodule';
import { BasePipelineModule } from '../../../modules/BasePipelineModule';
import { CompatibilityConfig } from '../../../modules/CompatibilityModule';
/**
 * JSON Compatibility Module
 * Handles JSON field mapping and schema transformation
 */
export declare class JSONCompatibilityModule extends BasePipelineModule {
    protected config: CompatibilityConfig;
    private fieldMappings;
    constructor(info: ModuleInfo);
    configure(config: CompatibilityConfig): Promise<void>;
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    private initializeFieldMappings;
    private applyFieldMappings;
    private applyReverseFieldMappings;
    private transformFieldValue;
    private transformFieldValueReverse;
    private transformMessagesToContents;
    private transformContentsToMessages;
    private transformTools;
    private transformFunctionDeclarations;
    private validateMappedData;
    private getNestedValue;
    private setNestedValue;
}
/**
 * Default Compatibility Module
 * A flexible implementation that can handle various compatibility scenarios
 */
export declare class DefaultCompatibilityModule extends BasePipelineModule {
    protected config: CompatibilityConfig;
    constructor(info: ModuleInfo);
    configure(config: CompatibilityConfig): Promise<void>;
    process(request: any): Promise<any>;
    processResponse(response: any): Promise<any>;
    private genericCompatibilityProcess;
}
//# sourceMappingURL=CompatibilityImplementations.d.ts.map