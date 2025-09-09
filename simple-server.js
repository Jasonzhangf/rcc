#!/usr/bin/env node

/**
 * Simple HTTP Server for Multi-Key UI Demo
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3456;
const HTML_FILE = 'simple-multi-key-ui-test.html';

function log(msg, color = '\x1b[37m') {
    console.log(`${color}${msg}\x1b[0m`);
}

const server = http.createServer((req, res) => {
    log(`${req.method} ${req.url}`, '\x1b[36m');
    
    if (req.url === '/' || req.url === '/index.html') {
        try {
            const html = fs.readFileSync(HTML_FILE, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html);
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`Error: ${error.message}`);
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    log(`✅ Server started successfully!`, '\x1b[32m');
    log(`🌐 Open: http://localhost:${PORT}`, '\x1b[34m');
    
    // Auto-open browser
    setTimeout(() => {
        const url = `http://localhost:${PORT}`;
        const platform = process.platform;
        
        let command, args;
        switch (platform) {
            case 'darwin':
                command = 'open';
                args = [url];
                break;
            case 'win32':
                command = 'start';
                args = ['""', url];
                break;
            default:
                command = 'xdg-open';
                args = [url];
                break;
        }
        
        spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
        log(`🚀 Browser opened automatically`, '\x1b[32m');
    }, 1000);
});

// Graceful shutdown
process.on('SIGINT', () => {
    log('\n👋 Shutting down server...', '\x1b[33m');
    server.close(() => {
        log('Server stopped. Goodbye!', '\x1b[32m');
        process.exit(0);
    });
});

log(`🔑 Multi-Key Configuration UI Demo Server`, '\x1b[1m\x1b[36m');
log(`Starting server on port ${PORT}...`, '\x1b[37m');