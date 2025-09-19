import stopCommand from './commands/stop';
import codeCommand from './commands/code';
import restartCommand from './commands/restart';
import * as CLI_TYPES from './types/cli-types';

export { stopCommand, codeCommand, restartCommand, CLI_TYPES };

// Default CLI engine configuration
export const defaultCLIConfig = {
  name: 'rcc',
  version: '1.0.0',
  description: 'RCC Command Line Interface Framework',
  commandDiscovery: {
    commandDirs: [
      // Built-in commands
      import.meta.url + '/commands',
      // Project-specific commands
      process.cwd() + '/commands',
      process.cwd() + '/src/commands',
    ],
    modulePatterns: ['rcc-command-*', '@rcc/command-*'],
    autoLoad: true,
    watchForChanges: process.env.NODE_ENV === 'development',
  },
  defaultCommand: 'help',
};
