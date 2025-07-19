#!/bin/bash

# ==============================================================================
# Issue Conflict Prevention Tool
# ==============================================================================
# 
# このスクリプトは、新しいIssueで変更予定のファイルが既存のPRと
# conflictする可能性をチェックします。
#
# Usage:
#   ./scripts/check-issue-conflicts.sh --files "path1,path2" [--existing-prs] [--simulate]
#   ./scripts/check-issue-conflicts.sh --task-id "1.2" [--analyze-deps]
#
# Examples:
#   # ファイルベースのチェック
#   ./scripts/check-issue-conflicts.sh --files "frontend/src/App.tsx,frontend/src/store/*"
#   
#   # タスクIDベースのチェック（将来の機能）
#   ./scripts/check-issue-conflicts.sh --task-id "2A.1" --analyze-deps
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
CONFLICT_REPORT="conflict-analysis-report.md"

# Flags and variables
FILES_TO_CHECK=""
TASK_ID=""
CHECK_EXISTING_PRS=false
SIMULATE_MERGE=false
ANALYZE_DEPS=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --files)
            FILES_TO_CHECK="$2"
            shift 2
            ;;
        --task-id)
            TASK_ID="$2"
            shift 2
            ;;
        --existing-prs)
            CHECK_EXISTING_PRS=true
            shift
            ;;
        --simulate)
            SIMULATE_MERGE=true
            shift
            ;;
        --analyze-deps)
            ANALYZE_DEPS=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 --files \"path1,path2\" [--existing-prs] [--simulate]"
            echo "       $0 --task-id \"task_id\" [--analyze-deps]"
            echo ""
            echo "Options:"
            echo "  --files FILES     Comma-separated list of files to check"
            echo "  --task-id ID      Task ID from Tasks.md to analyze"
            echo "  --existing-prs    Check against existing open PRs"
            echo "  --simulate        Simulate merge conflicts"
            echo "  --analyze-deps    Analyze task dependencies"
            echo "  --verbose         Show detailed output"
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
    echo -e "${BOLD}${CYAN}🔍 $title${NC}"
    echo -e "${BLUE}${line}${NC}\n"
}

print_section() {
    local title="$1"
    local line="--------------------------------------------------"
    echo -e "\n${BOLD}${YELLOW}📋 $title${NC}"
    echo -e "${YELLOW}${line}${NC}"
}

print_result() {
    local status="$1"
    local message="$2"
    
    case "$status" in
        "safe")
            echo -e "${GREEN}✅ SAFE: $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  WARNING: $message${NC}"
            ;;
        "danger")
            echo -e "${RED}❌ DANGER: $message${NC}"
            ;;
        "info")
            echo -e "${CYAN}ℹ️  INFO: $message${NC}"
            ;;
    esac
}

# ==============================================================================
# Core Analysis Functions
# ==============================================================================

expand_file_patterns() {
    local files="$1"
    local expanded_files=()
    
    # Split by comma and expand each pattern
    IFS=',' read -ra FILE_ARRAY <<< "$files"
    for pattern in "${FILE_ARRAY[@]}"; do
        # Trim whitespace
        pattern=$(echo "$pattern" | xargs)
        
        if [[ "$pattern" == *"*"* ]]; then
            # Expand glob pattern
            while IFS= read -r -d '' file; do
                expanded_files+=("$file")
            done < <(find . -path "./$pattern" -type f -print0 2>/dev/null || true)
        else
            # Regular file
            if [ -f "$pattern" ]; then
                expanded_files+=("$pattern")
            fi
        fi
    done
    
    printf '%s\n' "${expanded_files[@]}" | sort -u
}

check_file_conflicts_with_prs() {
    local files_to_check="$1"
    local conflicts_found=0
    local warnings_found=0
    
    print_section "Checking File Conflicts with Open PRs"
    
    # Get list of open PRs
    if ! command -v gh &> /dev/null; then
        print_result "warning" "GitHub CLI not available, skipping PR conflict check"
        return 0
    fi
    
    local open_prs
    open_prs=$(gh pr list --state open --json number,headRefName,title 2>/dev/null || echo "[]")
    
    if [ "$open_prs" = "[]" ] || [ -z "$open_prs" ]; then
        print_result "safe" "No open PRs found - no conflicts possible"
        return 0
    fi
    
    echo -e "${CYAN}📊 Analyzing conflicts with open PRs...${NC}\n"
    
    # Check each open PR
    while IFS= read -r line; do
        if [[ "$line" =~ \"number\":([0-9]+) ]]; then
            local pr_number="${BASH_REMATCH[1]}"
            local pr_branch=""
            local pr_title=""
            
            # Extract branch and title
            if [[ "$line" =~ \"headRefName\":\"([^\"]+)\" ]]; then
                pr_branch="${BASH_REMATCH[1]}"
            fi
            if [[ "$line" =~ \"title\":\"([^\"]+)\" ]]; then
                pr_title="${BASH_REMATCH[1]}"
            fi
            
            echo -e "${BLUE}🔍 Checking PR #${pr_number}: ${pr_title}${NC}"
            echo -e "   Branch: ${pr_branch}"
            
            # Get files changed in this PR
            local pr_files
            pr_files=$(gh pr view "$pr_number" --json files --jq '.files[].path' 2>/dev/null || echo "")
            
            if [ -n "$pr_files" ]; then
                echo -e "   Changed files in PR:"
                while IFS= read -r pr_file; do
                    echo -e "     - $pr_file"
                    
                    # Check if any of our target files overlap
                    while IFS= read -r target_file; do
                        if [ "$pr_file" = "$target_file" ]; then
                            print_result "danger" "File conflict detected: $pr_file"
                            ((conflicts_found++))
                        elif [[ "$pr_file" == *"$(dirname "$target_file")"* ]] || [[ "$target_file" == *"$(dirname "$pr_file")"* ]]; then
                            print_result "warning" "Related file overlap: $pr_file ↔ $target_file"
                            ((warnings_found++))
                        fi
                    done <<< "$files_to_check"
                done <<< "$pr_files"
            else
                echo -e "     ${YELLOW}No files found or error accessing PR${NC}"
            fi
            
            echo ""
        fi
    done <<< "$open_prs"
    
    # Summary
    if [ $conflicts_found -gt 0 ]; then
        print_result "danger" "Found $conflicts_found direct file conflicts"
        return 1
    elif [ $warnings_found -gt 0 ]; then
        print_result "warning" "Found $warnings_found potential related conflicts"
        return 2
    else
        print_result "safe" "No file conflicts detected with open PRs"
        return 0
    fi
}

simulate_merge_conflicts() {
    local files_to_check="$1"
    
    print_section "Simulating Merge Conflicts"
    
    if ! command -v gh &> /dev/null; then
        print_result "warning" "GitHub CLI not available, skipping merge simulation"
        return 0
    fi
    
    # Get open PRs with MERGEABLE status
    local mergeable_prs
    mergeable_prs=$(gh pr list --state open --json number,headRefName,mergeable --jq '.[] | select(.mergeable == "MERGEABLE") | .number' 2>/dev/null || echo "")
    
    if [ -z "$mergeable_prs" ]; then
        print_result "info" "No MERGEABLE PRs found for simulation"
        return 0
    fi
    
    echo -e "${CYAN}🧪 Simulating merge scenarios...${NC}\n"
    
    while IFS= read -r pr_number; do
        if [ -n "$pr_number" ]; then
            echo -e "${BLUE}🔬 Simulating merge with PR #${pr_number}${NC}"
            
            # Create temporary test branch
            local test_branch="test-merge-simulation-$$"
            local pr_branch
            pr_branch=$(gh pr view "$pr_number" --json headRefName --jq '.headRefName' 2>/dev/null || echo "")
            
            if [ -n "$pr_branch" ]; then
                # Fetch the PR branch
                git fetch origin "$pr_branch" 2>/dev/null || {
                    print_result "warning" "Cannot fetch branch $pr_branch"
                    continue
                }
                
                # Create test branch and attempt merge
                git checkout -b "$test_branch" origin/main 2>/dev/null || {
                    print_result "warning" "Cannot create test branch"
                    continue
                }
                
                # Test merge
                if git merge "origin/$pr_branch" --no-commit --no-ff 2>/dev/null; then
                    print_result "safe" "Clean merge possible with PR #${pr_number}"
                    git merge --abort 2>/dev/null || true
                else
                    print_result "warning" "Merge conflicts detected with PR #${pr_number}"
                    git merge --abort 2>/dev/null || true
                fi
                
                # Cleanup
                git checkout main 2>/dev/null || true
                git branch -D "$test_branch" 2>/dev/null || true
            fi
        fi
    done <<< "$mergeable_prs"
}

analyze_dependency_impact() {
    local files_to_check="$1"
    
    print_section "Dependency Impact Analysis"
    
    echo -e "${CYAN}🔗 Analyzing dependency relationships...${NC}\n"
    
    while IFS= read -r file; do
        if [ -f "$file" ]; then
            echo -e "${BLUE}📄 Analyzing: $file${NC}"
            
            # Check if it's a key infrastructure file
            case "$file" in
                */package.json)
                    print_result "warning" "Package configuration file - high impact"
                    ;;
                */App.tsx|*/App.ts|*/index.tsx|*/index.ts)
                    print_result "warning" "Application entry point - high impact"
                    ;;
                */types/*|*/interfaces/*)
                    print_result "info" "Type definition file - medium impact"
                    ;;
                */store/*|*/stores/*)
                    print_result "warning" "State management file - high impact"
                    ;;
                */components/*)
                    print_result "safe" "Component file - low conflict risk"
                    ;;
                */services/*|*/api/*)
                    print_result "info" "Service layer file - medium impact"
                    ;;
                *.config.*|*.json|*.yaml|*.yml)
                    print_result "warning" "Configuration file - high impact"
                    ;;
                *)
                    print_result "info" "Regular file - analyze individually"
                    ;;
            esac
            
            # Check imports/dependencies
            if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
                local import_count
                import_count=$(grep -c "^import\|^const.*require" "$file" 2>/dev/null || echo "0")
                echo -e "   Imports: $import_count dependencies"
                
                # Check if other files import this one
                local usage_count=0
                find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | while read -r other_file; do
                    if [ "$other_file" != "$file" ] && grep -q "$(basename "$file" .tsx | sed 's/\.ts$//')" "$other_file" 2>/dev/null; then
                        ((usage_count++))
                    fi
                done
                echo -e "   Used by: approximately $usage_count files"
            fi
            
            echo ""
        fi
    done <<< "$files_to_check"
}

generate_conflict_report() {
    local files_checked="$1"
    local analysis_results="$2"
    
    print_section "Generating Conflict Report"
    
    {
        echo "# Issue Conflict Analysis Report"
        echo "Generated: $(date)"
        echo ""
        
        echo "## Analysis Summary"
        echo ""
        echo "### Files Analyzed"
        while IFS= read -r file; do
            echo "- \`$file\`"
        done <<< "$files_checked"
        echo ""
        
        echo "### Recommendations"
        echo ""
        echo "Based on the analysis:"
        echo ""
        echo "1. **Safe to Proceed**: No direct conflicts detected"
        echo "2. **Proceed with Caution**: Monitor related file changes"
        echo "3. **Review Required**: Potential conflicts need review"
        echo "4. **Block**: Direct conflicts must be resolved first"
        echo ""
        
        echo "### Next Steps"
        echo ""
        echo "1. Review open PRs for related changes"
        echo "2. Consider dependencies and impact"
        echo "3. Plan execution order to minimize conflicts"
        echo "4. Set up monitoring for the development process"
        echo ""
        
        echo "---"
        echo "*Report generated by AI-TRPG Platform Conflict Prevention Tool*"
        
    } > "$CONFLICT_REPORT"
    
    print_result "info" "Detailed report saved to: $CONFLICT_REPORT"
}

# ==============================================================================
# Main Execution Logic
# ==============================================================================

main() {
    print_header "Issue Conflict Prevention Analysis"
    
    # Validation
    if [ -z "$FILES_TO_CHECK" ] && [ -z "$TASK_ID" ]; then
        echo -e "${RED}❌ Error: Either --files or --task-id must be specified${NC}"
        exit 1
    fi
    
    # Expand file patterns if provided
    if [ -n "$FILES_TO_CHECK" ]; then
        echo -e "${BOLD}📂 Files to analyze:${NC} $FILES_TO_CHECK"
        FILES_TO_CHECK=$(expand_file_patterns "$FILES_TO_CHECK")
        
        if [ -z "$FILES_TO_CHECK" ]; then
            print_result "warning" "No files found matching the patterns"
            exit 1
        fi
        
        echo -e "\n${CYAN}📋 Expanded file list:${NC}"
        while IFS= read -r file; do
            echo -e "  - $file"
        done <<< "$FILES_TO_CHECK"
    fi
    
    # Main analysis phases
    local overall_status=0
    
    if [ "$CHECK_EXISTING_PRS" = true ]; then
        if ! check_file_conflicts_with_prs "$FILES_TO_CHECK"; then
            overall_status=$?
        fi
    fi
    
    if [ "$SIMULATE_MERGE" = true ]; then
        simulate_merge_conflicts "$FILES_TO_CHECK"
    fi
    
    if [ "$ANALYZE_DEPS" = true ]; then
        analyze_dependency_impact "$FILES_TO_CHECK"
    fi
    
    # Always generate basic report
    generate_conflict_report "$FILES_TO_CHECK" "analysis_complete"
    
    # Final recommendation
    print_section "Final Recommendation"
    
    case $overall_status in
        0)
            print_result "safe" "✅ PROCEED - No significant conflicts detected"
            echo -e "${GREEN}This Issue appears safe to create and implement.${NC}"
            ;;
        1)
            print_result "danger" "❌ BLOCK - Direct conflicts found"
            echo -e "${RED}Resolve existing conflicts before proceeding.${NC}"
            ;;
        2)
            print_result "warning" "⚠️  CAUTION - Potential conflicts detected"
            echo -e "${YELLOW}Review conflicts and proceed carefully.${NC}"
            ;;
    esac
    
    echo -e "\n${CYAN}💡 Use the generated report for detailed analysis.${NC}"
    return $overall_status
}

# Run main function
main "$@"