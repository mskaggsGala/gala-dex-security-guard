# Git Helper Guide

## 🚀 Overview

Two helper scripts have been created to make git operations much easier for the Gala DEX Security Guard project:

1. **`git-helper.sh`** - Comprehensive git command helper
2. **`setup-git-aliases.sh`** - Sets up quick terminal shortcuts

## 📋 Initial Setup (One-Time)

### Step 1: Make Scripts Executable
```bash
chmod +x git-helper.sh
chmod +x setup-git-aliases.sh
```

### Step 2: Install Git Aliases (Optional but Recommended)
```bash
# Run the setup script
./setup-git-aliases.sh

# Activate the aliases
source ~/.zshrc
# or for bash:
source ~/.bashrc
```

## 🎯 Git Helper Commands

### Full Command Reference

| Command | Description | Usage |
|---------|-------------|-------|
| **status** | Show current git status | `./git-helper.sh status` |
| **commit-all** | Add all changes, commit, and push | `./git-helper.sh commit-all "Your message"` |
| **commit-files** | Commit specific files | `./git-helper.sh commit-files "message" file1 file2` |
| **commit-tests** | Commit only test results | `./git-helper.sh commit-tests` |
| **commit-docs** | Commit only documentation | `./git-helper.sh commit-docs "Update docs"` |
| **quick-save** | Fast save all changes | `./git-helper.sh quick-save` |
| **sync** | Pull latest from remote | `./git-helper.sh sync` |
| **log** | Show recent commits | `./git-helper.sh log` |
| **undo** | Undo last commit (keeps changes) | `./git-helper.sh undo` |
| **cleanup** | Remove test files older than 7 days | `./git-helper.sh cleanup` |
| **help** | Show help message | `./git-helper.sh help` |

## ⚡ Quick Aliases (After Setup)

Once you run `setup-git-aliases.sh`, you can use these shortcuts:

| Alias | Full Command | Example |
|-------|-------------|---------|
| `gs` | git status | `gs` |
| `gca` | git add . && git commit -m | `gca "Your message"` |
| `gp` | git push origin main | `gp` |
| `gl` | git pull origin main | `gl` |
| `glog` | git log (pretty format) | `glog` |
| `gd` | git diff | `gd` |
| `gds` | git diff --staged | `gds` |
| `gsave` | Quick save everything | `gsave` |
| `gh` | Run git-helper | `gh status` |
| `gct` | Commit test results | `gct` |
| `gcd` | Commit documentation | `gcd` |
| `gqs` | Quick save work in progress | `gqs` |

## 📝 Common Workflows

### 1. After Making Code Changes
```bash
# Option A: Using git-helper
./git-helper.sh commit-all "Add new security features"

# Option B: Using aliases (if set up)
gca "Add new security features"

# Option C: Quick save
gqs
```

### 2. Committing Test Results Only
```bash
# This ignores security-alerts.log and only commits test JSONs
./git-helper.sh commit-tests
# or with alias:
gct
```

### 3. Updating Documentation
```bash
# Commits only .md files
./git-helper.sh commit-docs "Update security documentation"
# or with alias:
gcd "Update security documentation"
```

### 4. Quick Save Work in Progress
```bash
# Saves everything with default message "WIP: Quick save"
./git-helper.sh quick-save
# or with alias:
gqs

# With custom message:
./git-helper.sh quick-save "WIP: Working on phase 11"
```

### 5. Syncing with Remote
```bash
# Pull latest changes
./git-helper.sh sync
# or with alias:
gl
```

### 6. Checking What Changed
```bash
# See status
./git-helper.sh status
# or:
gs

# See actual changes
gd              # unstaged changes
gds             # staged changes
```

### 7. Cleaning Up Old Test Results
```bash
# Removes test results older than 7 days
./git-helper.sh cleanup
```

## 🎨 Features

### Color-Coded Output
The git-helper provides colored output:
- 🔵 Blue: Status messages
- ✅ Green: Success messages
- ⚠️ Yellow: Warnings
- ❌ Red: Errors

### Smart Test Result Handling
- Automatically ignores `security-alerts.log` (it's in .gitignore)
- Only commits `.json` test results
- Counts files being committed

### Safety Features
- Asks for confirmation before pushing (for commit-files)
- Shows what will be committed before committing
- Undo command keeps your changes staged

## 💡 Pro Tips

### 1. Add More Custom Aliases
Edit `~/.zshrc` or `~/.bashrc` and add your own:
```bash
alias gcnv="git commit --no-verify -m"
alias gundo="git reset --soft HEAD~1"
```

### 2. Combine Commands
```bash
# Run tests and commit results
node src/test-all-phases.js && gct
```

### 3. Set Up Git Commit Template
```bash
git config --global commit.template ~/.gitmessage
```

### 4. Use Quick Save During Development
While actively developing, use quick save frequently:
```bash
gqs  # Saves with "WIP: Quick save"
```

Then later, squash commits with:
```bash
git rebase -i HEAD~5  # Combine last 5 commits
```

## 🔧 Troubleshooting

### Permission Denied
```bash
# If you get "permission denied"
chmod +x git-helper.sh
chmod +x setup-git-aliases.sh
```

### Aliases Not Working
```bash
# Reload your shell configuration
source ~/.zshrc
# or
source ~/.bashrc

# Or just restart your terminal
```

### Script Not Found
```bash
# Use full path
/full/path/to/git-helper.sh status

# Or add to PATH
export PATH=$PATH:/Users/markskaggs/Documents/Projects/gala-dex-security-guard
```

## 📚 Examples

### Morning Workflow
```bash
# 1. Sync with remote
gl

# 2. Check status
gs

# 3. Make changes...

# 4. Commit when ready
gca "Morning security updates"
```

### End of Day
```bash
# Quick save everything
gqs

# Or with message
./git-helper.sh quick-save "EOD: Features partially complete"
```

### After Running Tests
```bash
# Commit only the test results
gct

# This automatically:
# - Adds security-results/*.json
# - Adds security-reports/*.md
# - Ignores security-alerts.log
# - Commits with appropriate message
# - Pushes to remote
```

## 📂 What Gets Committed Where

| Command | What it commits | What it ignores |
|---------|----------------|-----------------|
| `commit-all` | Everything | Only .gitignore items |
| `commit-tests` | `*.json` test results, `*.md` reports | `security-alerts.log` |
| `commit-docs` | Only `*.md` files | Everything else |
| `quick-save` | Everything | Only .gitignore items |

## 🎉 Summary

With these helpers, instead of:
```bash
git add .
git commit -m "Your message"
git push origin main
```

You can just do:
```bash
gca "Your message"
```

Or even simpler for quick saves:
```bash
gqs
```

Happy committing! 🚀