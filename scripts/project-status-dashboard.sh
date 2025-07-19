#!/bin/bash

# ==============================================================================
# AI-TRPG Platform Project Status Dashboard
# ==============================================================================
# 
# このスクリプトは、Tasks.md、GitHub Issues、PRの状況を統合分析し、
# 次に実装すべきタスクを特定するためのダッシュボードを提供します。
#
# Usage:
#   ./scripts/project-status-dashboard.sh [--detailed] [--recommend-next]
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
REPORT_FILE="project-status-report.md"

# Flags
DETAILED=false
RECOMMEND_NEXT=false

# Parse command line arguments
for arg in "$@"; do
    case $arg in
        --detailed)
            DETAILED=true
            shift
            ;;
        --recommend-next)
            RECOMMEND_NEXT=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--detailed] [--recommend-next]"
            echo "  --detailed      Show detailed analysis of each component"
            echo "  --recommend-next Provide recommendations for next tasks"
            exit 0
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

# ==============================================================================
# Data Collection Functions
# ==============================================================================

collect_tasks_info() {
    if [ ! -f "$TASKS_FILE" ]; then
        echo -e "${RED}❌ Tasks file not found: $TASKS_FILE${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Tasks file found${NC}"
    
    # Count total tasks
    TOTAL_TASKS=$(grep -c "^- \[ \]" "$TASKS_FILE" 2>/dev/null || echo "0")
    COMPLETED_TASKS=$(grep -c "^- \[x\]" "$TASKS_FILE" 2>/dev/null || echo "0")
    
    # Remove any whitespace/newlines
    TOTAL_TASKS=${TOTAL_TASKS// /}
    COMPLETED_TASKS=${COMPLETED_TASKS// /}
    
    echo "Total tasks: $TOTAL_TASKS"
    echo "Completed tasks: $COMPLETED_TASKS"
    
    # Safe arithmetic
    if [[ "$TOTAL_TASKS" =~ ^[0-9]+$ ]] && [[ "$COMPLETED_TASKS" =~ ^[0-9]+$ ]]; then
        echo "Remaining tasks: $((TOTAL_TASKS - COMPLETED_TASKS))"
    else
        echo "Remaining tasks: Cannot calculate (invalid numbers)"
    fi
    
    # Extract milestones
    echo -e "\n${CYAN}📊 Milestone Overview:${NC}"
    grep "^### マイルストーン" "$TASKS_FILE" | sed 's/^### //' || echo "No milestones found"
}

collect_issues_info() {
    echo -e "${GREEN}✅ Collecting GitHub Issues...${NC}"
    
    # Check if gh CLI is available
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI (gh) not found${NC}"
        return 1
    fi
    
    # Get issues summary
    local open_issues=$(gh issue list --state open --json number | grep -c '"number"' || echo "0")
    local closed_issues=$(gh issue list --state closed --json number | grep -c '"number"' || echo "0")
    local total_issues=$((open_issues + closed_issues))
    
    echo "Total issues: $total_issues"
    echo "Open issues: $open_issues"
    echo "Closed issues: $closed_issues"
    
    if [ "$DETAILED" = true ]; then
        echo -e "\n${CYAN}📝 Open Issues Details:${NC}"
        gh issue list --state open --json number,title,labels --template '{{range .}}{{printf "#%v: %s" .number .title}}{{range .labels}} [{{.name}}]{{end}}{{printf "\n"}}{{end}}' || echo "No open issues"
    fi
}

collect_prs_info() {
    echo -e "${GREEN}✅ Collecting Pull Requests...${NC}"
    
    # Check if gh CLI is available
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI (gh) not found${NC}"
        return 1
    fi
    
    # Get PRs summary
    local open_prs=$(gh pr list --state open --json number | grep -c '"number"' || echo "0")
    local merged_prs=$(gh pr list --state merged --json number | grep -c '"number"' || echo "0")
    local closed_prs=$(gh pr list --state closed --json number | grep -c '"number"' || echo "0")
    local total_prs=$((open_prs + merged_prs + closed_prs))
    
    echo "Total PRs: $total_prs"
    echo "Open PRs: $open_prs"
    echo "Merged PRs: $merged_prs"
    echo "Closed PRs: $closed_prs"
    
    if [ "$DETAILED" = true ]; then
        echo -e "\n${CYAN}🔀 Open PRs Details:${NC}"
        gh pr list --state open --json number,title,headRefName,mergeable --template '{{range .}}{{printf "#%v: %s (%s) - %s" .number .title .headRefName .mergeable}}{{printf "\n"}}{{end}}' || echo "No open PRs"
        
        echo -e "\n${CYAN}✅ Recently Merged PRs:${NC}"
        gh pr list --state merged --limit 5 --json number,title,mergedAt --template '{{range .}}{{printf "#%v: %s (merged: %s)" .number .title .mergedAt}}{{printf "\n"}}{{end}}' || echo "No merged PRs"
    fi
}

analyze_dependencies() {
    echo -e "${GREEN}✅ Analyzing Dependencies...${NC}"
    
    if [ ! -f "$TASKS_FILE" ]; then
        echo -e "${RED}❌ Cannot analyze dependencies without tasks file${NC}"
        return 1
    fi
    
    echo -e "\n${CYAN}🔗 Dependency Analysis:${NC}"
    
    # Look for milestone completion status
    echo "Frontend Dependencies:"
    echo "  - Backend API endpoints completion status"
    echo "  - State management system readiness"
    echo "  - Component independence analysis"
    
    echo -e "\nBackend Dependencies:"
    echo "  - Mastra AI framework integration status"
    echo "  - Database schema completion"
    echo "  - API endpoint implementation progress"
    
    # Check current branch and recent activity
    echo -e "\n${CYAN}📍 Current Development Context:${NC}"
    echo "Current branch: $(git branch --show-current)"
    echo "Recent commits:"
    git log --oneline -5 || echo "No git history available"
}

recommend_next_tasks() {
    if [ "$RECOMMEND_NEXT" = false ]; then
        return 0
    fi
    
    echo -e "${GREEN}✅ Generating Recommendations...${NC}"
    
    echo -e "\n${CYAN}💡 Recommended Next Actions:${NC}"
    
    # Check for open PRs that might be blocking
    local open_prs=$(gh pr list --state open --json number,title,mergeable 2>/dev/null || echo "[]")
    if [ "$open_prs" != "[]" ] && [ "$open_prs" != "" ]; then
        echo -e "\n${YELLOW}⚠️  Consider these open PRs first:${NC}"
        gh pr list --state open --json number,title,mergeable --template '{{range .}}{{if eq .mergeable "CONFLICTING"}}❌ {{else if eq .mergeable "MERGEABLE"}}✅ {{else}}⏳ {{end}}#{{.number}}: {{.title}}{{printf "\n"}}{{end}}' 2>/dev/null || echo "Unable to fetch PR details"
    fi
    
    # Recommend based on milestone structure
    echo -e "\n${YELLOW}📈 Strategic Recommendations:${NC}"
    echo "1. 🔍 Review current milestone progress in Tasks.md"
    echo "2. ✅ Complete any MERGEABLE PRs to clear the pipeline"
    echo "3. 🔧 Address any CONFLICTING PRs before new development"
    echo "4. 🏗️  Focus on foundational components before UI elements"
    echo "5. 🧪 Ensure adequate testing before moving to next milestone"
    
    # File conflict analysis
    echo -e "\n${YELLOW}⚠️  Conflict Prevention:${NC}"
    echo "• Check file overlap before creating parallel Issues"
    echo "• Prioritize state management completion before UI components"
    echo "• Consider dependency order: Backend APIs → Frontend Services → UI Components"
}

generate_report() {
    echo -e "${GREEN}✅ Generating detailed report...${NC}"
    
    {
        echo "# AI-TRPG Platform Status Report"
        echo "Generated: $(date)"
        echo ""
        
        echo "## Executive Summary"
        echo ""
        echo "### Tasks Overview"
        echo "- Total Tasks: $TOTAL_TASKS"
        echo "- Completed: $COMPLETED_TASKS"
        echo "- Remaining: $((TOTAL_TASKS - COMPLETED_TASKS))"
        if [ "$TOTAL_TASKS" -gt 0 ]; then
            echo "- Progress: $(( COMPLETED_TASKS * 100 / TOTAL_TASKS ))%"
        else
            echo "- Progress: 0%"
        fi
        echo ""
        
        echo "## Current Status"
        echo ""
        echo "### GitHub Issues"
        gh issue list --state all --json number,title,state,labels --template '{{range .}}| #{{.number}} | {{.title}} | {{.state}} | {{range .labels}}{{.name}} {{end}} |{{printf "\n"}}{{end}}' 2>/dev/null | sed '1i| Issue | Title | State | Labels |\n|-------|-------|--------|--------|' || echo "Unable to fetch issues"
        
        echo ""
        echo "### Pull Requests"
        gh pr list --state all --limit 10 --json number,title,state,mergeable --template '{{range .}}| #{{.number}} | {{.title}} | {{.state}} | {{.mergeable}} |{{printf "\n"}}{{end}}' 2>/dev/null | sed '1i| PR | Title | State | Mergeable |\n|----|-------|--------|-----------|' || echo "Unable to fetch PRs"
        
        echo ""
        echo "## Next Actions"
        echo ""
        echo "1. Review open PRs and resolve any conflicts"
        echo "2. Identify next tasks based on dependency completion"
        echo "3. Plan parallel execution safely"
        echo ""
        
    } > "$REPORT_FILE"
    
    echo -e "${CYAN}📄 Report saved to: $REPORT_FILE${NC}"
}

# ==============================================================================
# Main Execution
# ==============================================================================

main() {
    print_header "AI-TRPG Platform Project Status Dashboard"
    
    echo -e "${BOLD}Current Working Directory:${NC} $(pwd)"
    echo -e "${BOLD}Timestamp:${NC} $(date)"
    
    print_section "Tasks Analysis"
    collect_tasks_info
    
    print_section "GitHub Issues Analysis"
    collect_issues_info
    
    print_section "Pull Requests Analysis"
    collect_prs_info
    
    print_section "Dependencies & Context"
    analyze_dependencies
    
    print_section "Recommendations"
    recommend_next_tasks
    
    print_section "Report Generation"
    generate_report
    
    echo -e "\n${GREEN}✨ Dashboard analysis complete!${NC}"
    echo -e "${CYAN}💡 Use --detailed for more information${NC}"
    echo -e "${CYAN}💡 Use --recommend-next for strategic recommendations${NC}"
}

# Run main function
main "$@"