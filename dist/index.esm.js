'use strict';

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
const stopCommand = {
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
            }
            else {
                logger.warn(`No RCC service found running on port ${port}`);
            }
        }
        catch (error) {
            logger.error(`Failed to stop RCC service on port ${port}:`, error);
            throw error;
        }
    },
};

const codeCommand = {
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
        const configPath = options.config || `~/.route-claudecode/config/v4/single-provider/lmstudio-v4-${port}.json`;
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
                }
                catch (error) {
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
                const child = spawn('node', ['start-rcc-system.mjs', '--config', configPath, '--port', port], {
                    detached: true,
                    stdio: 'ignore',
                });
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
                    }
                    else {
                        reject(new Error(`Claude exited with code ${code}`));
                    }
                });
                claudeProcess.on('error', reject);
            });
            logger.info('Claude execution completed');
        }
        catch (error) {
            logger.error('Failed to execute code command:', error);
            throw error;
        }
    },
};

const restartCommand = {
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
                            const child = spawn('node', ['start-rcc-system.mjs', '--config', configPath, '--port', port], {
                                detached: true,
                                stdio: 'ignore',
                            });
                            // Create new PID file
                            const newPidData = {
                                pid: child.pid,
                                configPath,
                                startTime: new Date().toISOString(),
                            };
                            await fs.writeFile(pidFilePath, JSON.stringify(newPidData, null, 2));
                            child.unref();
                            logger.info(`Restarted service on port ${port} with PID ${child.pid}`);
                        }
                        catch (error) {
                            logger.error(`Failed to restart service on port ${port}:`, error);
                        }
                    });
                }
                // Execute restart tasks in parallel
                await Promise.all(restartTasks.map((task) => task()));
                logger.info('All services have been restarted');
            }
            else {
                logger.info('No running services found to restart');
            }
        }
        catch (error) {
            logger.error('Failed to restart services:', error);
            throw error;
        }
    },
};

var cliTypes = /*#__PURE__*/Object.freeze({
  __proto__: null
});

// Default CLI engine configuration
const defaultCLIConfig = {
    name: 'rcc',
    version: '1.0.0',
    description: 'RCC Command Line Interface Framework',
    commandDiscovery: {
        commandDirs: [
            // Built-in commands
            (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.esm.js', document.baseURI).href)) + '/commands',
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

exports.CLI_TYPES = cliTypes;
exports.codeCommand = codeCommand;
exports.defaultCLIConfig = defaultCLIConfig;
exports.restartCommand = restartCommand;
exports.stopCommand = stopCommand;
//# sourceMappingURL=index.esm.js.map
