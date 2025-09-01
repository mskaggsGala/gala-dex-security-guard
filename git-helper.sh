#!/bin/bash

# Git Helper Script for Gala DEX Security Guard
# Makes common git operations easier and safer

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[Git Helper]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to show current status
show_status() {
    print_status "Current repository status:"
    echo ""
    git status
    echo ""
}

# Function to commit all changes
commit_all() {
    local message="$1"
    if [ -z "$message" ]; then
        print_error "Please provide a commit message"
        echo "Usage: ./git-helper.sh commit-all \"Your commit message\""
        exit 1
    fi
    
    print_status "Adding all changes..."
    git add .
    
    print_status "Committing with message: $message"
    git commit -m "$message"
    
    if [ $? -eq 0 ]; then
        print_success "Commit successful!"
        echo ""
        print_status "Pushing to remote..."
        git push origin main
        if [ $? -eq 0 ]; then
            print_success "Push successful!"
        else
            print_error "Push failed. Check your connection and credentials."
        fi
    else
        print_error "Commit failed. Check for errors above."
    fi
}

# Function to commit specific files
commit_files() {
    local message="$1"
    shift
    local files="$@"
    
    if [ -z "$message" ] || [ -z "$files" ]; then
        print_error "Please provide a commit message and files"
        echo "Usage: ./git-helper.sh commit-files \"message\" file1 file2..."
        exit 1
    fi
    
    print_status "Adding specified files..."
    git add $files
    
    print_status "Committing with message: $message"
    git commit -m "$message"
    
    if [ $? -eq 0 ]; then
        print_success "Commit successful!"
        echo ""
        print_status "Push to remote? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            git push origin main
            print_success "Push complete!"
        fi
    fi
}

# Function to commit security test results
commit_tests() {
    print_status "Committing latest security test results..."
    
    # Add only test results and ignore alerts log
    git add security-results/*.json 2>/dev/null
    git add security-reports/*.md 2>/dev/null
    
    # Count files to be committed
    local count=$(git diff --cached --name-only | wc -l)
    
    if [ $count -eq 0 ]; then
        print_warning "No new test results to commit"
        exit 0
    fi
    
    local message="Add latest security test results - $count files"
    git commit -m "$message"
    
    if [ $? -eq 0 ]; then
        print_success "Test results committed!"
        git push origin main
    fi
}

# Function to quick save work in progress
quick_save() {
    local message="${1:-WIP: Quick save}"
    
    print_status "Quick saving all changes..."
    git add .
    git commit -m "$message"
    git push origin main
    
    if [ $? -eq 0 ]; then
        print_success "Quick save complete!"
    fi
}

# Function to update documentation only
commit_docs() {
    print_status "Committing documentation changes..."
    
    git add *.md
    git add docs/*.md 2>/dev/null
    
    local count=$(git diff --cached --name-only | wc -l)
    
    if [ $count -eq 0 ]; then
        print_warning "No documentation changes to commit"
        exit 0
    fi
    
    local message="${1:-Update documentation}"
    git commit -m "$message"
    git push origin main
    
    print_success "Documentation updated!"
}

# Function to sync with remote
sync_remote() {
    print_status "Syncing with remote repository..."
    
    git fetch origin
    git pull origin main
    
    if [ $? -eq 0 ]; then
        print_success "Synced with remote!"
        show_status
    else
        print_error "Sync failed. You may need to resolve conflicts."
    fi
}

# Function to show recent commits
show_log() {
    print_status "Recent commits:"
    echo ""
    git log --oneline -10
    echo ""
}

# Function to undo last commit (keeping changes)
undo_commit() {
    print_warning "Undoing last commit (keeping changes)..."
    git reset --soft HEAD~1
    print_success "Last commit undone. Changes are still staged."
    show_status
}

# Function to clean up test results older than 7 days
cleanup_old_tests() {
    print_status "Cleaning up test results older than 7 days..."
    
    local count=0
    if [ -d "security-results" ]; then
        count=$(find security-results -name "*.json" -mtime +7 -type f | wc -l)
        find security-results -name "*.json" -mtime +7 -type f -delete
    fi
    
    if [ $count -gt 0 ]; then
        print_success "Removed $count old test result files"
        
        # Commit the cleanup
        git add -u
        git commit -m "Clean up old test results (removed $count files older than 7 days)"
        git push origin main
    else
        print_status "No old test results to clean up"
    fi
}

# Function to show help
show_help() {
    echo ""
    echo "🔧 Git Helper for Gala DEX Security Guard"
    echo "=========================================="
    echo ""
    echo "Usage: ./git-helper.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  status              Show current git status"
    echo "  commit-all <msg>    Add all changes, commit with message, and push"
    echo "  commit-files <msg> <files...>  Commit specific files"
    echo "  commit-tests        Commit latest test results only"
    echo "  commit-docs [msg]   Commit documentation changes only"
    echo "  quick-save [msg]    Quick save all changes (default: 'WIP: Quick save')"
    echo "  sync                Pull latest changes from remote"
    echo "  log                 Show recent commits"
    echo "  undo                Undo last commit (keeps changes)"
    echo "  cleanup             Remove test results older than 7 days"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./git-helper.sh status"
    echo "  ./git-helper.sh commit-all \"Add new security features\""
    echo "  ./git-helper.sh commit-tests"
    echo "  ./git-helper.sh quick-save"
    echo "  ./git-helper.sh commit-docs \"Update security documentation\""
    echo ""
    echo "Shortcuts (add to ~/.zshrc or ~/.bashrc):"
    echo "  alias gs='./git-helper.sh status'"
    echo "  alias gc='./git-helper.sh commit-all'"
    echo "  alias gct='./git-helper.sh commit-tests'"
    echo "  alias gqs='./git-helper.sh quick-save'"
    echo ""
}

# Main script logic
case "$1" in
    status|s)
        show_status
        ;;
    commit-all|ca)
        commit_all "$2"
        ;;
    commit-files|cf)
        shift
        commit_files "$@"
        ;;
    commit-tests|ct)
        commit_tests
        ;;
    commit-docs|cd)
        commit_docs "$2"
        ;;
    quick-save|qs)
        quick_save "$2"
        ;;
    sync)
        sync_remote
        ;;
    log|l)
        show_log
        ;;
    undo)
        undo_commit
        ;;
    cleanup)
        cleanup_old_tests
        ;;
    help|h|"")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac