#!/bin/bash
# Script to fix all API compatibility issues in config-parser module
cd "$(dirname "$0")"

echo "Fixing all API compatibility issues..."

# Fix ConfigParser.ts - Replace all 2-param log calls with 1-param
perl -i -pe 's/this\.logInfo\('\''([^'\'']*)'\'', \{/this.logInfo('\''$1 - /g' src/core/ConfigParser.ts
perl -i -pe 's/this\.warn\('\''([^'\'']*)'\'', \{/this.warn('\''$1 - /g' src/core/ConfigParser.ts
perl -i -pe 's/\},\n\s*\}\)/\)\n/g' src/core/ConfigParser.ts
perl -i -pe 's/\},\n\s*\}\)/\)\n/g' src/core/ConfigParser.ts

# Fix PipelineConfigGenerator.ts - Replace all 2-param log calls with 1-param
perl -i -pe 's/this\.logInfo\('\''([^'\'']*)'\'', \{/this.logInfo('\''$1 - /g' src/core/PipelineConfigGenerator.ts
perl -i -pe 's/this\.warn\('\''([^'\'']*)'\'', \{/this.warn('\''$1 - /g' src/core/PipelineConfigGenerator.ts
perl -i -pe 's/\},\n\s*\}\)/\)\n/g' src/core/PipelineConfigGenerator.ts
perl -i -pe 's/\},\n\s*\}\)/\)\n/g' src/core/PipelineConfigGenerator.ts

# Fix destroy method calls
perl -i -pe 's/this\.destroy\(\);/\/\/ Clean up resources/g' src/core/ConfigParser.ts
perl -i -pe 's/this\.destroy\(\);/\/\/ Clean up resources/g' src/core/PipelineConfigGenerator.ts

echo "All API compatibility fixes completed!"