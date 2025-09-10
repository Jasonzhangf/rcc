import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIME types for different file extensions
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Create HTTP server
const server = http.createServer(async (req, res) => {
  console.log(`Requested: ${req.url}`);
  
  // Default to index.html if requesting root
  let filePath = req.url === '/' ? '/improved-real-config-demo.html' : req.url;
  
  // Resolve the file path
  filePath = path.join(__dirname, filePath);
  
  // Get file extension
  const extname = path.extname(filePath).toLowerCase();
  
  // Set content type based on file extension
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  try {
    // Read the file
    const content = await fs.readFile(filePath);
    
    // Success
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File not found
      console.log(`File not found: ${filePath}`);
      res.writeHead(404);
      res.end('404 Not Found');
    } else {
      // Server error
      console.log(`Server error: ${err.code}`);
      res.writeHead(500);
      res.end('500 Internal Server Error');
    }
  }
});

// Define port
const PORT = 4008;

// Start server
server.listen(PORT, () => {
  console.log(`🚀 RCC Configuration Center Demo Server running on http://localhost:${PORT}`);
  console.log(`📝 Created by Claude Code - Configuration Management System`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`\n💡 To view the configuration demo:`);
  console.log(`   1. Open your browser`);
  console.log(`   2. Go to http://localhost:${PORT}`);
  console.log(`\n✨ Features:`);
  console.log(`   • Real configuration file handling simulation`);
  console.log(`   • Fixed virtual models with configurable mapping`);
  console.log(`   • Default path: ~/.rcc/config.json`);
  console.log(`   • Provider and model management`);
  console.log(`   • Configuration parsing capabilities`);
});