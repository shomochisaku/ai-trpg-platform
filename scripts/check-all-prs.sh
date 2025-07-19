#!/bin/bash

# AI-TRPG Platform: All PR Branches Health Check Script
# This script checks all open PR branches for common issues before CI runs

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CHECK_BACKEND=${CHECK_BACKEND:-true}
CHECK_FRONTEND=${CHECK_FRONTEND:-true}
PARALLEL=${PARALLEL:-true}
REPORT_FILE=${REPORT_FILE:-"pr-check-report.txt"}

echo -e "${BLUE}🚀 AI-TRPG Platform PR Health Check${NC}"
echo "=================================================="

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "Current branch: ${YELLOW}$CURRENT_BRANCH${NC}"

# Get all PR branches (assumes they start with specific patterns)
echo -e "\n${BLUE}📋 Detecting PR branches...${NC}"
PR_BRANCHES=($(git branch -r | grep -E "(claude/|feature/|fix/)" | sed 's/origin\///' | sort -u))

if [ ${#PR_BRANCHES[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠️ No PR branches found${NC}"
    exit 0
fi

echo -e "Found ${#PR_BRANCHES[@]} PR branches:"
for branch in "${PR_BRANCHES[@]}"; do
    echo -e "  - ${YELLOW}$branch${NC}"
done

# Results tracking
declare -A RESULTS
declare -A ERRORS
TOTAL_BRANCHES=${#PR_BRANCHES[@]}
PASSED_BRANCHES=0
FAILED_BRANCHES=0

# Function to check a single branch
check_branch() {
    local branch=$1
    local result_file="/tmp/pr-check-$branch.log"
    
    echo -e "\n${BLUE}🔍 Checking branch: $branch${NC}"
    
    # Create a temporary working directory
    local temp_dir="/tmp/pr-check-$(echo $branch | tr '/' '-')"
    rm -rf "$temp_dir"
    git worktree add "$temp_dir" "origin/$branch" 2>/dev/null || {
        echo -e "${RED}❌ Failed to create worktree for $branch${NC}" | tee -a "$result_file"
        RESULTS[$branch]="FAIL"
        ERRORS[$branch]="Failed to create worktree"
        return 1
    }
    
    cd "$temp_dir"
    
    local branch_errors=""
    local checks_passed=0
    local total_checks=0
    
    # Backend checks
    if [ "$CHECK_BACKEND" = true ] && [ -d "backend" ]; then
        echo -e "  ${BLUE}🔧 Backend checks...${NC}"
        cd backend
        
        # Check if package.json is valid
        ((total_checks++))
        if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
            echo -e "    ✅ package.json syntax"
            ((checks_passed++))
        else
            echo -e "    ❌ package.json syntax"
            branch_errors+="Backend package.json syntax error; "
        fi
        
        # Check if dependencies can be installed
        ((total_checks++))
        if npm install --silent --no-audit 2>/dev/null; then
            echo -e "    ✅ Dependencies install"
            ((checks_passed++))
            
            # Type check
            ((total_checks++))
            if npm run typecheck 2>/dev/null; then
                echo -e "    ✅ TypeScript types"
                ((checks_passed++))
            else
                echo -e "    ❌ TypeScript types"
                branch_errors+="Backend TypeScript errors; "
            fi
            
            # Core tests
            ((total_checks++))
            if npm run test:core 2>/dev/null; then
                echo -e "    ✅ Core tests"
                ((checks_passed++))
            else
                echo -e "    ❌ Core tests"
                branch_errors+="Backend core tests failing; "
            fi
            
            # Build
            ((total_checks++))
            if npm run build 2>/dev/null; then
                echo -e "    ✅ Build"
                ((checks_passed++))
            else
                echo -e "    ❌ Build"
                branch_errors+="Backend build failed; "
            fi
        else
            echo -e "    ❌ Dependencies install"
            branch_errors+="Backend dependencies installation failed; "
        fi
        
        cd ..
    fi
    
    # Frontend checks
    if [ "$CHECK_FRONTEND" = true ] && [ -d "frontend" ]; then
        echo -e "  ${BLUE}🎨 Frontend checks...${NC}"
        cd frontend
        
        # Check if package.json is valid
        ((total_checks++))
        if node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
            echo -e "    ✅ package.json syntax"
            ((checks_passed++))
        else
            echo -e "    ❌ package.json syntax"
            branch_errors+="Frontend package.json syntax error; "
        fi
        
        # Check if dependencies can be installed
        ((total_checks++))
        if npm install --silent --no-audit 2>/dev/null; then
            echo -e "    ✅ Dependencies install"
            ((checks_passed++))
            
            # Type check
            ((total_checks++))
            if npm run type-check 2>/dev/null; then
                echo -e "    ✅ TypeScript types"
                ((checks_passed++))
            else
                echo -e "    ❌ TypeScript types"
                branch_errors+="Frontend TypeScript errors; "
            fi
            
            # Tests
            ((total_checks++))
            if npm run test:run 2>/dev/null; then
                echo -e "    ✅ Tests"
                ((checks_passed++))
            else
                echo -e "    ❌ Tests"
                branch_errors+="Frontend tests failing; "
            fi
            
            # Build
            ((total_checks++))
            if npm run build 2>/dev/null; then
                echo -e "    ✅ Build"
                ((checks_passed++))
            else
                echo -e "    ❌ Build"
                branch_errors+="Frontend build failed; "
            fi
        else
            echo -e "    ❌ Dependencies install"
            branch_errors+="Frontend dependencies installation failed; "
        fi
        
        cd ..
    fi
    
    # Cleanup
    cd /
    git worktree remove "$temp_dir" --force 2>/dev/null
    
    # Results
    if [ $checks_passed -eq $total_checks ]; then
        echo -e "  ${GREEN}✅ Branch $branch: ALL CHECKS PASSED ($checks_passed/$total_checks)${NC}"
        RESULTS[$branch]="PASS"
        ((PASSED_BRANCHES++))
    else
        echo -e "  ${RED}❌ Branch $branch: SOME CHECKS FAILED ($checks_passed/$total_checks)${NC}"
        RESULTS[$branch]="FAIL"
        ERRORS[$branch]="$branch_errors"
        ((FAILED_BRANCHES++))
    fi
    
    echo "$checks_passed/$total_checks checks passed" > "$result_file"
    if [ -n "$branch_errors" ]; then
        echo "Errors: $branch_errors" >> "$result_file"
    fi
}

# Run checks
echo -e "\n${BLUE}🔍 Running health checks...${NC}"

if [ "$PARALLEL" = true ]; then
    # Parallel execution
    echo -e "${BLUE}Running checks in parallel...${NC}"
    for branch in "${PR_BRANCHES[@]}"; do
        check_branch "$branch" &
    done
    wait
else
    # Sequential execution
    for branch in "${PR_BRANCHES[@]}"; do
        check_branch "$branch"
    done
fi

# Return to original branch
cd "/Users/shou/Scripts/ai-trpg-platform"
git checkout "$CURRENT_BRANCH" 2>/dev/null

# Generate summary report
echo -e "\n${BLUE}📊 SUMMARY REPORT${NC}"
echo "=================================================="
echo -e "Total branches checked: ${YELLOW}$TOTAL_BRANCHES${NC}"
echo -e "Passed: ${GREEN}$PASSED_BRANCHES${NC}"
echo -e "Failed: ${RED}$FAILED_BRANCHES${NC}"

# Detailed results
echo -e "\n${BLUE}📋 DETAILED RESULTS${NC}"
echo "=================================================="

# Generate report file
{
    echo "AI-TRPG Platform PR Health Check Report"
    echo "Generated: $(date)"
    echo "Total branches: $TOTAL_BRANCHES"
    echo "Passed: $PASSED_BRANCHES"
    echo "Failed: $FAILED_BRANCHES"
    echo ""
    echo "RESULTS:"
} > "$REPORT_FILE"

for branch in "${PR_BRANCHES[@]}"; do
    if [ "${RESULTS[$branch]}" = "PASS" ]; then
        echo -e "${GREEN}✅ $branch${NC}"
        echo "✅ $branch" >> "$REPORT_FILE"
    else
        echo -e "${RED}❌ $branch${NC}"
        echo -e "   ${YELLOW}Errors: ${ERRORS[$branch]}${NC}"
        echo "❌ $branch" >> "$REPORT_FILE"
        echo "   Errors: ${ERRORS[$branch]}" >> "$REPORT_FILE"
    fi
done

echo -e "\n${BLUE}📄 Report saved to: $REPORT_FILE${NC}"

# Exit with appropriate code
if [ $FAILED_BRANCHES -gt 0 ]; then
    echo -e "\n${RED}⚠️ Some branches have issues. Check the details above.${NC}"
    exit 1
else
    echo -e "\n${GREEN}🎉 All branches are healthy!${NC}"
    exit 0
fi