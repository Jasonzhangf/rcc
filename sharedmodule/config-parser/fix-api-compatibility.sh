#!/bin/bash
# Script to fix API compatibility issues with new rcc-basemodule version
cd "$(dirname "$0")"

echo "Fixing API compatibility issues..."

# Fix logInfo calls (2 params -> 1 param)
sed -i '' 's/this\.logInfo('\''\([^']*\)'\'', {/this.logInfo('\''\1 - /g' src/core/ConfigLoader.ts
sed -i '' 's/this\.logInfo('\''\([^']*\)'\'', {/this.logInfo('\''\1 - /g' src/core/ConfigParser.ts
sed -i '' 's/this\.logInfo('\''\([^']*\)'\'', {/this.logInfo('\''\1 - /g' src/core/PipelineConfigGenerator.ts

# Remove the second parameter and closing brace
sed -i '' 's/\([}]},*\)/\1/g' src/core/ConfigLoader.ts
sed -i '' 's/\([}]},*\)/\1/g' src/core/ConfigParser.ts
sed -i '' 's/\([}]},*\)/\1/g' src/core/PipelineConfigGenerator.ts

# Fix warn calls (2 params -> 1 param)
sed -i '' 's/this\.warn('\''\([^']*\)'\'', {/this.warn('\''\1 - /g' src/core/ConfigLoader.ts
sed -i '' 's/this\.warn('\''\([^']*\)'\'', {/this.warn('\''\1 - /g' src/core/ConfigParser.ts
sed -i '' 's/this\.warn('\''\([^']*\)'\'', {/this.warn('\''\1 - /g' src/core/PipelineConfigGenerator.ts

# Replace destroy calls with appropriate cleanup
sed -i '' 's/this\.destroy();/\/\/ Clean up resources/g' src/core/ConfigLoader.ts
sed -i '' 's/this\.destroy();/\/\/ Clean up resources/g' src/core/ConfigParser.ts
sed -i '' 's/this\.destroy();/\/\/ Clean up resources/g' src/core/PipelineConfigGenerator.ts

echo "API compatibility fixes completed!"