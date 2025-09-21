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
    const port = options.port || 5506; // Default port 5506

    try {
      // Check if PID file exists for this port
      const pidFile = `.rcc/pid-${port}.json`;
      const fs = await import('fs/promises');

      if (await fs.access(pidFile).catch(() => false)) {
        const pidData = JSON.parse(await fs.readFile(pidFile, 'utf-8'));
        const pid = pidData.pid;

        try {
          // Check if process is actually running
          process.kill(pid, 0); // Signal 0 checks if process exists

          // Process exists, try to kill it gracefully
          process.kill(pid, 'SIGTERM');
          logger.info(`Sent SIGTERM to process ${pid} on port ${port}`);

          // Wait a bit for graceful shutdown
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Verify process is actually dead
          try {
            process.kill(pid, 0);
            // Process still exists, try force kill
            process.kill(pid, 'SIGKILL');
            logger.info(`Sent SIGKILL to process ${pid} on port ${port}`);
          } catch {
            // Process is dead, continue
          }
        } catch (error: any) {
          // Process doesn't exist, clean up stale PID file
          if (error.code === 'ESRCH') {
            logger.warn(`Process ${pid} not found, removing stale PID file for port ${port}`);
          } else {
            throw error;
          }
        }

        // Remove PID file
        await fs.unlink(pidFile);
        logger.info(`Successfully stopped RCC service on port ${port}`);
      } else {
        logger.warn(`No PID file found for port ${port}, checking for running processes...`);

        // Fallback: check for processes using the port directly
        const { execSync } = await import('child_process');
        try {
          const processes = execSync(`lsof -ti :${port}`, { encoding: 'utf8' });
          const pids = processes
            .trim()
            .split('\n')
            .filter((pid: string) => pid.trim());

          if (pids.length > 0) {
            for (const pid of pids) {
              try {
                execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
                logger.info(`Force killed process ${pid} on port ${port}`);
              } catch (killError) {
                logger.warn(`Failed to kill process ${pid}:`, killError);
              }
            }
            logger.info(`Cleaned up ${pids.length} processes on port ${port}`);
          } else {
            logger.info(`No processes found using port ${port}`);
          }
        } catch {
          logger.info(`No processes found using port ${port}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to stop RCC service on port ${port}:`, error);
      throw error;
    }
  },
};

export default stopCommand;
