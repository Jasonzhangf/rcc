# RCC Debug Center

统一的流水线记录和调试协调中心，提供完整的调试事件总线和会话管理功能。

## Features

- **统一流水线记录**: 提供一致的流水线操作记录格式
- **事件驱动架构**: 通过 DebugEventBus 实现模块间的解耦通信
- **会话管理**: 完整的流水线会话生命周期管理
- **多种导出格式**: 支持 JSON、CSV、NDJSON 格式导出
- **实时统计**: 提供详细的操作统计和性能指标
- **文件持久化**: 自动保存调试记录到文件系统
- **类型安全**: 完整的 TypeScript 类型定义

## Installation

```bash
npm install rcc-debugcenter
```

## Quick Start

```typescript
import { DebugCenter } from 'rcc-debugcenter';

// Create debug center instance
const debugCenter = new DebugCenter({
  enabled: true,
  baseDirectory: '~/.rcc/debug',
  enableFileLogging: true
});

// Start a pipeline session
const sessionId = debugCenter.startPipelineSession(
  'my-pipeline',
  'My Pipeline',
  { version: '1.0.0' }
);

// Record operations
debugCenter.recordOperation(
  sessionId,
  'data-processor',
  'process-data',
  { input: 'raw data' },
  { output: 'processed data' },
  'processMethod',
  true
);

// End session
debugCenter.endPipelineSession(sessionId, true);

// Export data
const exportData = debugCenter.exportData({
  format: 'json',
  includeStats: true
});
console.log(exportData);
```

## API Reference

### DebugCenter

Main class for managing debug operations and pipeline recording.

#### Constructor

```typescript
constructor(config?: Partial<DebugCenterConfig>)
```

#### Methods

- `startPipelineSession(pipelineId, pipelineName?, metadata?)`: Start a new pipeline session
- `endPipelineSession(sessionId, success?, error?)`: End a pipeline session
- `recordOperation(sessionId, moduleId, operationId, input, output, method?, success?, error?, position?, context?)`: Record a module operation
- `recordPipelineStart(sessionId, pipelineId, pipelineName?, input?, context?)`: Record pipeline start
- `recordPipelineEnd(sessionId, pipelineId, pipelineName?, output?, success?, error?, context?)`: Record pipeline end
- `getPipelineEntries(options?)`: Get pipeline entries with optional filtering
- `getActiveSession(sessionId)`: Get active session by ID
- `getActiveSessions()`: Get all active sessions
- `exportData(options)`: Export pipeline data in various formats
- `getStats()`: Get recording statistics
- `subscribe(eventType, callback)`: Subscribe to debug center events
- `updateConfig(updates)`: Update configuration
- `clear()`: Clear all data

### DebugEventBus

Event bus for cross-module debug communication.

#### Methods

- `publish(event)`: Publish a debug event
- `subscribe(eventType, callback)`: Subscribe to events
- `unsubscribe(eventType, callback)`: Unsubscribe from events
- `getRecentEvents(limit?, type?)`: Get recent events
- `clear()`: Clear event queue

## Configuration

```typescript
interface DebugCenterConfig {
  enabled: boolean;
  level: DebugLevel;
  recordStack: boolean;
  maxLogEntries: number;
  consoleOutput: boolean;
  trackDataFlow: boolean;
  enableFileLogging: boolean;
  maxFileSize: number;
  maxLogFiles: number;
  baseDirectory: string;
  pipelineIO: {
    enabled: boolean;
    autoRecordPipelineStart: boolean;
    autoRecordPipelineEnd: boolean;
    pipelineSessionFileName: string;
    pipelineDirectory: string;
    recordAllOperations: boolean;
    includeModuleContext: boolean;
    includeTimestamp: boolean;
    includeDuration: boolean;
    maxPipelineOperationsPerFile: number;
  };
  eventBus: {
    enabled: boolean;
    maxSubscribers: number;
    eventQueueSize: number;
  };
}
```

## Integration with BaseModule

The DebugCenter is designed to work seamlessly with RCC BaseModule through the DebugEventBus:

```typescript
import { BaseModule } from 'rcc-basemodule';
import { DebugEventBus } from 'rcc-debugcenter';

class MyModule extends BaseModule {
  constructor() {
    super({
      id: 'my-module',
      name: 'My Module',
      version: '1.0.0'
    });
  }

  async processData(data: any) {
    // I/O tracking is automatically handled through DebugEventBus
    this.startIOTracking('process-data', data, 'processData');
    
    try {
      const result = await this.actualProcessing(data);
      this.endIOTracking('process-data', result, true);
      return result;
    } catch (error) {
      this.endIOTracking('process-data', null, false, error.message);
      throw error;
    }
  }
}
```

## Events

The DebugCenter emits the following events:

- `pipelineEntry`: When a new pipeline entry is recorded
- `sessionStart`: When a pipeline session starts
- `sessionEnd`: When a pipeline session ends

## License

MIT
