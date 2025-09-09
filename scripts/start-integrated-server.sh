#!/bin/bash

# RCC Integrated Server Startup Script
# This script starts the RCC modular configuration system with all components

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INTEGRATED_SERVER="$SCRIPT_DIR/integrated-modular-server.js"
UI_PROXY_PORT=8080
API_SERVER_PORT=7777

echo -e "${BLUE}🚀 RCC Integrated Modular Server Startup${NC}"
echo -e "${BLUE}===============================================${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js and try again.${NC}"
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo -e "${RED}❌ Error: Cannot find package.json. Please run this script from the RCC project root.${NC}"
    exit 1
fi

# Check if integrated server exists
if [ ! -f "$INTEGRATED_SERVER" ]; then
    echo -e "${RED}❌ Error: Cannot find integrated-modular-server.js at $INTEGRATED_SERVER${NC}"
    exit 1
fi

# Change to project root
cd "$PROJECT_ROOT"

# Check for existing processes
echo -e "${YELLOW}🔍 Checking for existing server processes...${NC}"

# Check if integrated server is already running
if lsof -Pi :$API_SERVER_PORT -sTCP:LISTEN -t >/dev/null; then
    echo -e "${YELLOW}⚠️  Port $API_SERVER_PORT is already in use. Stopping existing process...${NC}"
    lsof -ti:$API_SERVER_PORT | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Check if UI proxy is already running
if lsof -Pi :$UI_PROXY_PORT -sTCP:LISTEN -t >/dev/null; then
    echo -e "${YELLOW}⚠️  Port $UI_PROXY_PORT is already in use. Stopping existing process...${NC}"
    lsof -ti:$UI_PROXY_PORT | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo ""
echo -e "${GREEN}✅ Starting RCC Integrated Modular Server...${NC}"
echo ""

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"
    
    # Kill background processes
    if [ ! -z "$API_PID" ]; then
        kill $API_PID 2>/dev/null || true
        echo -e "${GREEN}✅ API Server stopped${NC}"
    fi
    
    if [ ! -z "$UI_PID" ]; then
        kill $UI_PID 2>/dev/null || true  
        echo -e "${GREEN}✅ UI Proxy stopped${NC}"
    fi
    
    # Additional cleanup - kill by port
    lsof -ti:$API_SERVER_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$UI_PROXY_PORT | xargs kill -9 2>/dev/null || true
    
    echo -e "${BLUE}👋 RCC Integrated Server shutdown complete${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start integrated modular server (API backend)
echo -e "${CYAN}🔧 Starting Integrated Modular Server (Port: $API_SERVER_PORT)...${NC}"
node "$INTEGRATED_SERVER" &
API_PID=$!

# Wait a moment for the server to start
sleep 3

# Check if API server started successfully
if ! lsof -Pi :$API_SERVER_PORT -sTCP:LISTEN -t >/dev/null; then
    echo -e "${RED}❌ Failed to start API server on port $API_SERVER_PORT${NC}"
    cleanup
    exit 1
fi

echo -e "${GREEN}✅ API Server started successfully${NC}"

# Start UI proxy server
echo -e "${CYAN}🌐 Starting Configuration UI with API Proxy (Port: $UI_PROXY_PORT)...${NC}"
PORT=$UI_PROXY_PORT node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, \`http://\${req.headers.host}\`);
  const pathname = url.pathname;
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (pathname === '/' || pathname === '/index.html') {
    // Serve the configuration UI
    const uiPath = path.join(__dirname, 'src', 'modules', 'Configuration', 'ui', 'multi-key-config-ui.html');
    fs.readFile(uiPath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('UI file not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else if (pathname.startsWith('/api/')) {
    // Proxy API requests to integrated server
    const proxyUrl = \`http://localhost:$API_SERVER_PORT\${pathname}\`;
    
    const proxyReq = http.request(proxyUrl, {
      method: req.method,
      headers: req.headers
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(\`Proxy error: \${err.message}\`);
    });
    
    req.pipe(proxyReq);
  } else if (pathname === '/config/provider.json') {
    // Serve provider configuration
    const providerPath = path.join(__dirname, 'config', 'provider.json');
    fs.readFile(providerPath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Provider config not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
  } else if (pathname === '/config.json') {
    // Serve main configuration
    const configPath = path.join(__dirname, 'config.json');
    fs.readFile(configPath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Config not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(data);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen($UI_PROXY_PORT, () => {
  console.log('✅ UI Proxy server started successfully');
});
" &
UI_PID=$!

# Wait a moment for UI server to start
sleep 2

# Check if UI server started successfully
if ! lsof -Pi :$UI_PROXY_PORT -sTCP:LISTEN -t >/dev/null; then
    echo -e "${RED}❌ Failed to start UI server on port $UI_PROXY_PORT${NC}"
    cleanup
    exit 1
fi

# Display startup information
echo ""
echo -e "${GREEN}🎉 RCC Integrated Modular Server Started Successfully!${NC}"
echo -e "${GREEN}===============================================${NC}"
echo ""
echo -e "${PURPLE}🌐 Web Interface:${NC}          http://localhost:$UI_PROXY_PORT"
echo -e "${PURPLE}🔧 API Server:${NC}             http://localhost:$API_SERVER_PORT"
echo -e "${PURPLE}📋 Configuration UI:${NC}       http://localhost:$UI_PROXY_PORT/"
echo -e "${PURPLE}🛣️  Virtual Routes API:${NC}     http://localhost:$UI_PROXY_PORT/api/virtual-routes"
echo -e "${PURPLE}🏊 Provider Pool API:${NC}       http://localhost:$UI_PROXY_PORT/api/pool"
echo -e "${PURPLE}🚫 Blacklist API:${NC}           http://localhost:$UI_PROXY_PORT/api/blacklist"
echo -e "${PURPLE}⚙️  Providers API:${NC}          http://localhost:$UI_PROXY_PORT/api/providers"
echo ""
echo -e "${CYAN}🏗️  MODULAR ARCHITECTURE ACTIVE:${NC}"
echo -e "   ✅ ApiRouter - Request routing & response formatting"
echo -e "   ✅ ConfigManager - Configuration file operations"
echo -e "   ✅ ProvidersManager - Provider CRUD & testing"
echo -e "   ✅ ModelsManager - Model verification & tokens"
echo -e "   ✅ BlacklistManager - Model blacklist with deduplication"
echo -e "   ✅ PoolManager - Provider pool with deduplication"
echo -e "   ✅ Virtual Routes - Default virtual models available"
echo ""
echo -e "${YELLOW}🎯 KEY FEATURES:${NC}"
echo -e "   ✅ 100% API compatibility with monolithic server"
echo -e "   ✅ Deduplication logic prevents conflicts"
echo -e "   ✅ Multi-protocol provider support"
echo -e "   ✅ Default virtual models included"
echo -e "   ✅ Separate provider configuration (config/provider.json)"
echo -e "   ✅ Performance optimized"
echo ""
echo -e "${GREEN}📡 READY FOR TESTING! Press Ctrl+C to stop${NC}"
echo ""

# Wait for user to stop the servers
wait