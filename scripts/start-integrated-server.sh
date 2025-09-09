#!/bin/bash

# Start Integrated Modular Server
# This script launches the integrated modular server and provides helpful information

echo "🚀 Starting Integrated Modular Server"
echo "======================================"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

echo "📋 Server Information:"
echo "   • Port: 7777"
echo "   • UI: http://localhost:7777"
echo "   • API: http://localhost:7777/api/"
echo "   • Architecture: Modular with 6 integrated modules"
echo ""

echo "🏗️  Integrated Modules:"
echo "   • ApiRouter - Request routing & response formatting"
echo "   • ConfigManager - Configuration file operations" 
echo "   • ProvidersManager - Provider CRUD & testing"
echo "   • ModelsManager - Model verification & tokens"
echo "   • BlacklistManager - Model blacklist with deduplication"
echo "   • PoolManager - Provider pool with deduplication"
echo ""

echo "🎯 Key Features:"
echo "   • 100% API compatibility with monolithic server"
echo "   • Deduplication logic prevents blacklist/pool conflicts"
echo "   • Multi-protocol provider support (OpenAI, Anthropic, Gemini)"
echo "   • iFlow specialization preserved"
echo "   • Performance optimized coordination"
echo ""

echo "📡 Ready to start server..."
echo "   Press Ctrl+C to stop the server"
echo ""

# Start the server
cd "$(dirname "$0")/.."
node scripts/integrated-modular-server.js