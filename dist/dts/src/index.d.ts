import stopCommand from './commands/stop';
import codeCommand from './commands/code';
import restartCommand from './commands/restart';
import * as CLI_TYPES from './types/cli-types';
export { stopCommand, codeCommand, restartCommand, CLI_TYPES };
export declare const defaultCLIConfig: {
    name: string;
    version: string;
    description: string;
    commandDiscovery: {
        commandDirs: string[];
        modulePatterns: string[];
        autoLoad: boolean;
        watchForChanges: boolean;
    };
    defaultCommand: string;
};
