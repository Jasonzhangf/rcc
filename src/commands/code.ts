import { CLICommand } from '../types/cli-types';

const codeCommand: CLICommand = {
  name: 'code',
  description: 'Configure local environment and call Claude',
  options: [
    {
      name: 'port',
      alias: 'p',
      description: 'Port number to use',
      type: 'number',
      required: false,
    },
    {
      name: 'config',
      alias: 'c',
      description: 'Configuration file path',
      type: 'string',
      required: false,
    },
  ],
  examples: [
    'rcc code',
    'rcc code --port 4008',
    'rcc code --config ~/.route-claudecode/config/v4/single-provider/lmstudio-v4-4008.json',
  ],
  async execute({ args, options, logger }) {
    const port = options.port || 4008; // Default port 4008
    const configPath =
      options.config || `~/.route-claudecode/config/v4/single-provider/lmstudio-v4-${port}.json`;

    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { spawn } = await import('child_process');

      // Check if service is already running
      const pidFile = `.rcc/pid-${port}.json`;
      let serviceRunning = false;

      if (await fs.access(pidFile).catch(() => false)) {
        try {
          const pidData = JSON.parse(await fs.readFile(pidFile, 'utf-8'));
          process.kill(pidData.pid, 0); // Check if process is running
          serviceRunning = true;
          logger.info(`RCC service already running on port ${port}`);
        } catch (error) {
          // Process not running, remove stale PID file
          await fs.unlink(pidFile);
        }
      }

      // Start service if not running
      if (!serviceRunning) {
        logger.info(`Starting RCC service on port ${port}...`);

        // Ensure .rcc directory exists
        await fs.mkdir('.rcc', { recursive: true });

        // Start the service
        const child = spawn(
          'node',
          ['start-rcc-system.mjs', '--config', configPath, '--port', port],
          {
            detached: true,
            stdio: 'ignore',
          }
        );

        // Create PID file
        const pidData = {
          pid: child.pid,
          configPath,
          startTime: new Date().toISOString(),
        };
        await fs.writeFile(pidFile, JSON.stringify(pidData, null, 2));

        child.unref();
        logger.info(`RCC service started on port ${port} with PID ${child.pid}`);

        // Wait a moment for service to start
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Configure environment and call Claude
      logger.info('Configuring local environment for Claude...');

      // Set environment variables
      process.env.ANTHROPIC_BASE_URL = `http://localhost:${port}`;
      process.env.ANTHROPIC_API_KEY = 'rcc4-proxy-key';

      // Execute Claude command
      const claudeArgs = args.length > 0 ? args : ['--print', '列出本目录中所有文件夹'];

      logger.info(`Executing Claude with args: ${claudeArgs.join(' ')}`);

      const claudeProcess = spawn('claude', claudeArgs, {
        stdio: 'inherit',
        env: {
          ...process.env,
          ANTHROPIC_BASE_URL: `http://localhost:${port}`,
          ANTHROPIC_API_KEY: 'rcc4-proxy-key',
        },
      });

      // Wait for Claude to complete
      await new Promise((resolve, reject) => {
        claudeProcess.on('exit', (code) => {
          if (code === 0) {
            resolve(code);
          } else {
            reject(new Error(`Claude exited with code ${code}`));
          }
        });

        claudeProcess.on('error', reject);
      });

      logger.info('Claude execution completed');
    } catch (error) {
      logger.error('Failed to execute code command:', error);
      throw error;
    }
  },
};

export default codeCommand;
