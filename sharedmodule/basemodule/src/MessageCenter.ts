// Re-export the refactored MessageCenter for backward compatibility
export { MessageCenter } from './messagecenter/MessageCenter';

// Also export the individual components for advanced usage
export { ModuleRegistry } from './messagecenter/ModuleRegistry';
export { RequestManager } from './messagecenter/RequestManager';
export { MessageProcessor } from './messagecenter/MessageProcessor';
export { StatisticsTracker } from './messagecenter/StatisticsTracker';
