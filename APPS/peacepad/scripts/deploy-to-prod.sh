#!/bin/bash
# Quick deployment script for PeacePad
# This helps automate the dev → prod deployment process

set -e

echo "🚀 PeacePad Deployment Helper"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect which environment we're in
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

echo -e "${BLUE}Current branch:${NC} $CURRENT_BRANCH"
echo ""

# Function: Development workflow
dev_workflow() {
    echo "📦 Development Workflow (dev → GitHub)"
    echo "======================================="
    echo ""
    
    # Check for uncommitted changes
    if [ ! -z "$(git status --porcelain)" ]; then
        echo "📝 You have uncommitted changes:"
        git status --short
        echo ""
        read -p "Commit these changes? (y/n) " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            read -p "Enter commit message: " COMMIT_MSG
            git add .
            git commit -m "$COMMIT_MSG"
            echo -e "${GREEN}✓${NC} Changes committed"
        else
            echo "Skipping commit..."
        fi
    fi
    
    # Push to dev branch
    echo ""
    echo "Pushing to GitHub (dev branch)..."
    git push origin dev
    
    echo ""
    echo -e "${GREEN}✓ Deployment to dev complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Test thoroughly on dev.peacepad.ca"
    echo "  2. When ready, create PR: dev → main on GitHub"
    echo "  3. Merge PR and deploy to production"
}

# Function: Production workflow
prod_workflow() {
    echo "🏭 Production Workflow (GitHub → main)"
    echo "======================================"
    echo ""
    
    # Run pre-deployment checks
    echo "Running pre-deployment checks..."
    if [ -f "scripts/deploy-check.sh" ]; then
        chmod +x scripts/deploy-check.sh
        if ./scripts/deploy-check.sh; then
            echo ""
        else
            echo ""
            echo -e "${YELLOW}⚠ Pre-deployment checks found issues${NC}"
            read -p "Continue anyway? (y/n) " -n 1 -r
            echo ""
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo "Deployment cancelled"
                exit 1
            fi
        fi
    fi
    
    # Pull latest from main
    echo "Pulling latest changes from main..."
    git checkout main
    git pull origin main
    
    # Install dependencies
    echo ""
    echo "Installing dependencies..."
    npm install
    
    echo ""
    echo -e "${GREEN}✓ Code updated from GitHub!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Click the 'Publish' button in Replit"
    echo "  2. Monitor logs for errors"
    echo "  3. Test on peacepad.ca"
}

# Main menu
if [ "$CURRENT_BRANCH" = "dev" ]; then
    echo "Detected: Development environment"
    echo ""
    dev_workflow
elif [ "$CURRENT_BRANCH" = "main" ]; then
    echo "Detected: Production environment"
    echo ""
    prod_workflow
else
    echo "⚠️  Warning: Unknown branch '$CURRENT_BRANCH'"
    echo ""
    echo "Which workflow would you like to run?"
    echo "  1) Development (commit & push to dev)"
    echo "  2) Production (pull from main & deploy)"
    echo ""
    read -p "Select (1 or 2): " -n 1 -r
    echo ""
    
    if [ "$REPLY" = "1" ]; then
        dev_workflow
    elif [ "$REPLY" = "2" ]; then
        prod_workflow
    else
        echo "Invalid selection"
        exit 1
    fi
fi
