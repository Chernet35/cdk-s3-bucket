#!/bin/bash
set -euo pipefail

# Highly Optimized Dependency Installation
# Maximum performance with intelligent caching and error recovery

source "$(dirname "$0")/setup-build-env.sh" 2>/dev/null || {
    echo "Warning: Could not source setup-build-env.sh"
}

print_header "Highly Optimized Dependency Installation"
monitor_performance "install_deps_start"

# Configuration
INSTALL_TIMEOUT=300
MAX_RETRIES=3
CACHE_STRATEGY="${CACHE_STRATEGY:-aggressive}"

print_status "Installation Configuration:"
print_status "  Timeout: ${INSTALL_TIMEOUT}s"
print_status "  Max Retries: $MAX_RETRIES"
print_status "  Cache Strategy: $CACHE_STRATEGY"

# Enhanced dependency validation
validate_package_files() {
    print_status "Validating package files..."
    
    if [[ ! -f "package.json" ]]; then
        print_error "package.json not found"
        return 1
    fi
    
    # Validate package.json syntax
    if command -v jq >/dev/null 2>&1; then
        if ! jq empty package.json 2>/dev/null; then
            print_error "package.json has invalid JSON syntax"
            return 1
        fi
    else
        # Basic JSON validation without jq
        if ! node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" 2>/dev/null; then
            print_error "package.json has invalid JSON syntax"
            return 1
        fi
    fi
    
    print_success "Package files validated"
    return 0
}

# Intelligent cache management
manage_cache() {
    print_status "Managing dependency cache..."
    
    # Check cache size and clean if necessary
    local cache_size=$(du -sm cache/npm 2>/dev/null | cut -f1 || echo "0")
    local max_cache_size=2048  # 2GB limit
    
    if [[ $cache_size -gt $max_cache_size ]]; then
        print_warning "Cache size (${cache_size}MB) exceeds limit. Cleaning..."
        npm cache clean --force
        rm -rf cache/npm/*
        mkdir -p cache/npm
    fi
    
    # Verify cache integrity
    npm cache verify --silent || {
        print_warning "Cache verification failed. Rebuilding cache..."
        npm cache clean --force
    }
    
    print_success "Cache management completed"
}

# Optimized installation with retry logic
install_dependencies() {
    local attempt=1
    local install_success=false
    
    while [[ $attempt -le $MAX_RETRIES && "$install_success" == "false" ]]; do
        print_status "Installation attempt $attempt/$MAX_RETRIES"
        
        local start_time=$(date +%s)
        
        # Choose installation strategy based on files present
        if [[ -f "package-lock.json" && "$CACHE_STRATEGY" == "aggressive" ]]; then
            print_status "Using npm ci for reproducible install..."
            
            if timeout $INSTALL_TIMEOUT npm ci \
                --silent \
                --no-audit \
                --no-fund \
                --prefer-offline \
                --cache cache/npm; then
                install_success=true
            else
                print_warning "npm ci failed, trying npm install..."
                rm -f package-lock.json
            fi
        fi
        
        # Fallback to npm install
        if [[ "$install_success" == "false" ]]; then
            print_status "Using npm install..."
            
            if timeout $INSTALL_TIMEOUT npm install \
                --silent \
                --no-audit \
                --no-fund \
                --prefer-offline \
                --cache cache/npm \
                --legacy-peer-deps; then
                install_success=true
            else
                print_warning "npm install failed on attempt $attempt"
                
                # Clean up for retry
                if [[ $attempt -lt $MAX_RETRIES ]]; then
                    print_status "Cleaning up for retry..."
                    rm -rf node_modules package-lock.json
                    npm cache clean --force
                    sleep 5
                fi
            fi
        fi
        
        if [[ "$install_success" == "true" ]]; then
            local end_time=$(date +%s)
            local install_time=$((end_time - start_time))
            print_success "Dependencies installed in ${install_time}s"
            break
        fi
        
        ((attempt++))
    done
    
    if [[ "$install_success" == "false" ]]; then
        print_error "Failed to install dependencies after $MAX_RETRIES attempts"
        return 1
    fi
    
    return 0
}

# Validate critical dependencies
validate_dependencies() {
    print_status "Validating critical dependencies..."
    
    local critical_deps=(
        "aws-cdk-lib"
        "constructs"
        "typescript"
        "jest"
        "@types/jest"
        "@types/node"
        "eslint"
        "prettier"
    )
    
    local missing_deps=()
    
    for dep in "${critical_deps[@]}"; do
        if ! npm list "$dep" --depth=0 --silent 2>/dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_error "Missing critical dependencies: ${missing_deps[*]}"
        return 1
    fi
    
    print_success "All critical dependencies validated"
    return 0
}

# Install global dependencies if needed
install_global_dependencies() {
    print_status "Checking global dependencies..."
    
    local global_deps=(
        "aws-cdk@latest"
        "typescript@latest"
    )
    
    for dep in "${global_deps[@]}"; do
        local pkg_name="${dep%%@*}"
        
        if ! npm list -g "$pkg_name" --depth=0 --silent 2>/dev/null; then
            print_status "Installing global dependency: $dep"
            npm install -g "$dep" --silent --no-audit --no-fund
        else
            print_status "Global dependency already installed: $pkg_name"
        fi
    done
    
    print_success "Global dependencies verified"
}

# Security audit with optimization
run_security_audit() {
    print_status "Running optimized security audit..."
    
    # Create audit report directory
    mkdir -p reports/security
    
    # Run audit with timeout
    if timeout 60 npm audit --audit-level=high --json > reports/security/npm-audit.json 2>/dev/null; then
        print_success "No high-severity vulnerabilities found"
    else
        local audit_exit_code=$?
        
        if [[ $audit_exit_code -eq 124 ]]; then
            print_warning "Security audit timed out"
        else
            print_warning "Security vulnerabilities detected. Check reports/security/npm-audit.json"
            
            # Generate human-readable summary
            if command -v jq >/dev/null 2>&1 && [[ -f "reports/security/npm-audit.json" ]]; then
                local high_vulns=$(jq '.metadata.vulnerabilities.high // 0' reports/security/npm-audit.json)
                local critical_vulns=$(jq '.metadata.vulnerabilities.critical // 0' reports/security/npm-audit.json)
                
                if [[ $critical_vulns -gt 0 ]]; then
                    print_warning "Critical vulnerabilities: $critical_vulns"
                fi
                
                if [[ $high_vulns -gt 0 ]]; then
                    print_warning "High-severity vulnerabilities: $high_vulns"
                fi
            fi
        fi
    fi
}

# Generate dependency report
generate_dependency_report() {
    print_status "Generating dependency report..."
    
    local report_file="reports/build/dependency-report.md"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
# Dependency Installation Report

**Generated:** $(date)
**Build ID:** ${BUILD_ID:-N/A}
**Node.js:** $(node --version)
**npm:** $(npm --version)

## Installation Summary

EOF
    
    # Add package counts
    if [[ -f "package.json" ]] && command -v jq >/dev/null 2>&1; then
        local prod_deps=$(jq '.dependencies | length' package.json 2>/dev/null || echo "0")
        local dev_deps=$(jq '.devDependencies | length' package.json 2>/dev/null || echo "0")
        local total_installed=$(npm list --depth=0 --json 2>/dev/null | jq '.dependencies | length' || echo "0")
        
        cat >> "$report_file" << EOF
- **Production Dependencies:** $prod_deps
- **Development Dependencies:** $dev_deps
- **Total Installed:** $total_installed

EOF
    fi
    
    # Add size information
    if [[ -d "node_modules" ]]; then
        local node_modules_size=$(du -sh node_modules 2>/dev/null | cut -f1 || echo "N/A")
        local cache_size=$(du -sh cache/npm 2>/dev/null | cut -f1 || echo "N/A")
        
        cat >> "$report_file" << EOF
## Size Information

- **node_modules:** $node_modules_size
- **npm cache:** $cache_size

EOF
    fi
    
    cat >> "$report_file" << 'EOF'
## Performance Optimizations Applied

1. **Intelligent Caching:** npm cache configured for offline-first installation
2. **Retry Logic:** Automatic retry with cleanup on failure
3. **Timeout Protection:** Installation timeout to prevent hanging
4. **Cache Management:** Automatic cache size management and verification
5. **Parallel Downloads:** Optimized concurrent download settings

## Recommendations

- Keep package-lock.json committed for reproducible builds
- Regular dependency updates for security patches
- Monitor bundle size impact of new dependencies
- Use npm ci in CI/CD for faster, reliable installs

EOF
    
    print_success "Dependency report generated: $report_file"
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    # Validation phase
    validate_package_files || exit 1
    
    # Cache management
    manage_cache
    
    # Installation phase
    install_dependencies || exit 1
    
    # Validation phase
    validate_dependencies || exit 1
    
    # Global dependencies
    install_global_dependencies
    
    # Security audit
    run_security_audit
    
    # Reporting
    generate_dependency_report
    
    # Performance summary
    local end_time=$(date +%s)
    local total_time=$((end_time - start_time))
    
    print_header "Installation Summary"
    print_success "Total installation time: ${total_time}s"
    print_success "Total packages: $(npm list --depth=0 --json 2>/dev/null | jq '.dependencies | length' || echo 'N/A')"
    print_success "node_modules size: $(du -sh node_modules 2>/dev/null | cut -f1 || echo 'N/A')"
    print_success "Cache size: $(du -sh cache/npm 2>/dev/null | cut -f1 || echo 'N/A')"
    
    # Log completion
    monitor_performance "install_deps_complete"
    echo "{\"event\":\"deps_installed\",\"timestamp\":$(date +%s),\"install_time\":$total_time,\"build_id\":\"$BUILD_ID\"}" >> logs/build-events.jsonl
    
    print_success "Dependencies installed and optimized successfully!"
}

# Execute main function
main "$@"
