import { CLICommand } from '../types/cli-types';

const restartCommand: CLICommand = {
  name: 'restart',
  description: 'Restart all running RCC services',
  options: [],
  examples: ['rcc restart'],
  async execute({ args, options, logger }) {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Find all PID files in .rcc directory
      const pidDir = '.rcc';
      const restartTasks = [];

      if (await fs.access(pidDir).catch(() => false)) {
        const files = await fs.readdir(pidDir);
        const pidFiles = files.filter((file) => file.startsWith('pid-') && file.endsWith('.json'));

        logger.info(`Found ${pidFiles.length} running services to restart`);

        for (const pidFile of pidFiles) {
          const port = pidFile.replace('pid-', '').replace('.json', '');
          const pidFilePath = path.join(pidDir, pidFile);

          restartTasks.push(async () => {
            try {
              // Read PID file
              const pidData = JSON.parse(await fs.readFile(pidFilePath, 'utf-8'));
              const pid = pidData.pid;
              const configPath = pidData.configPath;

              // Stop the service
              process.kill(pid, 'SIGTERM');

              // Remove old PID file
              await fs.unlink(pidFilePath);

              logger.info(`Stopped service on port ${port}`);

              // Restart the service
              const { spawn } = await import('child_process');
              const child = spawn(
                'node',
                ['start-rcc-system.mjs', '--config', configPath, '--port', port],
                {
                  detached: true,
                  stdio: 'ignore',
                }
              );

              // Create new PID file
              const newPidData = {
                pid: child.pid,
                configPath,
                startTime: new Date().toISOString(),
              };
              await fs.writeFile(pidFilePath, JSON.stringify(newPidData, null, 2));

              child.unref();
              logger.info(`Restarted service on port ${port} with PID ${child.pid}`);
            } catch (error) {
              logger.error(`Failed to restart service on port ${port}:`, error);
            }
          });
        }

        // Execute restart tasks in parallel
        await Promise.all(restartTasks.map((task) => task()));

        logger.info('All services have been restarted');
      } else {
        logger.info('No running services found to restart');
      }
    } catch (error) {
      logger.error('Failed to restart services:', error);
      throw error;
    }
  },
};

export default restartCommand;
