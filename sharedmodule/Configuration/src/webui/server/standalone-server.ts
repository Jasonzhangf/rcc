import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConfigurationCenterUI } from '../ConfigurationCenterUI';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class StandaloneServer {
  private app: express.Application;
  private port: number;
  private ui: ConfigurationCenterUI | null = null;

  constructor(port: number = 4008) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Serve static files
    this.app.use(express.static(path.join(__dirname, '../../public')));
    this.app.use(express.static(path.join(__dirname, '../../../dist')));
    
    // Parse JSON bodies
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // Main UI route
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });

    // API routes for configuration operations
    this.app.get('/api/config', async (req, res) => {
      try {
        if (this.ui) {
          const manager = this.ui.getConfigLoadingManager();
          const config = manager.getState();
          res.json({ success: true, data: config });
        } else {
          res.status(404).json({ success: false, error: 'UI not initialized' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: (error as Error).message });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Serve built JavaScript files
    this.app.get('/js/:filename', (req, res) => {
      const filename = req.params.filename;
      res.sendFile(path.join(__dirname, '../../../dist', filename));
    });
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.port, () => {
        console.log(`🚀 RCC Configuration Center Standalone Server`);
        console.log(`🌐 Server running on http://localhost:${this.port}`);
        console.log(`📁 Serving files from: ${__dirname}`);
        console.log(`\n✨ Features:`);
        console.log(`   • Configuration generation and editing`);
        console.log(`   • Configuration parsing and validation`);
        console.log(`   • Pipeline configuration generation`);
        console.log(`   • Complete Web UI interface`);
        resolve();
      });

      server.on('error', (error) => {
        reject(error);
      });
    });
  }

  public async stop(): Promise<void> {
    if (this.ui) {
      await this.ui.destroy();
    }
  }
}