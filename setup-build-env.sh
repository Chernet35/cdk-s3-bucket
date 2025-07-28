#!/bin/bash
set -euo pipefail

# Highly Optimized Build Environment Setup
# Enterprise-grade setup with maximum performance optimizations

# Performance monitoring
BUILD_START_TIME=$(date +%s)
export BUILD_ID="${GITHUB_RUN_ID:-$(date +%s)}"

# Color codes for enhanced output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Enhanced logging functions
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1" >&2
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

print_header() {
    echo -e "${BLUE}━━━ $1 ━━━${NC}" >&2
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}" >&2
}

# Performance monitoring function
monitor_performance() {
    local step_name="$1"
    local timestamp=$(date +%s)
    local duration=$((timestamp - BUILD_START_TIME))
    
    mkdir -p logs
    echo "{\"step\":\"$step_name\",\"timestamp\":$timestamp,\"duration\":$duration,\"build_id\":\"$BUILD_ID\"}" >> logs/performance.jsonl
}

print_header "Initializing Highly Optimized Build Environment"

# System optimization
print_status "Optimizing system configuration..."
ulimit -n 65536 2>/dev/null || print_warning "Could not increase file descriptor limit"

# Environment variables for maximum performance
export NODE_OPTIONS="--max-old-space-size=8192 --max-semi-space-size=256"
export NPM_CONFIG_PROGRESS=false
export NPM_CONFIG_AUDIT=false
export NPM_CONFIG_FUND=false
export NPM_CONFIG_UPDATE_NOTIFIER=false
export CI=true
export FORCE_COLOR=1

# Create optimized directory structure
print_status "Creating optimized directory structure..."
mkdir -p {logs,reports/{build,performance,quality},cache/{npm,typescript,jest,build},artifacts/{build,reports,coverage}}

# Node.js environment validation
print_header "Node.js Environment Validation"
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_success "Node.js: $NODE_VERSION"
    
    # Validate Node.js version (require 18+)
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')
    if [[ $NODE_MAJOR -lt 18 ]]; then
        print_error "Node.js 18+ required. Current: $NODE_VERSION"
        exit 1
    fi
else
    print_error "Node.js not found. Please install Node.js 18+"
    exit 1
fi

# npm optimization
print_header "npm Configuration Optimization"
npm config set registry https://registry.npmjs.org/
npm config set cache ./cache/npm
npm config set tmp ./cache/tmp
npm config set progress false
npm config set audit false
npm config set fund false
npm config set update-notifier false
npm config set maxsockets 50
npm config set fetch-retries 5
npm config set fetch-retry-factor 2
npm config set fetch-retry-mintimeout 10000
npm config set fetch-retry-maxtimeout 60000

print_success "npm optimized for maximum performance"

# AWS CLI validation (if needed)
if command -v aws >/dev/null 2>&1; then
    AWS_VERSION=$(aws --version 2>&1 | head -n1)
    print_success "AWS CLI: $AWS_VERSION"
    
    # AWS CLI optimization
    aws configure set max_concurrent_requests 20
    aws configure set max_queue_size 10000
    aws configure set region "${AWS_REGION:-us-east-1}"
else
    print_warning "AWS CLI not found. CDK deployments may require AWS CLI."
fi

# TypeScript environment
print_header "TypeScript Environment Setup"
if command -v tsc >/dev/null 2>&1; then
    TSC_VERSION=$(tsc --version)
    print_success "TypeScript: $TSC_VERSION"
else
    print_status "TypeScript will be installed with dependencies"
fi

# Create performance monitoring functions
cat > cache/build/performance-utils.sh << 'EOF'
#!/bin/bash
# Performance utility functions

track_memory_usage() {
    local step_name="$1"
    local memory_mb=$(free -m | awk 'NR==2{printf "%.1f", $3}')
    echo "{\"step\":\"$step_name\",\"memory_mb\":$memory_mb,\"timestamp\":$(date +%s)}" >> logs/memory-usage.jsonl
}

track_disk_usage() {
    local step_name="$1"
    local disk_usage=$(df -h . | awk 'NR==2{print $5}' | sed 's/%//')
    echo "{\"step\":\"$step_name\",\"disk_usage_percent\":$disk_usage,\"timestamp\":$(date +%s)}" >> logs/disk-usage.jsonl
}

optimize_node_memory() {
    local available_memory=$(free -m | awk 'NR==2{print $7}')
    local optimal_heap=$((available_memory * 60 / 100))
    
    if [[ $optimal_heap -gt 8192 ]]; then
        optimal_heap=8192
    elif [[ $optimal_heap -lt 2048 ]]; then
        optimal_heap=2048
    fi
    
    export NODE_OPTIONS="--max-old-space-size=$optimal_heap --max-semi-space-size=$((optimal_heap / 32))"
    echo "Optimized Node.js heap size: ${optimal_heap}MB"
}
EOF

chmod +x cache/build/performance-utils.sh
source cache/build/performance-utils.sh

# Optimize Node.js memory based on available system memory
optimize_node_memory

# Create cleanup function
cleanup_build_env() {
    print_header "Build Environment Cleanup"
    
    # Clean npm cache if it gets too large
    local cache_size=$(du -sm cache/npm 2>/dev/null | cut -f1 || echo "0")
    if [[ $cache_size -gt 1024 ]]; then
        print_status "Cleaning large npm cache (${cache_size}MB)"
        npm cache clean --force 2>/dev/null || true
    fi
    
    # Clean temporary files
    rm -rf cache/tmp/* 2>/dev/null || true
    
    # Archive performance logs
    if [[ -d logs && -n "$(ls -A logs 2>/dev/null)" ]]; then
        tar -czf "artifacts/build-logs-$(date +%Y%m%d-%H%M%S).tar.gz" logs/ 2>/dev/null || true
    fi
    
    print_success "Build environment cleaned up"
}

# Set trap for cleanup
trap cleanup_build_env EXIT

# Export essential functions and variables
export -f print_status print_warning print_error print_header print_success monitor_performance
export BUILD_START_TIME BUILD_ID

# Final validation
print_header "Environment Validation"
VALIDATION_ERRORS=0

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
    print_error "Node.js validation failed"
    ((VALIDATION_ERRORS++))
fi

# Check npm
if ! command -v npm >/dev/null 2>&1; then
    print_error "npm validation failed"
    ((VALIDATION_ERRORS++))
fi

# Check directory structure
for dir in logs reports cache artifacts; do
    if [[ ! -d "$dir" ]]; then
        print_error "Directory validation failed: $dir"
        ((VALIDATION_ERRORS++))
    fi
done

if [[ $VALIDATION_ERRORS -gt 0 ]]; then
    print_error "Build environment validation failed with $VALIDATION_ERRORS errors"
    exit 1
fi

# Performance summary
SETUP_TIME=$(($(date +%s) - BUILD_START_TIME))
print_header "Build Environment Ready"
print_success "Setup completed in ${SETUP_TIME}s"
print_success "Node.js: $(node --version)"
print_success "npm: $(npm --version)"
print_success "Memory optimization: ${NODE_OPTIONS}"
print_success "Build ID: $BUILD_ID"

# Log setup completion
monitor_performance "setup_complete"
echo "{\"event\":\"setup_complete\",\"timestamp\":$(date +%s),\"setup_time\":$SETUP_TIME,\"build_id\":\"$BUILD_ID\"}" >> logs/build-events.jsonl

print_success "Build environment is highly optimized and ready!"
