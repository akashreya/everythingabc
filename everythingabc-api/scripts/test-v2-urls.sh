#!/bin/bash

# V2 API URL Validation Testing Script (Bash Version)
#
# This script performs basic regression testing by testing key V2 API endpoints
# Usage: ./scripts/test-v2-urls.sh [base-url]
# Example: ./scripts/test-v2-urls.sh http://localhost:3003

set -e

# Configuration
BASE_URL=${1:-"http://localhost:3003"}
API_BASE="$BASE_URL/api/v2"
TEMP_DIR=$(mktemp -d)
PASS_COUNT=0
FAIL_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${BLUE}🚀 V2 API URL Validation Testing (Bash)${NC}"
echo -e "${CYAN}📡 Base URL: $BASE_URL${NC}"
echo -e "${CYAN}🔗 API Base: $API_BASE${NC}"
echo ""

# Function to test a URL
test_url() {
    local url="$1"
    local description="$2"
    local temp_file="$TEMP_DIR/response_$(echo "$url" | sed 's/[^a-zA-Z0-9]/_/g').json"

    echo -e "  Testing: ${url}"

    # Test the URL with curl
    local start_time=$(date +%s%3N)
    if curl -s -f -m 10 -H "Accept: application/json" "$url" > "$temp_file" 2>/dev/null; then
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" "$url")

        echo -e "    ${GREEN}✅ $status_code (${duration}ms)${NC}"
        ((PASS_COUNT++))

        # Extract URLs from the response for basic validation
        if command -v jq >/dev/null 2>&1; then
            # If jq is available, extract URLs more precisely
            local extracted_urls=$(jq -r '.. | strings | select(startswith("http"))' "$temp_file" 2>/dev/null | head -5)
            if [[ -n "$extracted_urls" ]]; then
                echo -e "    ${CYAN}📎 Found URLs in response${NC}"
            fi
        fi

        return 0
    else
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" "$url" 2>/dev/null || echo "000")
        echo -e "    ${RED}❌ Failed (HTTP $status_code)${NC}"
        ((FAIL_COUNT++))
        return 1
    fi
}

# Function to extract and test URLs from a JSON response
test_urls_in_response() {
    local response_file="$1"
    local max_urls="${2:-5}"

    if [[ ! -f "$response_file" ]]; then
        return 0
    fi

    if command -v jq >/dev/null 2>&1; then
        # Extract URLs from JSON response
        local urls=$(jq -r '.. | strings | select(startswith("http://") or startswith("https://"))' "$response_file" 2>/dev/null | head -$max_urls)

        while IFS= read -r url; do
            if [[ -n "$url" ]]; then
                test_url "$url" "Nested URL"
            fi
        done <<< "$urls"
    fi
}

echo -e "${BOLD}📂 Testing Categories List${NC}"
categories_file="$TEMP_DIR/categories.json"
if test_url "$API_BASE/categories/" "Categories List"; then
    cp "$TEMP_DIR/response_${API_BASE//[^a-zA-Z0-9]/_}_categories_.json" "$categories_file" 2>/dev/null || true
    test_urls_in_response "$categories_file" 3
fi
echo ""

echo -e "${BOLD}📋 Testing Individual Category${NC}"
if [[ -f "$categories_file" ]] && command -v jq >/dev/null 2>&1; then
    # Get first category ID
    first_category=$(jq -r '.results[0].id // empty' "$categories_file" 2>/dev/null)
    if [[ -n "$first_category" ]]; then
        category_file="$TEMP_DIR/category_$first_category.json"
        if test_url "$API_BASE/categories/$first_category/" "Category: $first_category"; then
            cp "$TEMP_DIR/response_"*"_categories_${first_category}_.json" "$category_file" 2>/dev/null || true
            test_urls_in_response "$category_file" 5
        fi
    fi
fi
echo ""

echo -e "${BOLD}🔍 Testing Search Endpoints${NC}"
search_urls=(
    "$API_BASE/search/?q=cat&limit=3"
    "$API_BASE/search/?q=animal&type=categories,items&limit=2"
    "$API_BASE/search/suggestions/?q=fr&limit=3"
    "$API_BASE/search/filters/"
    "$API_BASE/search/popular/"
)

for search_url in "${search_urls[@]}"; do
    if test_url "$search_url" "Search endpoint"; then
        # Test a few URLs from the search response
        search_file="$TEMP_DIR/response_$(echo "$search_url" | sed 's/[^a-zA-Z0-9]/_/g').json"
        test_urls_in_response "$search_file" 2
    fi
done
echo ""

echo -e "${BOLD}📝 Testing Items Endpoints${NC}"
if [[ -f "$categories_file" ]] && command -v jq >/dev/null 2>&1; then
    first_category=$(jq -r '.results[0].id // empty' "$categories_file" 2>/dev/null)
    if [[ -n "$first_category" ]]; then
        items_urls=(
            "$API_BASE/categories/$first_category/items/?limit=3"
            "$API_BASE/categories/$first_category/items/?format=grouped"
        )

        for items_url in "${items_urls[@]}"; do
            if test_url "$items_url" "Items endpoint"; then
                items_file="$TEMP_DIR/response_$(echo "$items_url" | sed 's/[^a-zA-Z0-9]/_/g').json"
                test_urls_in_response "$items_file" 3
            fi
        done
    fi
fi
echo ""

# Summary Report
TOTAL_COUNT=$((PASS_COUNT + FAIL_COUNT))
SUCCESS_RATE=$(( PASS_COUNT * 100 / TOTAL_COUNT ))

echo -e "${BOLD}${BLUE}📊 Test Results Summary${NC}"
echo "=================================================="
echo -e "${CYAN}🧪 URLs Tested: $TOTAL_COUNT${NC}"
echo -e "${GREEN}✅ Passed: $PASS_COUNT${NC}"
echo -e "${RED}❌ Failed: $FAIL_COUNT${NC}"
echo -e "${BOLD}📈 Success Rate: $SUCCESS_RATE%${NC}"
echo ""

if [[ $SUCCESS_RATE -eq 100 ]]; then
    echo -e "${GREEN}${BOLD}🎉 All URLs are working perfectly!${NC}"
    exit_code=0
elif [[ $SUCCESS_RATE -ge 90 ]]; then
    echo -e "${YELLOW}${BOLD}⚠️  Most URLs working, but some need attention${NC}"
    exit_code=1
else
    echo -e "${RED}${BOLD}🚨 Significant URL failures detected${NC}"
    exit_code=1
fi

# Cleanup
rm -rf "$TEMP_DIR"

exit $exit_code