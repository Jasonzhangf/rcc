/**
 * Argument Parser for RCC CLI Framework
 */

import minimist from 'minimist';

export interface ParsedArguments {
  command: string;
  subcommand?: string;
  options: Record<string, any>;
  flags: Record<string, boolean>;
  args: string[];
}

export class ArgumentParser {
  parse(args: string[]): ParsedArguments {
    if (args.length === 0) {
      return {
        command: 'help',
        options: {},
        flags: {},
        args: []
      };
    }

    // Parse using minimist
    const parsed = minimist(args, {
      boolean: ['help', 'version', 'debug', 'verbose', 'daemon', 'force'],
      string: ['port', 'host', 'config', 'protocol', 'log-level'],
      alias: {
        'h': 'help',
        'v': 'version',
        'd': 'debug',
        'p': 'port',
        'c': 'config'
      },
      default: {}
    });

    // Extract command and subcommand
    const [command, subcommand] = parsed._;
    
    // Separate options and flags
    const options: Record<string, any> = {};
    const flags: Record<string, boolean> = {};
    
    for (const [key, value] of Object.entries(parsed)) {
      if (key === '_') continue;
      
      if (typeof value === 'boolean') {
        flags[key] = value;
      } else {
        options[key] = value;
      }
    }

    return {
      command: command || 'help',
      subcommand,
      options,
      flags,
      args: parsed._.slice(subcommand ? 2 : 1)
    };
  }

  validateOptions(_options: Record<string, any>, _schema: any): boolean {
    // Basic validation logic
    // This could be extended with more sophisticated validation
    return true;
  }

  normalizeCommand(command: string): string {
    return command.toLowerCase().trim();
  }

  expandAliases(command: string, aliases: Record<string, string>): string {
    return aliases[command] || command;
  }
}