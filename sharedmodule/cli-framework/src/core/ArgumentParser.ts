import { ICommand, CommandOption } from '../types';

export interface ParsedArguments {
  command: string;
  args: string[];
  options: Record<string, unknown>;
}

export class ArgumentParser {
  parse(argv: string[]): ParsedArguments {
    const args = argv.slice(2); // Remove node and script path
    
    if (args.length === 0) {
      return {
        command: '',
        args: [],
        options: {} as Record<string, unknown>
      };
    }

    const result: ParsedArguments = {
      command: args[0],
      args: [],
      options: {} as Record<string, unknown>
    };

    let i = 1;
    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        // Long option: --option or --option=value
        const optionName = arg.slice(2);
        const equalsIndex = optionName.indexOf('=');
        
        if (equalsIndex !== -1) {
          // --option=value format
          const name = optionName.slice(0, equalsIndex);
          const value = optionName.slice(equalsIndex + 1);
          result.options[name] = this.parseOptionValue(value);
        } else {
          // --option format
          if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
            // Option with value: --option value
            result.options[optionName] = this.parseOptionValue(args[i + 1]);
            i++; // Skip the value
          } else {
            // Boolean flag: --option
            result.options[optionName] = true;
          }
        }
      } else if (arg.startsWith('-')) {
        // Short option: -a or -abc or -a value
        const options = arg.slice(1);
        
        if (options.length > 1) {
          // Combined short flags: -abc
          for (const char of options) {
            result.options[char] = true;
          }
        } else {
          // Single short option: -a or -a value
          const optionName = options;
          if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
            result.options[optionName] = this.parseOptionValue(args[i + 1]);
            i++; // Skip the value
          } else {
            result.options[optionName] = true;
          }
        }
      } else {
        // Positional argument
        result.args.push(arg);
      }

      i++;
    }

    return result;
  }

  parseWithCommand(argv: string[], command: ICommand): ParsedArguments {
    const result = this.parse(argv);
    
    if (command.options) {
      this.validateOptions(result.options, command.options);
      this.applyOptionDefaults(result.options, command.options);
    }

    return result;
  }

  private parseOptionValue(value: string): string | number | boolean {
    // Try to parse as number
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return Number(value);
    }

    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Return as string
    return value;
  }

  private validateOptions(options: Record<string, unknown>, commandOptions: CommandOption[]): void {
    for (const option of commandOptions) {
      if (option.required && !(option.name in options)) {
        throw new Error(`Option --${option.name} is required`);
      }

      if (option.type === 'boolean' && (option.name in options) && typeof options[option.name] !== 'boolean') {
        throw new Error(`Option --${option.name} must be a boolean`);
      }

      if (option.type === 'number' && (option.name in options) && typeof options[option.name] !== 'number') {
        throw new Error(`Option --${option.name} must be a number`);
      }
    }

    // Check for unknown options
    for (const optionName in options) {
      if (!commandOptions.some(opt => opt.name === optionName || opt.alias === optionName)) {
        throw new Error(`Unknown option: ${optionName}`);
      }
    }
  }

  private applyOptionDefaults(options: Record<string, unknown>, commandOptions: CommandOption[]): void {
    for (const option of commandOptions) {
      if (option.default !== undefined && !(option.name in options)) {
        options[option.name] = option.default;
      }

      // Handle aliases
      if (option.alias && (option.alias in options) && !(option.name in options)) {
        options[option.name] = options[option.alias];
        delete options[option.alias];
      }
    }
  }

  generateHelp(command: ICommand): string {
    const lines: string[] = [];

    lines.push(`Usage: rcc ${command.name} [options]${command.usage ? ' ' + command.usage : ''}`);
    lines.push('');
    lines.push(command.description);
    lines.push('');

    if (command.options && command.options.length > 0) {
      lines.push('Options:');
      
      for (const option of command.options) {
        const optionParts: string[] = [];
        
        if (option.alias) {
          optionParts.push(`-${option.alias}`);
        }
        
        optionParts.push(`--${option.name}`);
        
        const defaultValue = option.default !== undefined ? ` [default: ${option.default}]` : '';
        const required = option.required ? ' (required)' : '';
        
        lines.push(`  ${optionParts.join(', ')}${option.type !== 'boolean' ? ' <value>' : ''}${defaultValue}${required}`);
        lines.push(`      ${option.description}`);
        lines.push('');
      }
    }

    if (command.aliases && command.aliases.length > 0) {
      lines.push(`Aliases: ${command.aliases.join(', ')}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  generateGlobalHelp(commands: ICommand[]): string {
    const lines: string[] = [];

    lines.push('Usage: rcc <command> [options]');
    lines.push('');
    lines.push('Available commands:');
    lines.push('');

    // Group commands by category or sort alphabetically
    const sortedCommands = commands.sort((a, b) => a.name.localeCompare(b.name));

    for (const command of sortedCommands) {
      lines.push(`  ${command.name.padEnd(15)} ${command.description}`);
    }

    lines.push('');
    lines.push('Use "rcc <command> --help" for more information about a specific command.');

    return lines.join('\n');
  }
}