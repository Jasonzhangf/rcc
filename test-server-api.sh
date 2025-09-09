#!/bin/bash
set -e

# 测试多key配置UI的API端点

echo "🧪 Testing Multi-Key Configuration UI API Endpoints"
echo "================================================="

# 服务器地址
SERVER="http://localhost:3456"

echo "1. Testing server status..."
curl -s "${SERVER}/" > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Server is responding"
else
    echo "❌ Server is not responding"
    exit 1
fi

echo ""
echo "2. Testing GET /api/providers..."
PROVIDERS_RESPONSE=$(curl -s "${SERVER}/api/providers")
echo "Response: $PROVIDERS_RESPONSE" | jq '.' 2>/dev/null || echo "$PROVIDERS_RESPONSE"

echo ""
echo "3. Testing GET /api/config/status..."
CONFIG_STATUS=$(curl -s "${SERVER}/api/config/status")
echo "Response: $CONFIG_STATUS" | jq '.' 2>/dev/null || echo "$CONFIG_STATUS"

echo ""
echo "4. Testing POST /api/providers (add new provider)..."
NEW_PROVIDER=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Anthropic Provider",
    "protocol": "anthropic", 
    "api_base_url": "https://api.anthropic.com/v1",
    "api_key": ["test-key-123", "test-key-456"],
    "auth_type": "api_key",
    "models": ["claude-3-sonnet", "claude-3-haiku"]
  }' \
  "${SERVER}/api/providers")
echo "Response: $NEW_PROVIDER" | jq '.' 2>/dev/null || echo "$NEW_PROVIDER"

echo ""
echo "5. Testing GET /api/providers (check if new provider was added)..."
UPDATED_PROVIDERS=$(curl -s "${SERVER}/api/providers")
echo "Response: $UPDATED_PROVIDERS" | jq '.' 2>/dev/null || echo "$UPDATED_PROVIDERS"

echo ""
echo "6. Testing GET /api/config/export (check full config)..."
FULL_CONFIG=$(curl -s "${SERVER}/api/config/export")
echo "Response: $FULL_CONFIG" | jq '.' 2>/dev/null || echo "$FULL_CONFIG"

echo ""
echo "7. Checking if config file was created..."
if [ -f "$HOME/.rcc/config.json" ]; then
    echo "✅ Config file exists at: $HOME/.rcc/config.json"
    echo "Config file size: $(ls -lh $HOME/.rcc/config.json | awk '{print $5}')"
    echo ""
    echo "Config file content:"
    cat "$HOME/.rcc/config.json" | jq '.' 2>/dev/null || cat "$HOME/.rcc/config.json"
else
    echo "❌ Config file not found at: $HOME/.rcc/config.json"
fi

echo ""
echo "🎉 API testing complete!"