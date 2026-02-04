#!/bin/bash
#
# Initialize component template
#
# Usage: ./init.sh <component_name> "<description>" [type]
#
# Arguments:
#   component_name  - lowercase name (e.g., telegram, discord)
#   description     - one-line description
#   type           - communication, capability, or utility (default: capability)
#

set -e

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
# Generate title from name (capitalize first letter)
NAME_TITLE="$(echo "$NAME" | sed 's/\b\(.\)/\u\1/g')"
DATE=$(date +%Y-%m-%d)

echo "Initializing zylos-$NAME..."
echo "  Description: $DESC"
echo "  Type: $TYPE"
echo ""

# Function to replace placeholders in a file
replace_placeholders() {
  local file="$1"
  sed -i "s/{{COMPONENT_NAME}}/$NAME/g" "$file"
  sed -i "s/{{COMPONENT_NAME_UPPER}}/$NAME_UPPER/g" "$file"
  sed -i "s/{{COMPONENT_TITLE}}/$NAME_TITLE/g" "$file"
  sed -i "s/{{COMPONENT_DESCRIPTION}}/$DESC/g" "$file"
  sed -i "s/{{COMPONENT_TYPE}}/$TYPE/g" "$file"
  sed -i "s/{{DATE}}/$DATE/g" "$file"
}

# Rename template files
echo "Renaming template files..."
for f in *.template hooks/*.template src/*.template src/lib/*.template 2>/dev/null; do
  if [ -f "$f" ]; then
    newname="${f%.template}"
    mv "$f" "$newname"
    replace_placeholders "$newname"
    echo "  - $newname"
  fi
done

# Remove send.js for non-communication components
if [ "$TYPE" != "communication" ] && [ -f "send.js" ]; then
  rm send.js
  echo "  - Removed send.js (not a communication component)"
fi

# Remove this init script and template README
rm -f init.sh
rm -f COMPONENT-SPEC.md  # Keep in repo, but remove from initialized component

# Initialize git
echo ""
echo "Initializing git repository..."
rm -rf .git
git init
git add .
git commit -m "Initial commit: zylos-$NAME from template"

echo ""
echo "Done! Next steps:"
echo "  1. Implement your logic in src/index.js"
echo "  2. Add dependencies to package.json"
echo "  3. Test locally: npm install && npm start"
echo "  4. Push to GitHub: git remote add origin git@github.com:zylos-ai/zylos-$NAME.git"
