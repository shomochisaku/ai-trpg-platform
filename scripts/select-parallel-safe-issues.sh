#!/bin/bash

# ==============================================================================
# Parallel-Safe Issue Selection Tool
# ==============================================================================
# 
# このスクリプトは、現在のPR状況とTasks.mdを分析し、
# 安全に並列実行できるIssueの組み合わせを提案します。
#
# Usage:
#   ./scripts/select-parallel-safe-issues.sh [--recommend] [--max-parallel N] [--focus AREA]
#
# Examples:
#   # 基本的な推奨
#   ./scripts/select-parallel-safe-issues.sh --recommend
#   
#   # 最大3つまでの並列実行
#   ./scripts/select-parallel-safe-issues.sh --recommend --max-parallel 3
#   
#   # フロントエンドに焦点を当てた分析
#   ./scripts/select-parallel-safe-issues.sh --recommend --focus frontend
#
# ==============================================================================

set -euo pipefail

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
TASKS_FILE=".kiro/specs/ai-trpg-platform/tasks.md"
RECOMMENDATIONS_REPORT="parallel-execution-recommendations.md"

# Flags and variables
RECOMMEND_MODE=false
MAX_PARALLEL=5
FOCUS_AREA=""
VERBOSE=false

# Issue classification patterns (bash 3.2 compatible)
classify_issue_area() {
    local text="$1"
    if [[ "$text" =~ backend|Backend|api|API|database|Database|server|Server ]]; then
        echo "backend"
    elif [[ "$text" =~ frontend|Frontend|react|React|component|Component|UI|ui ]]; then
        echo "frontend"
    elif [[ "$text" =~ AI|ai|mastra|Mastra|agent|Agent|rag|RAG ]]; then
        echo "ai"
    elif [[ "$text" =~ test|Test|testing|Testing|spec|Spec ]]; then
        echo "test"
    elif [[ "$text" =~ docker|Docker|deploy|Deploy|ci|CI|build|Build ]]; then
        echo "infra"
    else
        echo "unclassified"
    fi
}

get_file_impact() {
    local file="$1"
    if [[ "$file" =~ package\.json|tsconfig\.json|\.env|config\.|\.config ]]; then
        echo "config"
    elif [[ "$file" =~ App\.tsx|App\.ts|index\.tsx|index\.ts|main\.ts|main\.tsx ]]; then
        echo "entry"
    elif [[ "$file" =~ store/|stores/|state/|redux/|zustand ]]; then
        echo "store"
    elif [[ "$file" =~ types/|interfaces/|@types|\.d\.ts ]]; then
        echo "types"
    else
        echo "normal"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --recommend)
            RECOMMEND_MODE=true
            shift
            ;;
        --max-parallel)
            MAX_PARALLEL="$2"
            shift 2
            ;;
        --focus)
            FOCUS_AREA="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--recommend] [--max-parallel N] [--focus AREA]"
            echo ""
            echo "Options:"
            echo "  --recommend       Generate recommendations for parallel execution"
            echo "  --max-parallel N  Maximum number of parallel issues (default: 5)"
            echo "  --focus AREA      Focus on specific area (backend|frontend|ai|test|infra)"
            echo "  --verbose         Show detailed analysis"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ==============================================================================
# Helper Functions
# ==============================================================================

print_header() {
    local title="$1"
    local line="================================================================================"
    echo -e "\n${BLUE}${line}${NC}"
    echo -e "${BOLD}${CYAN}🚀 $title${NC}"
    echo -e "${BLUE}${line}${NC}\n"
}

print_section() {
    local title="$1"
    local line="--------------------------------------------------"
    echo -e "\n${BOLD}${YELLOW}📋 $title${NC}"
    echo -e "${YELLOW}${line}${NC}"
}

print_recommendation() {
    local priority="$1"
    local title="$2"
    local description="$3"
    
    case "$priority" in
        "high")
            echo -e "${GREEN}🚀 HIGH PRIORITY: ${BOLD}$title${NC}"
            ;;
        "medium")
            echo -e "${YELLOW}⚡ MEDIUM PRIORITY: ${BOLD}$title${NC}"
            ;;
        "low")
            echo -e "${CYAN}💡 LOW PRIORITY: ${BOLD}$title${NC}"
            ;;
    esac
    echo -e "   $description"
}

# ==============================================================================
# Analysis Functions
# ==============================================================================

collect_current_state() {
    print_section "Current State Analysis"
    
    # Check GitHub CLI availability
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI not available - limited analysis${NC}"
        return 1
    fi
    
    # Collect open issues
    echo -e "${CYAN}📊 Collecting open Issues...${NC}"
    local open_issues
    open_issues=$(gh issue list --state open --json number,title,labels 2>/dev/null || echo "[]")
    
    # Collect open PRs
    echo -e "${CYAN}📊 Collecting open PRs...${NC}"
    local open_prs
    open_prs=$(gh pr list --state open --json number,title,headRefName,mergeable,files 2>/dev/null || echo "[]")
    
    # Analyze open PRs for file conflicts
    echo -e "\n${BOLD}📂 Files currently being modified:${NC}"
    
    if [ "$open_prs" != "[]" ] && [ -n "$open_prs" ]; then
        while IFS= read -r line; do
            if [[ "$line" =~ \"number\":([0-9]+) ]]; then
                local pr_number="${BASH_REMATCH[1]}"
                echo -e "${BLUE}PR #${pr_number}:${NC}"
                
                # Get files for this PR
                local pr_files
                pr_files=$(gh pr view "$pr_number" --json files --jq '.files[].path' 2>/dev/null || echo "")
                
                if [ -n "$pr_files" ]; then
                    while IFS= read -r file; do
                        echo -e "  - $file"
                        
                        # Classify file impact
                        local impact
                        impact=$(get_file_impact "$file")
                        if [ "$impact" != "normal" ]; then
                            echo -e "    ${YELLOW}⚠️  HIGH IMPACT ($impact)${NC}"
                        fi
                    done <<< "$pr_files"
                else
                    echo -e "    ${YELLOW}No files found${NC}"
                fi
                echo ""
            fi
        done <<< "$open_prs"
    else
        echo -e "${GREEN}✅ No open PRs - clean slate for new work${NC}"
    fi
    
    # Store data for later use
    echo "$open_issues" > /tmp/current_open_issues.json
    echo "$open_prs" > /tmp/current_open_prs.json
}

analyze_issue_areas() {
    print_section "Issue Area Classification"
    
    if [ ! -f /tmp/current_open_issues.json ]; then
        echo -e "${RED}❌ No current state data available${NC}"
        return 1
    fi
    
    echo -e "${CYAN}🏷️  Classifying open Issues by area...${NC}\n"
    
    # Classify each open issue
    while IFS= read -r line; do
        if [[ "$line" =~ \"number\":([0-9]+) ]]; then
            local issue_number="${BASH_REMATCH[1]}"
            local issue_title=""
            local issue_labels=""
            
            # Extract title
            if [[ "$line" =~ \"title\":\"([^\"]+)\" ]]; then
                issue_title="${BASH_REMATCH[1]}"
            fi
            
            # Extract labels
            issue_labels=$(echo "$line" | grep -o '"name":"[^"]*"' | sed 's/"name":"//g; s/"//g' | tr '\n' ' ')
            
            echo -e "${BLUE}Issue #${issue_number}: ${issue_title}${NC}"
            echo -e "   Labels: $issue_labels"
            
            # Classify by area
            local area
            area=$(classify_issue_area "$issue_title $issue_labels")
            echo -e "   ${GREEN}📍 Area: $area${NC}"
            
            echo ""
        fi
    done < /tmp/current_open_issues.json
}

identify_dependency_chains() {
    print_section "Dependency Chain Analysis"
    
    echo -e "${CYAN}🔗 Analyzing typical dependency patterns...${NC}\n"
    
    # Common dependency chains in web development
    echo -e "${BOLD}Common Dependency Chains:${NC}"
    echo -e "1. ${BLUE}Backend Foundation Chain:${NC}"
    echo -e "   Mastra AI → Database Schema → API Endpoints → Integration Tests"
    echo -e ""
    echo -e "2. ${BLUE}Frontend Foundation Chain:${NC}"
    echo -e "   State Management → Service Layer → Core Components → UI Components"
    echo -e ""
    echo -e "3. ${BLUE}Testing Chain:${NC}"
    echo -e "   Unit Tests → Integration Tests → E2E Tests → Performance Tests"
    echo -e ""
    
    # Analyze current issues against these chains
    echo -e "${BOLD}Current Issues Dependency Status:${NC}"
    
    # Check if foundational issues are complete
    local foundation_status="unknown"
    if command -v gh &> /dev/null; then
        # Check for closed issues that indicate foundation completion
        local closed_foundation
        closed_foundation=$(gh issue list --state closed --json title | grep -i "state\|store\|management" || echo "")
        
        if [ -n "$closed_foundation" ]; then
            foundation_status="completed"
            echo -e "${GREEN}✅ State management foundation appears complete${NC}"
        else
            foundation_status="pending"
            echo -e "${YELLOW}⏳ State management foundation status unclear${NC}"
        fi
    fi
    
    echo ""
}

generate_safe_combinations() {
    print_section "Safe Parallel Execution Combinations"
    
    echo -e "${CYAN}🧮 Generating safe parallel execution groups...${NC}\n"
    
    # Group 1: Independent UI Components (post-foundation)
    echo -e "${BOLD}Group 1: Independent UI Components${NC}"
    echo -e "${GREEN}✅ Safe for parallel execution${NC}"
    echo -e "Prerequisites: State management system complete"
    echo -e "Characteristics: Different components, no shared files"
    echo -e "Examples:"
    echo -e "  - Chat log component"
    echo -e "  - Status display component"
    echo -e "  - Action input component"
    echo -e "  - Dice roll component"
    echo -e ""
    
    # Group 2: Backend API Endpoints
    echo -e "${BOLD}Group 2: Backend API Endpoints${NC}"
    echo -e "${GREEN}✅ Safe for parallel execution${NC}"
    echo -e "Prerequisites: Database schema and Mastra integration complete"
    echo -e "Characteristics: Different route files, independent functionality"
    echo -e "Examples:"
    echo -e "  - User management endpoints"
    echo -e "  - Game session endpoints"
    echo -e "  - Character management endpoints"
    echo -e "  - History/save endpoints"
    echo -e ""
    
    # Group 3: Testing Implementation
    echo -e "${BOLD}Group 3: Testing Implementation${NC}"
    echo -e "${GREEN}✅ Safe for parallel execution${NC}"
    echo -e "Prerequisites: Core functionality implemented"
    echo -e "Characteristics: Different test files, independent test suites"
    echo -e "Examples:"
    echo -e "  - Frontend component tests"
    echo -e "  - Backend API tests"
    echo -e "  - Integration tests"
    echo -e "  - E2E test setup"
    echo -e ""
    
    # Dangerous combinations
    echo -e "${BOLD}${RED}❌ Dangerous Combinations to Avoid:${NC}"
    echo -e "- Multiple issues modifying App.tsx"
    echo -e "- Simultaneous package.json changes"
    echo -e "- Config file modifications"
    echo -e "- State management system changes"
    echo -e "- Type definition overlaps"
    echo ""
}

analyze_current_blocking_factors() {
    print_section "Current Blocking Factors"
    
    if [ ! -f /tmp/current_open_prs.json ]; then
        echo -e "${YELLOW}⚠️  No PR data available for blocking analysis${NC}"
        return 0
    fi
    
    echo -e "${CYAN}🚧 Analyzing what's currently blocking parallel execution...${NC}\n"
    
    local blocking_files=()
    
    # Analyze open PRs for blocking files
    while IFS= read -r line; do
        if [[ "$line" =~ \"number\":([0-9]+) ]]; then
            local pr_number="${BASH_REMATCH[1]}"
            local pr_mergeable=""
            
            # Check mergeable status
            if [[ "$line" =~ \"mergeable\":\"([^\"]+)\" ]]; then
                pr_mergeable="${BASH_REMATCH[1]}"
            fi
            
            echo -e "${BLUE}PR #${pr_number} Status: ${pr_mergeable}${NC}"
            
            if [ "$pr_mergeable" = "CONFLICTING" ]; then
                echo -e "  ${RED}❌ BLOCKING: Conflicts must be resolved${NC}"
            elif [ "$pr_mergeable" = "MERGEABLE" ]; then
                echo -e "  ${GREEN}✅ Ready to merge - consider merging first${NC}"
                
                # Get files from this PR
                local pr_files
                pr_files=$(gh pr view "$pr_number" --json files --jq '.files[].path' 2>/dev/null || echo "")
                
                if [ -n "$pr_files" ]; then
                    echo -e "  Files that will be freed after merge:"
                    while IFS= read -r file; do
                        echo -e "    - $file"
                        blocking_files+=("$file")
                    done <<< "$pr_files"
                fi
            else
                echo -e "  ${YELLOW}⏳ Status unclear - needs investigation${NC}"
            fi
            
            echo ""
        fi
    done < /tmp/current_open_prs.json
    
    # Recommendations based on blocking factors
    if [ ${#blocking_files[@]} -gt 0 ]; then
        echo -e "${BOLD}📋 Recommendations:${NC}"
        echo -e "1. ${GREEN}Merge ready PRs first to free up files${NC}"
        echo -e "2. ${YELLOW}Avoid creating Issues that modify these files:${NC}"
        for file in "${blocking_files[@]}"; do
            echo -e "   - $file"
        done
        echo -e "3. ${CYAN}Focus on independent areas not affected by current PRs${NC}"
    else
        echo -e "${GREEN}✅ No obvious blocking factors detected${NC}"
    fi
}

generate_specific_recommendations() {
    if [ "$RECOMMEND_MODE" = false ]; then
        return 0
    fi
    
    print_section "Specific Parallel Execution Recommendations"
    
    echo -e "${CYAN}💡 Based on current analysis, here are specific recommendations:${NC}\n"
    
    # Immediate actions
    echo -e "${BOLD}Immediate Actions (Next 1-2 days):${NC}"
    
    # Check if there are MERGEABLE PRs
    if [ -f /tmp/current_open_prs.json ]; then
        local mergeable_count
        mergeable_count=$(grep -c "MERGEABLE" /tmp/current_open_prs.json 2>/dev/null || echo "0")
        
        if [ "$mergeable_count" -gt 0 ]; then
            print_recommendation "high" "Merge Ready PRs" "Complete $mergeable_count ready PRs to clear the pipeline"
        fi
    fi
    
    # Medium-term parallel execution
    echo -e "\n${BOLD}Medium-term Parallel Groups (Next 3-5 days):${NC}"
    
    if [ -z "$FOCUS_AREA" ] || [ "$FOCUS_AREA" = "frontend" ]; then
        print_recommendation "medium" "Frontend Component Group" "Status display + Dice roll components (non-overlapping files)"
    fi
    
    if [ -z "$FOCUS_AREA" ] || [ "$FOCUS_AREA" = "backend" ]; then
        print_recommendation "medium" "Backend Service Group" "Character management + Session history APIs (independent routes)"
    fi
    
    if [ -z "$FOCUS_AREA" ] || [ "$FOCUS_AREA" = "test" ]; then
        print_recommendation "low" "Testing Infrastructure" "Unit tests + Integration test setup (parallel test files)"
    fi
    
    # Strategic recommendations
    echo -e "\n${BOLD}Strategic Recommendations:${NC}"
    echo -e "1. ${CYAN}Foundation First:${NC} Complete state management before UI components"
    echo -e "2. ${CYAN}Layer by Layer:${NC} Backend APIs → Frontend Services → UI Components"
    echo -e "3. ${CYAN}Test Continuously:${NC} Add tests in parallel with feature development"
    echo -e "4. ${CYAN}Monitor Conflicts:${NC} Use conflict checking tools before starting new Issues"
    
    echo ""
}

generate_recommendations_report() {
    print_section "Generating Recommendations Report"
    
    {
        echo "# Parallel Execution Recommendations Report"
        echo "Generated: $(date)"
        echo ""
        
        echo "## Executive Summary"
        echo ""
        echo "This report provides recommendations for safe parallel Issue execution"
        echo "based on current project state, open PRs, and dependency analysis."
        echo ""
        
        echo "## Current State"
        echo ""
        if [ -f /tmp/current_open_prs.json ]; then
            local open_pr_count
            open_pr_count=$(grep -c '"number"' /tmp/current_open_prs.json 2>/dev/null || echo "0")
            echo "- Open PRs: $open_pr_count"
        fi
        
        if [ -f /tmp/current_open_issues.json ]; then
            local open_issue_count
            open_issue_count=$(grep -c '"number"' /tmp/current_open_issues.json 2>/dev/null || echo "0")
            echo "- Open Issues: $open_issue_count"
        fi
        
        echo ""
        echo "## Safe Parallel Groups"
        echo ""
        echo "### Group A: Independent UI Components"
        echo "- **Prerequisites**: State management complete"
        echo "- **Risk Level**: Low"
        echo "- **Max Parallel**: 3-4 issues"
        echo "- **Examples**: Chat log, Status display, Action input"
        echo ""
        
        echo "### Group B: Backend API Endpoints"
        echo "- **Prerequisites**: Database schema complete"
        echo "- **Risk Level**: Low"
        echo "- **Max Parallel**: 2-3 issues"
        echo "- **Examples**: User management, Session management"
        echo ""
        
        echo "### Group C: Testing Implementation"
        echo "- **Prerequisites**: Core features implemented"
        echo "- **Risk Level**: Very Low"
        echo "- **Max Parallel**: 4-5 issues"
        echo "- **Examples**: Component tests, API tests, E2E setup"
        echo ""
        
        echo "## Conflict Prevention Guidelines"
        echo ""
        echo "1. **Never parallel execute**:"
        echo "   - Issues modifying the same files"
        echo "   - Config file changes"
        echo "   - State management modifications"
        echo ""
        echo "2. **Use tools before starting**:"
        echo "   - \`./scripts/check-issue-conflicts.sh\`"
        echo "   - \`./scripts/project-status-dashboard.sh\`"
        echo ""
        echo "3. **Monitor progress**:"
        echo "   - Check PR status regularly"
        echo "   - Merge ready PRs promptly"
        echo "   - Address conflicts immediately"
        echo ""
        
        echo "## Next Steps"
        echo ""
        echo "1. Review and merge any MERGEABLE PRs"
        echo "2. Select Issues from safe groups based on current state"
        echo "3. Use conflict prevention tools before Issue creation"
        echo "4. Execute in small batches (max $MAX_PARALLEL parallel)"
        echo ""
        
        echo "---"
        echo "*Generated by AI-TRPG Platform Parallel Execution Tool*"
        
    } > "$RECOMMENDATIONS_REPORT"
    
    echo -e "${GREEN}✅ Detailed recommendations saved to: $RECOMMENDATIONS_REPORT${NC}"
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    print_header "Parallel-Safe Issue Selection Analysis"
    
    echo -e "${BOLD}Configuration:${NC}"
    echo -e "  Max parallel: $MAX_PARALLEL"
    echo -e "  Focus area: ${FOCUS_AREA:-all}"
    echo -e "  Recommend mode: $RECOMMEND_MODE"
    
    # Main analysis flow
    collect_current_state
    analyze_issue_areas
    identify_dependency_chains
    generate_safe_combinations
    analyze_current_blocking_factors
    generate_specific_recommendations
    generate_recommendations_report
    
    # Summary
    print_section "Summary"
    echo -e "${GREEN}✅ Analysis complete!${NC}"
    echo -e "${CYAN}📋 Key takeaways:${NC}"
    echo -e "1. Always check for file conflicts before creating Issues"
    echo -e "2. Prioritize foundation completion before parallel UI work"
    echo -e "3. Merge ready PRs to free up development pipeline"
    echo -e "4. Use generated reports for detailed planning"
    
    echo -e "\n${CYAN}🛠️  Available tools:${NC}"
    echo -e "  - \`./scripts/check-issue-conflicts.sh\` - Check specific file conflicts"
    echo -e "  - \`./scripts/project-status-dashboard.sh\` - Overall project status"
    echo -e "  - \`$RECOMMENDATIONS_REPORT\` - Detailed recommendations"
    
    # Cleanup
    rm -f /tmp/current_open_issues.json /tmp/current_open_prs.json
}

# Run main function
main "$@"