# YTGify Firefox Extension - Makefile
# ====================================

.PHONY: help install clean build dev test lint format typecheck validate all

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

#-------------------------------------------------------------------------------
# Help
#-------------------------------------------------------------------------------

help: ## Show this help message
	@echo "$(CYAN)YTGify Firefox Extension$(RESET)"
	@echo "========================="
	@echo ""
	@echo "$(GREEN)Available targets:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'

#-------------------------------------------------------------------------------
# Setup
#-------------------------------------------------------------------------------

install: ## Install dependencies
	npm install

install-dev: ## Install dependencies (development mode)
	NODE_ENV=development npm install

#-------------------------------------------------------------------------------
# Build
#-------------------------------------------------------------------------------

build: ## Build for production (uses production API)
	npm run build

build-local: ## Build for local development (uses localhost:3000)
	npm run build:local

build-production: ## Build for production release
	npm run build:production

dev: ## Start development mode with Firefox auto-launch
	npm run dev

dev-local: ## Start development mode with local API + Firefox
	npm run dev:local

clean: ## Clean build artifacts
	npm run clean

package: ## Package extension for distribution
	npm run package

#-------------------------------------------------------------------------------
# Testing
#-------------------------------------------------------------------------------

test: ## Run unit tests
	npm test

test-watch: ## Run unit tests in watch mode
	npm run test:watch

test-coverage: ## Run unit tests with coverage
	npm run test:coverage

test-e2e: ## Run E2E tests (Selenium)
	npm run test:e2e

test-e2e-headed: ## Run E2E tests (visible browser)
	npm run test:e2e:headed

test-integration: ## Run backend integration tests
	npm run test:integration

test-all: ## Run all tests (unit + E2E)
	npm run test:all

#-------------------------------------------------------------------------------
# Code Quality
#-------------------------------------------------------------------------------

lint: ## Run web-ext lint on built extension
	npm run lint

lint-code: ## Run ESLint on source code
	npm run lint:code

lint-fix: ## Run ESLint with auto-fix
	npm run lint:fix

format: ## Format code with Prettier
	npm run format

format-check: ## Check code formatting
	npm run format:check

typecheck: ## Run TypeScript type checking
	npm run typecheck

knip: ## Check for unused code/dependencies
	npm run knip

#-------------------------------------------------------------------------------
# Validation
#-------------------------------------------------------------------------------

validate: typecheck lint-code test ## Run typecheck, lint, and tests
	@echo "$(GREEN)All validations passed!$(RESET)"

validate-full: typecheck lint-code knip test test-e2e ## Full validation including E2E
	@echo "$(GREEN)Full validation passed!$(RESET)"

#-------------------------------------------------------------------------------
# Utilities
#-------------------------------------------------------------------------------

generate-test-videos: ## Generate test videos for E2E tests
	npm run generate:test-videos

#-------------------------------------------------------------------------------
# Composite Commands
#-------------------------------------------------------------------------------

all: clean install build test ## Clean, install, build, and test

ci: install build lint-code typecheck test ## CI pipeline
	@echo "$(GREEN)CI pipeline passed!$(RESET)"

local-setup: install-dev build-local ## Setup for local development
	@echo "$(GREEN)Local development setup complete!$(RESET)"
	@echo "$(YELLOW)Run 'make dev-local' to start Firefox with the extension$(RESET)"
