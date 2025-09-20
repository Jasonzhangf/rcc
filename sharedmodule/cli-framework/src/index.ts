import { CLIEngine } from './core/CLIEngine';
export { CLIEngine } from './core/CLIEngine';
export { CommandRegistry } from './core/CommandRegistry';
export { ArgumentParser } from './core/ArgumentParser';
export * from './types';

// Export built-in commands
export { startCommand } from './commands/start';
export { stopCommand } from './commands/stop';
export { codeCommand } from './commands/code';

import * as path from 'path';
import * as url from 'url';

// Get current directory for ES modules
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default CLI engine configuration
export const defaultCLIConfig = {
  name: 'rcc',
  version: '1.0.0',
  description: 'RCC Command Line Interface Framework',
  commandDiscovery: {
    commandDirs: [
      // Built-in commands
      path.join(__dirname, 'commands'),
      // Project-specific commands
      path.join(process.cwd(), 'commands'),
      path.join(process.cwd(), 'src/commands')
    ],
    modulePatterns: [
      'rcc-command-*',
      '@rcc/command-*'
    ],
    autoLoad: true,
    watchForChanges: process.env.NODE_ENV === 'development'
  },
  defaultCommand: 'help'
};

// Create default CLI engine instance
export const cliEngine = new CLIEngine(defaultCLIConfig);

// Utility function for quick command execution
export async function executeCommand(argv: string[] = process.argv): Promise<void> {
  await cliEngine.initialize();
  return cliEngine.execute(argv);
}
