#!/bin/bash

# Setup Git Aliases for Gala DEX Security Guard
# Run this once to add helpful aliases to your shell

echo "🔧 Setting up Git aliases for easier commands..."
echo ""

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
    SHELL_RC="$HOME/.zshrc"
    echo "Detected zsh shell"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_RC="$HOME/.bashrc"
    echo "Detected bash shell"
else
    SHELL_RC="$HOME/.bashrc"
    echo "Using default .bashrc"
fi

# Function to add alias if it doesn't exist
add_alias() {
    local alias_name="$1"
    local alias_command="$2"
    
    if ! grep -q "alias $alias_name=" "$SHELL_RC"; then
        echo "alias $alias_name='$alias_command'" >> "$SHELL_RC"
        echo "✅ Added: $alias_name"
    else
        echo "⚠️  Exists: $alias_name (skipping)"
    fi
}

echo ""
echo "Adding Git aliases to $SHELL_RC..."
echo ""

# Add comment header
if ! grep -q "# Gala DEX Security Guard Git Aliases" "$SHELL_RC"; then
    echo "" >> "$SHELL_RC"
    echo "# Gala DEX Security Guard Git Aliases" >> "$SHELL_RC"
    echo "# Added on $(date)" >> "$SHELL_RC"
fi

# Quick git status
add_alias "gs" "git status"

# Quick git add all and commit
add_alias "gca" "git add . && git commit -m"

# Quick push
add_alias "gp" "git push origin main"

# Quick pull
add_alias "gl" "git pull origin main"

# Git log pretty
add_alias "glog" "git log --oneline --graph --decorate -10"

# Show diff
add_alias "gd" "git diff"

# Show staged diff
add_alias "gds" "git diff --staged"

# Quick save (add, commit, push)
add_alias "gsave" "git add . && git commit -m 'Quick save' && git push origin main"

# For the git-helper script (if in current directory)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
add_alias "gh" "$SCRIPT_DIR/git-helper.sh"

# Security-specific aliases
add_alias "gct" "$SCRIPT_DIR/git-helper.sh commit-tests"
add_alias "gcd" "$SCRIPT_DIR/git-helper.sh commit-docs"
add_alias "gqs" "$SCRIPT_DIR/git-helper.sh quick-save"

echo ""
echo "📝 Standard Git Aliases Added:"
echo "  gs     = git status"
echo "  gca    = git add . && git commit -m (usage: gca \"message\")"
echo "  gp     = git push origin main"
echo "  gl     = git pull origin main"
echo "  glog   = git log (pretty format)"
echo "  gd     = git diff"
echo "  gds    = git diff --staged"
echo "  gsave  = quick save everything and push"
echo ""
echo "🛡️ Security Project Aliases:"
echo "  gh     = run git-helper script"
echo "  gct    = commit test results"
echo "  gcd    = commit documentation"
echo "  gqs    = quick save work in progress"
echo ""
echo "✅ Setup complete!"
echo ""
echo "To activate these aliases, run:"
echo "  source $SHELL_RC"
echo ""
echo "Or restart your terminal."
echo ""