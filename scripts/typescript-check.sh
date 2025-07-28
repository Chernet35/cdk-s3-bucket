#!/bin/bash
set -euo pipefail

# Highly Optimized TypeScript Compilation Check Script
# Enterprise-grade TypeScript validation with comprehensive error reporting

source "$(dirname "$0")/setup-build-env.sh" 2>/dev/null || {
    # Fallback logging functions if setup-build-env.sh is not available
    print_status() { echo -e "\033[0;32m[INFO]\033[0m $1" >&2; }
    print_warning() { echo -e "\033[1;33m[WARN]\033[0m $1" >&2; }
    print_error() { echo -e "\033[0;31m[ERROR]\033[0m $1" >&2; }
    print_header() { echo -e "\033[0;34m━━━ $1 ━━━\033[0m" >&2; }
    print_success() { echo -e "\033[0;32m✅ $1\033[0m" >&2; }
}

print_header "Highly Optimized TypeScript Compilation Check"

# Configuration
TYPESCRIPT_TIMEOUT="${TYPESCRIPT_TIMEOUT:-120}"
MAX_RETRIES="${MAX_RETRIES:-2}"
CACHE_DIR="cache/typescript"
REPORTS_DIR="reports/typescript"

# Create directories
mkdir -p "$CACHE_DIR" "$REPORTS_DIR"

print_status "TypeScript Check Configuration:"
print_status "  Timeout: ${TYPESCRIPT_TIMEOUT}s"
print_status "  Max Retries: $MAX_RETRIES"
print_status "  Cache Directory: $CACHE_DIR"
print_status "  Reports Directory: $REPORTS_DIR"

# Performance optimization
export NODE_OPTIONS="--max-old-space-size=4096"
export TSC_COMPILE_ON_ERROR=true

# Function to check TypeScript installation
check_typescript_installation() {
    print_status "Checking TypeScript installation..."
    
    if ! command -v npx >/dev/null 2>&1; then
        print_error "npx not found. Please install Node.js and npm."
        return 1
    fi
    
    # Check if TypeScript is available
    if ! npx tsc --version >/dev/null 2>&1; then
        print_warning "TypeScript not found. Installing..."
        npm install typescript@latest --save-dev --silent
    fi
    
    local tsc_version=$(npx tsc --version)
    print_success "TypeScript: $tsc_version"
    return 0
}

# Function to validate tsconfig.json
validate_tsconfig() {
    print_status "Validating tsconfig.json..."
    
    if [[ ! -f "tsconfig.json" ]]; then
        print_error "tsconfig.json not found"
        return 1
    fi
    
    # Validate JSON syntax
    if command -v jq >/dev/null 2>&1; then
        if ! jq empty tsconfig.json 2>/dev/null; then
            print_error "tsconfig.json has invalid JSON syntax"
            return 1
        fi
    else
        # Basic validation without jq
        if ! node -e "JSON.parse(require('fs').readFileSync('tsconfig.json', 'utf8'))" 2>/dev/null; then
            print_error "tsconfig.json has invalid JSON syntax"
            return 1
        fi
    fi
    
    print_success "tsconfig.json is valid"
    return 0
}

# Function to analyze TypeScript files
analyze_typescript_files() {
    print_status "Analyzing TypeScript files..."
    
    local ts_files=$(find . -name "*.ts" -not -path "./node_modules/*" -not -path "./cdk.out/*" -not -path "./coverage/*" -not -path "./reports/*" | wc -l)
    local tsx_files=$(find . -name "*.tsx" -not -path "./node_modules/*" -not -path "./cdk.out/*" -not -path "./coverage/*" -not -path "./reports/*" | wc -l)
    
    print_status "Found $ts_files TypeScript files and $tsx_files TSX files"
    
    if [[ $ts_files -eq 0 && $tsx_files -eq 0 ]]; then
        print_warning "No TypeScript files found to check"
        return 0
    fi
    
    return 0
}

# Function to run TypeScript compilation check with retries
run_typescript_check() {
    local attempt=1
    local check_success=false
    
    while [[ $attempt -le $MAX_RETRIES && "$check_success" == "false" ]]; do
        print_status "TypeScript compilation check attempt $attempt/$MAX_RETRIES"
        
        local start_time=$(date +%s)
        local tsc_output_file="$REPORTS_DIR/tsc-output-attempt-$attempt.txt"
        
        # Run TypeScript compilation check
        if timeout $TYPESCRIPT_TIMEOUT npx tsc --noEmit --skipLibCheck --pretty 2>&1 | tee "$tsc_output_file"; then
            check_success=true
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            print_success "TypeScript compilation check passed in ${duration}s"
            
            # Save successful compilation info
            echo "{\"attempt\":$attempt,\"duration\":$duration,\"status\":\"success\",\"timestamp\":$(date +%s)}" > "$REPORTS_DIR/compilation-result.json"
            
        else
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            print_error "TypeScript compilation check failed on attempt $attempt (${duration}s)"
            
            # Analyze errors
            analyze_compilation_errors "$tsc_output_file" "$attempt"
            
            if [[ $attempt -lt $MAX_RETRIES ]]; then
                print_status "Preparing for retry..."
                
                # Clean TypeScript cache
                rm -rf "$CACHE_DIR"/* 2>/dev/null || true
                
                # Wait before retry
                sleep 2
            fi
        fi
        
        ((attempt++))
    done
    
    if [[ "$check_success" == "false" ]]; then
        print_error "TypeScript compilation check failed after $MAX_RETRIES attempts"
        generate_failure_report
        return 1
    fi
    
    return 0
}

# Function to analyze compilation errors
analyze_compilation_errors() {
    local output_file="$1"
    local attempt="$2"
    
    print_status "Analyzing compilation errors from attempt $attempt..."
    
    if [[ ! -f "$output_file" ]]; then
        print_warning "No output file found for error analysis"
        return
    fi
    
    # Count different types of errors
    local syntax_errors=$(grep -c "error TS[0-9]*:" "$output_file" 2>/dev/null || echo "0")
    local type_errors=$(grep -c "error TS2[0-9]*:" "$output_file" 2>/dev/null || echo "0")
    local import_errors=$(grep -c "Cannot find module" "$output_file" 2>/dev/null || echo "0")
    
    print_status "Error Analysis (Attempt $attempt):"
    print_status "  Total Errors: $syntax_errors"
    print_status "  Type Errors: $type_errors"
    print_status "  Import Errors: $import_errors"
    
    # Extract most common errors
    if [[ $syntax_errors -gt 0 ]]; then
        print_status "Most Common Errors:"
        grep "error TS[0-9]*:" "$output_file" | head -5 | while read -r line; do
            print_status "  - $line"
        done
    fi
    
    # Save error analysis
    cat > "$REPORTS_DIR/error-analysis-attempt-$attempt.json" << EOF
{
  "attempt": $attempt,
  "timestamp": $(date +%s),
  "total_errors": $syntax_errors,
  "type_errors": $type_errors,
  "import_errors": $import_errors,
  "analysis_file": "$(basename "$output_file")"
}
EOF
}

# Function to generate failure report
generate_failure_report() {
    print_status "Generating TypeScript compilation failure report..."
    
    local report_file="$REPORTS_DIR/typescript-failure-report.md"
    
    cat > "$report_file" << EOF
# TypeScript Compilation Failure Report

**Generated:** $(date)
**Build ID:** ${BUILD_ID:-N/A}
**Max Retries:** $MAX_RETRIES
**Timeout:** ${TYPESCRIPT_TIMEOUT}s

## Failure Summary

The TypeScript compilation check failed after $MAX_RETRIES attempts.

## Common Issues and Solutions

### 1. Missing Dependencies
- **Issue**: Cannot find module errors
- **Solution**: Run \`npm install\` to install missing dependencies
- **Command**: \`npm install\`

### 2. Type Declaration Issues
- **Issue**: Type errors (TS2xxx)
- **Solution**: Install missing type declarations
- **Command**: \`npm install @types/node @types/jest --save-dev\`

### 3. Import Path Issues
- **Issue**: Module resolution errors
- **Solution**: Check import paths and file extensions
- **Fix**: Ensure all imports use correct relative/absolute paths

### 4. Configuration Issues
- **Issue**: tsconfig.json problems
- **Solution**: Validate and fix TypeScript configuration
- **Check**: Ensure include/exclude paths are correct

## Troubleshooting Steps

1. **Clean and Reinstall**:
   \`\`\`bash
   rm -rf node_modules package-lock.json
   npm install
   \`\`\`

2. **Check TypeScript Version**:
   \`\`\`bash
   npx tsc --version
   \`\`\`

3. **Validate Configuration**:
   \`\`\`bash
   npx tsc --showConfig
   \`\`\`

4. **Manual Compilation**:
   \`\`\`bash
   npx tsc --noEmit --skipLibCheck --listFiles
   \`\`\`

## Error Files

EOF
    
    # Add links to error files
    for file in "$REPORTS_DIR"/tsc-output-attempt-*.txt; do
        if [[ -f "$file" ]]; then
            echo "- \`$(basename "$file")\`" >> "$report_file"
        fi
    done
    
    echo "" >> "$report_file"
    echo "## Next Steps" >> "$report_file"
    echo "" >> "$report_file"
    echo "1. Review the error files above for specific issues" >> "$report_file"
    echo "2. Fix the most common errors first" >> "$report_file"
    echo "3. Run the compilation check again" >> "$report_file"
    echo "4. Consider updating dependencies if issues persist" >> "$report_file"
    
    print_warning "Failure report generated: $report_file"
}

# Function to generate success report
generate_success_report() {
    print_status "Generating TypeScript compilation success report..."
    
    local report_file="$REPORTS_DIR/typescript-success-report.md"
    local compilation_result="$REPORTS_DIR/compilation-result.json"
    
    cat > "$report_file" << EOF
# TypeScript Compilation Success Report

**Generated:** $(date)
**Build ID:** ${BUILD_ID:-N/A}
**Status:** ✅ Success

## Compilation Summary

EOF
    
    if [[ -f "$compilation_result" ]] && command -v jq >/dev/null 2>&1; then
        local attempt=$(jq -r '.attempt' "$compilation_result")
        local duration=$(jq -r '.duration' "$compilation_result")
        
        cat >> "$report_file" << EOF
- **Successful Attempt:** $attempt
- **Duration:** ${duration}s
- **Timeout:** ${TYPESCRIPT_TIMEOUT}s
- **Max Retries:** $MAX_RETRIES

EOF
    fi
    
    # Add file statistics
    local ts_files=$(find . -name "*.ts" -not -path "./node_modules/*" -not -path "./cdk.out/*" | wc -l)
    local tsx_files=$(find . -name "*.tsx" -not -path "./node_modules/*" -not -path "./cdk.out/*" | wc -l)
    
    cat >> "$report_file" << EOF
## File Statistics

- **TypeScript Files:** $ts_files
- **TSX Files:** $tsx_files
- **Total Files Checked:** $((ts_files + tsx_files))

## Performance Optimizations Applied

1. **Memory Optimization**: Node.js heap size increased to 4GB
2. **Skip Library Check**: Enabled \`--skipLibCheck\` for faster compilation
3. **No Emit**: Used \`--noEmit\` for type checking only
4. **Timeout Protection**: ${TYPESCRIPT_TIMEOUT}s timeout to prevent hanging
5. **Retry Logic**: Up to $MAX_RETRIES attempts with cache clearing

## Recommendations

- Keep TypeScript and dependencies up to date
- Regular type checking in development workflow
- Use incremental compilation for faster builds
- Monitor compilation performance metrics

EOF
    
    print_success "Success report generated: $report_file"
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    # Pre-check validation
    check_typescript_installation || exit 1
    validate_tsconfig || exit 1
    analyze_typescript_files
    
    # Run TypeScript compilation check
    if run_typescript_check; then
        generate_success_report
        
        local end_time=$(date +%s)
        local total_time=$((end_time - start_time))
        
        print_header "TypeScript Check Complete"
        print_success "Total execution time: ${total_time}s"
        print_success "All TypeScript files compiled successfully"
        print_success "Reports available in: $REPORTS_DIR/"
        
        # Log success
        echo "{\"event\":\"typescript_check_success\",\"timestamp\":$(date +%s),\"duration\":$total_time,\"build_id\":\"${BUILD_ID:-N/A}\"}" >> logs/build-events.jsonl 2>/dev/null || true
        
        exit 0
    else
        local end_time=$(date +%s)
        local total_time=$((end_time - start_time))
        
        print_header "TypeScript Check Failed"
        print_error "Total execution time: ${total_time}s"
        print_error "TypeScript compilation errors detected"
        print_error "Check reports in: $REPORTS_DIR/"
        
        # Log failure
        echo "{\"event\":\"typescript_check_failed\",\"timestamp\":$(date +%s),\"duration\":$total_time,\"build_id\":\"${BUILD_ID:-N/A}\"}" >> logs/build-events.jsonl 2>/dev/null || true
        
        exit 1
    fi
}

# Execute main function
main "$@"
