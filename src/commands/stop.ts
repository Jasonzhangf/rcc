import { CLICommand } from '../types/cli-types';

const stopCommand: CLICommand = {
  name: 'stop',
  description: 'Stop RCC services',
  options: [
    {
      name: 'port',
      alias: 'p',
      description: 'Port number to stop',
      type: 'number',
      required: false,
    },
  ],
  examples: ['rcc stop --port 4008', 'rcc stop -p 4008'],
  async execute({ args, options, logger }) {
    const port = options.port || 4008; // Default port 4008

    try {
      // Check if PID file exists for this port
      const pidFile = `.rcc/pid-${port}.json`;
      const fs = await import('fs/promises');

      if (await fs.access(pidFile).catch(() => false)) {
        const pidData = JSON.parse(await fs.readFile(pidFile, 'utf-8'));
        const pid = pidData.pid;

        // Kill the process
        process.kill(pid, 'SIGTERM');

        // Remove PID file
        await fs.unlink(pidFile);

        logger.info(`Successfully stopped RCC service on port ${port}`);
      } else {
        logger.warn(`No RCC service found running on port ${port}`);
      }
    } catch (error) {
      logger.error(`Failed to stop RCC service on port ${port}:`, error);
      throw error;
    }
  },
};

export default stopCommand;
