#!/bin/bash
#
# Initialize component from template
#
# Usage: ./init.sh <component_name> "<description>" [type]
#
# Arguments:
#   component_name  - lowercase name (e.g., telegram, discord)
#   description     - one-line description
#   type           - communication, capability, or utility (default: capability)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ $# -lt 2 ]; then
  echo "Usage: ./init.sh <component_name> \"<description>\" [type]"
  echo ""
  echo "Example: ./init.sh telegram \"Telegram bot integration\" communication"
  exit 1
fi

NAME="$1"
DESC="$2"
TYPE="${3:-capability}"
NAME_UPPER=$(echo "$NAME" | tr '[:lower:]' '[:upper:]')
NAME_TITLE="$(echo "$NAME" | sed 's/\b\(.\)/\u\1/g')"
DATE=$(date +%Y-%m-%d)
TARGET_DIR="$SCRIPT_DIR/../zylos-$NAME"

echo "Creating zylos-$NAME..."
echo "  Description: $DESC"
echo "  Type: $TYPE"
echo "  Target: $TARGET_DIR"
echo ""

# Copy template
cp -r "$SCRIPT_DIR/template" "$TARGET_DIR"
cd "$TARGET_DIR"

# Replace placeholders (using | as delimiter to avoid issues with / in descriptions)
echo "Replacing placeholders..."
find . -type f -exec sed -i "s|{{COMPONENT_NAME}}|$NAME|g" {} \;
find . -type f -exec sed -i "s|{{COMPONENT_NAME_UPPER}}|$NAME_UPPER|g" {} \;
find . -type f -exec sed -i "s|{{COMPONENT_TITLE}}|$NAME_TITLE|g" {} \;
find . -type f -exec sed -i "s|{{COMPONENT_DESCRIPTION}}|$DESC|g" {} \;
find . -type f -exec sed -i "s|{{COMPONENT_TYPE}}|$TYPE|g" {} \;
find . -type f -exec sed -i "s|{{DATE}}|$DATE|g" {} \;

# Remove send.js for non-communication components
if [ "$TYPE" != "communication" ]; then
  rm -f send.js
  echo "  - Removed send.js (not a communication component)"
fi

# Initialize git
echo ""
echo "Initializing git repository..."
git init
git add .
git commit -m "Initial commit: zylos-$NAME from template"

echo ""
echo "Done! Created: $TARGET_DIR"
echo ""
echo "Next steps:"
echo "  1. cd $TARGET_DIR"
echo "  2. Implement your logic in src/index.js"
echo "  3. Add dependencies to package.json"
echo "  4. Test locally: npm install && npm start"
echo "  5. Push to GitHub: git remote add origin git@github.com:zylos-ai/zylos-$NAME.git"
