# Detect OS
ifeq ($(OS),Windows_NT)
    DETECTED_OS := Windows
    RM_CMD := cmd /C rmdir /S /Q
    MKDIR_CMD := cmd /C mkdir
    CP_CMD := cmd /C copy
    PATH_SEP := \\
    fixpath = $(subst /,\,$1)
else
    DETECTED_OS := $(shell uname -s)
    RM_CMD := rm -rf
    MKDIR_CMD := mkdir -p
    CP_CMD := cp -r
    PATH_SEP := /
    fixpath = $1
endif

# Variables
DIR := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
BUILD_DIR := $(DIR)/build
PUBLIC_DIR := $(DIR)/public
ASSETS_DIR := $(DIR)/assets
NODE_MODULES := $(DIR)/node_modules
HTACCESS := $(BUILD_DIR)/.htaccess

# Default target
all: build

# Install dependencies
install:
	npm install

# Development server
dev:
	@echo "Setting up development assets..."
ifeq ($(OS),Windows_NT)
	-$(MKDIR_CMD) $(call fixpath,$(PUBLIC_DIR)/static/imgs) 2>NUL
	-$(CP_CMD) $(call fixpath,$(ASSETS_DIR)/ibp.png) $(call fixpath,$(PUBLIC_DIR)/static/imgs/) 2>NUL
	-$(CP_CMD) $(call fixpath,$(ASSETS_DIR)/ibp.gif) $(call fixpath,$(PUBLIC_DIR)/static/imgs/) 2>NUL
else
	-$(MKDIR_CMD) $(PUBLIC_DIR)/static/imgs
	-$(CP_CMD) $(ASSETS_DIR)/ibp.png $(PUBLIC_DIR)/static/imgs/ 2>/dev/null || true
	-$(CP_CMD) $(ASSETS_DIR)/ibp.gif $(PUBLIC_DIR)/static/imgs/ 2>/dev/null || true
endif
	npm start

# Production build
build: clean
	@echo "Building production dashboard..."
	npm run build
	@echo "Copying assets..."
ifeq ($(OS),Windows_NT)
	$(MKDIR_CMD) $(call fixpath,$(BUILD_DIR)/static/imgs)
	$(CP_CMD) $(call fixpath,$(ASSETS_DIR)/ibp.png) $(call fixpath,$(BUILD_DIR)/static/imgs/)
	$(CP_CMD) $(call fixpath,$(ASSETS_DIR)/ibp.gif) $(call fixpath,$(BUILD_DIR)/static/imgs/)
else
	$(MKDIR_CMD) $(BUILD_DIR)/static/imgs
	$(CP_CMD) $(ASSETS_DIR)/ibp.png $(BUILD_DIR)/static/imgs/
	$(CP_CMD) $(ASSETS_DIR)/ibp.gif $(BUILD_DIR)/static/imgs/
endif
	@echo "Creating .htaccess for React Router..."
ifeq ($(DETECTED_OS),Windows)
	@echo RewriteEngine On > $(call fixpath,$(HTACCESS))
	@echo RewriteBase / >> $(call fixpath,$(HTACCESS))
	@echo RewriteCond %%{REQUEST_FILENAME} !-f >> $(call fixpath,$(HTACCESS))
	@echo RewriteCond %%{REQUEST_FILENAME} !-d >> $(call fixpath,$(HTACCESS))
	@echo RewriteCond %%{REQUEST_URI} !^/api >> $(call fixpath,$(HTACCESS))
	@echo RewriteRule . /index.html [L] >> $(call fixpath,$(HTACCESS))
else
	@echo "RewriteEngine On" > $(HTACCESS)
	@echo "RewriteBase /" >> $(HTACCESS)
	@echo "RewriteCond %{REQUEST_FILENAME} !-f" >> $(HTACCESS)
	@echo "RewriteCond %{REQUEST_FILENAME} !-d" >> $(HTACCESS)
	@echo "RewriteCond %{REQUEST_URI} !^/api" >> $(HTACCESS)
	@echo "RewriteRule . /index.html [L]" >> $(HTACCESS)
endif
	@echo "Build complete! Dashboard available in $(BUILD_DIR)"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	-$(RM_CMD) $(call fixpath,$(BUILD_DIR))
	-$(RM_CMD) $(call fixpath,$(PUBLIC_DIR)/static/imgs)

# Clean everything including node_modules
clean-all: clean
	@echo "Removing node_modules..."
	-$(RM_CMD) $(call fixpath,$(NODE_MODULES))

# Run tests
test:
	npm test

# Run tests with coverage
test-coverage:
	npm test -- --coverage --watchAll=false

# Build and analyze bundle size
analyze:
	npm run build -- --stats
	npx webpack-bundle-analyzer build/static/js/*.js

# Lint code
lint:
	npm run lint

# Format code
format:
	npx prettier --write "src/**/*.{js,jsx,ts,tsx,css,json}"

# Deploy to production (customize as needed)
deploy: build
	@echo "Deploy the contents of $(BUILD_DIR) to your web server"
	@echo "Don't forget to configure your web server for React Router!"

# Help
help:
	@echo "Available targets:"
	@echo "  make install       - Install npm dependencies"
	@echo "  make dev          - Start development server"
	@echo "  make build        - Create production build"
	@echo "  make test         - Run tests"
	@echo "  make test-coverage - Run tests with coverage"
	@echo "  make lint         - Lint the code"
	@echo "  make format       - Format code with Prettier"
	@echo "  make analyze      - Analyze bundle size"
	@echo "  make clean        - Remove build artifacts"
	@echo "  make clean-all    - Remove build artifacts and node_modules"
	@echo "  make deploy       - Build and show deploy instructions"
	@echo "  make help         - Show this help message"

.PHONY: all install dev build clean clean-all test test-coverage lint format analyze deploy help