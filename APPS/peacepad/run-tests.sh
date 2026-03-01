#!/bin/bash

# PeacePad E2E Test Runner
# Usage: ./run-tests.sh [test-suite]
# Examples:
#   ./run-tests.sh           # Run all tests
#   ./run-tests.sh p0        # Run P0 critical tests
#   ./run-tests.sh p1        # Run P1 important tests
#   ./run-tests.sh p2        # Run P2 nice-to-have tests
#   ./run-tests.sh nf        # Run non-functional tests
#   ./run-tests.sh ui        # Run in UI mode

case "$1" in
  p0)
    echo "Running P0 Critical Tests..."
    npx playwright test e2e/p0-*.spec.ts
    ;;
  p1)
    echo "Running P1 Important Tests..."
    npx playwright test e2e/p1-*.spec.ts
    ;;
  p2)
    echo "Running P2 Nice-to-Have Tests..."
    npx playwright test e2e/p2-*.spec.ts
    ;;
  nf)
    echo "Running Non-Functional Tests..."
    npx playwright test e2e/non-functional.spec.ts
    ;;
  ui)
    echo "Running Tests in UI Mode..."
    npx playwright test --ui
    ;;
  headed)
    echo "Running Tests in Headed Mode..."
    npx playwright test --headed
    ;;
  debug)
    echo "Running Tests in Debug Mode..."
    npx playwright test --debug
    ;;
  report)
    echo "Opening Test Report..."
    npx playwright show-report
    ;;
  *)
    echo "Running All E2E Tests..."
    npx playwright test
    ;;
esac
