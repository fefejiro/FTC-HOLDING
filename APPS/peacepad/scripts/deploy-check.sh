#!/bin/bash
# PeacePad Pre-Deployment Checklist
# Run this before deploying to production

set -e

echo "🚀 PeacePad Deployment Pre-Flight Check"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check status
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ERRORS=$((ERRORS + 1))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

# 1. Check Node modules installed
echo "1. Checking dependencies..."
if [ -d "node_modules" ]; then
    check_pass "node_modules directory exists"
else
    check_fail "node_modules missing - run 'npm install'"
fi

# 2. Check TypeScript compiles
echo "2. Checking TypeScript..."
if npm run check > /dev/null 2>&1; then
    check_pass "TypeScript compiles successfully"
else
    check_warn "TypeScript has errors - run 'npm run check' to see details"
fi

# 3. Check environment variables
echo "3. Checking environment variables..."

# Required secrets for production
REQUIRED_SECRETS=(
    "DATABASE_URL"
    "AI_INTEGRATIONS_OPENAI_API_KEY"
    "MAILJET_API_KEY"
    "MAILJET_SECRET_KEY"
)

for secret in "${REQUIRED_SECRETS[@]}"; do
    # Check if secret exists in .env file (not showing value for security)
    if grep -q "^${secret}=" .env 2>/dev/null || [ ! -z "${!secret}" ]; then
        check_pass "$secret is configured"
    else
        check_warn "$secret is not set - verify in Replit Secrets panel"
    fi
done

# 4. Check for NODE_ENV
echo "4. Checking NODE_ENV configuration..."
if [ -z "$NODE_ENV" ]; then
    check_pass "NODE_ENV not set (good - defaults to development)"
elif [ "$NODE_ENV" = "production" ]; then
    check_warn "NODE_ENV=production detected - this may block devDependencies"
else
    check_pass "NODE_ENV=$NODE_ENV"
fi

# 5. Check Git status
echo "5. Checking Git status..."
if [ -d ".git" ]; then
    if [ -z "$(git status --porcelain)" ]; then
        check_pass "No uncommitted changes"
    else
        check_warn "You have uncommitted changes:"
        git status --short
    fi
    
    CURRENT_BRANCH=$(git branch --show-current)
    check_pass "Current branch: $CURRENT_BRANCH"
else
    check_warn "Not a Git repository"
fi

# 6. Check critical files exist
echo "6. Checking critical files..."
CRITICAL_FILES=(
    "server/index.ts"
    "server/routes.ts"
    "client/src/App.tsx"
    "package.json"
    "shared/schema.ts"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_fail "$file is missing!"
    fi
done

# 7. Check database connection (if possible)
echo "7. Checking database..."
if [ ! -z "$DATABASE_URL" ]; then
    check_pass "DATABASE_URL is configured"
else
    check_warn "DATABASE_URL not found in environment"
fi

# 8. Check OpenAI configuration
echo "8. Checking AI configuration..."
if grep -q "USE_REAL_AI" server/aiConfig.ts 2>/dev/null; then
    check_pass "AI toggle system detected"
fi

if [ ! -z "$AI_INTEGRATIONS_OPENAI_API_KEY" ] || [ ! -z "$OPENAI_API_KEY" ]; then
    check_pass "OpenAI API key configured"
else
    check_warn "No OpenAI API key found - AI will use mock responses"
fi

# 9. Check version updated
echo "9. Checking version..."
if grep -q "version.*1\.2\.1" client/src/components/WhatsNewModal.tsx 2>/dev/null; then
    check_pass "Latest version (1.2.1) detected in changelog"
else
    check_warn "Version may not be updated in WhatsNewModal.tsx"
fi

# Summary
echo ""
echo "========================================"
echo "📊 Summary"
echo "========================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "Ready to deploy to production! 🚀"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo "Review warnings above before deploying"
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo "Fix errors before deploying to production"
    exit 1
fi
