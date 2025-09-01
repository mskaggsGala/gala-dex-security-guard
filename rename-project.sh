#!/bin/bash

# Project Rename Script
# Usage: ./rename-project.sh "old-name" "new-name"

OLD_NAME="${1:-galaswap-trading-bot}"
NEW_NAME="${2:-gala-dex-security-guard}"
OLD_DESC="Automated trading bot for GalaSwap V3"
NEW_DESC="Institutional-grade security monitoring and testing framework for GalaSwap DEX"

echo "🔄 Renaming project from '$OLD_NAME' to '$NEW_NAME'"
echo "================================================"

# Update package.json
echo "✅ Updating package.json..."
if [ -f "package.json" ]; then
    sed -i.bak "s/\"name\": \"$OLD_NAME\"/\"name\": \"$NEW_NAME\"/g" package.json
    sed -i.bak "s/$OLD_DESC/$NEW_DESC/g" package.json
    rm package.json.bak
fi

# Update README.md
echo "✅ Updating README.md..."
if [ -f "README.md" ]; then
    sed -i.bak "s/$OLD_NAME/$NEW_NAME/g" README.md
    sed -i.bak "s/GalaSwap Security Monitor & Trading Bot/Gala DEX Security Guard/g" README.md
    sed -i.bak "s/galaswap-security-monitor/$NEW_NAME/g" README.md
    rm README.md.bak
fi

# Update all markdown files
echo "✅ Updating documentation files..."
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.git/*" -exec sed -i.bak "s/Galaswap Trading Bot/Gala DEX Security Guard/g" {} \;
find . -name "*.md" -type f ! -path "./node_modules/*" ! -path "./.git/*" -exec sed -i.bak "s/galaswap-trading-bot/$NEW_NAME/g" {} \;
find . -name "*.md.bak" -type f -delete

# Update HTML files
echo "✅ Updating HTML files..."
find . -name "*.html" -type f ! -path "./node_modules/*" ! -path "./.git/*" -exec sed -i.bak "s/Galaswap Trading Bot/Gala DEX Security Guard/g" {} \;
find . -name "*.html.bak" -type f -delete

# Create a rename summary
echo "✅ Creating rename summary..."
cat > PROJECT_RENAME_LOG.md << EOF
# Project Rename Log

**Date:** $(date)
**Old Name:** $OLD_NAME
**New Name:** $NEW_NAME

## Files Updated:
- package.json
- README.md
- All .md documentation files
- All .html certificate files

## Next Steps:
1. Update GitHub repository name to: $NEW_NAME
2. Update any CI/CD configurations
3. Update environment variables if needed
4. Notify team members of the change

## Git Commands to Update Remote:
\`\`\`bash
git remote set-url origin https://github.com/YOUR_USERNAME/$NEW_NAME.git
\`\`\`
EOF

echo ""
echo "✅ Project renamed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Review changes with: git diff"
echo "2. Commit changes with: git add -A && git commit -m 'Rename project to $NEW_NAME'"
echo "3. Update GitHub repository name to match"
echo "4. Update remote URL: git remote set-url origin https://github.com/YOUR_USERNAME/$NEW_NAME.git"
echo ""
echo "See PROJECT_RENAME_LOG.md for details"