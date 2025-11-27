# Claude Code Agent Reference

**Related:** [Overview](00-OVERVIEW.md) | [Roadmap](05-ROADMAP.md) | [Features](03-FEATURES.md)

---

## Overview

This guide shows you how to effectively use Claude Code agents to explore the ytgify codebase and plan implementations.

---

## Quick Start: First-Time Setup

**Before diving into implementation, leverage Claude Code's AI agents to understand the current codebase and plan your work:**

### Step 1: Explore the Current Application
```bash
# Get a high-level overview
@agent-Explore "medium: Analyze the overall application structure and tech stack"

# Understand the backend
@agent-Explore "medium: Show me all models, their associations, and database schema"
@agent-Explore "quick: Find all API controllers and their endpoints"

# Check frontend setup
@agent-Explore "quick: Find React components and frontend structure"
@agent-Explore "quick: Check if Turbo/Stimulus is configured"
```

### Step 2: Understand What's Already Built
```bash
# Review existing authentication
@agent-Explore "medium: Analyze the authentication system (Devise, JWT, sessions)"

# Check file upload setup
@agent-Explore "quick: Find ActiveStorage configuration and file upload handling"

# Review social features
@agent-Explore "quick: Check if Follow, Collection, Hashtag models exist"
```

### Step 3: Plan Your Implementation
```bash
# Decide on architecture
@agent-Plan "medium: Evaluate keeping React vs refactoring to Hotwire based on current code"

# Plan missing features
@agent-Plan "medium: Create implementation plan for social models (Follow, Collection, Hashtag)"
@agent-Plan "very thorough: Design feed algorithm implementation with caching"
@agent-Plan "very thorough: Plan remix editor with Canvas API and GIF.js"
```

### Step 4: Use the Documentation as Reference

The agents will help you:
- ✅ Understand how the current code maps to the architecture plan
- ✅ Identify gaps between current implementation and plan
- ✅ Generate step-by-step implementation guides
- ✅ Find existing patterns to follow
- ✅ Plan testing strategies

---

## Agent Types

Claude Code provides two specialized agents for different tasks:

### @agent-Explore: Code Discovery & Analysis

**Purpose:** Find and understand existing code, patterns, and implementations.

**Best used for:**
- ✅ Finding existing code patterns
- ✅ Understanding codebase structure
- ✅ Locating specific implementations
- ✅ Searching for similar features
- ✅ Identifying code organization conventions
- ✅ Discovering test patterns

**Example use cases:**
```bash
# Model structure
@agent-Explore "quick: Find the User model and show its structure"
@agent-Explore "medium: Show all models with their associations"

# Controller patterns
@agent-Explore "quick: Find all API controllers and their endpoints"
@agent-Explore "medium: Search for all Turbo Frame usage in views"

# Testing patterns
@agent-Explore "quick: Find test files for likes to understand testing pattern"
@agent-Explore "medium: Locate all model tests to understand the pattern"

# Configuration
@agent-Explore "quick: Is Sidekiq installed and configured?"
@agent-Explore "medium: Find existing Redis configuration"

# Performance analysis
@agent-Explore "medium: Find all database queries and check for N+1 issues"
@agent-Explore "medium: Search for missing indexes on frequently queried columns"

# Security review
@agent-Explore "medium: Search for all user input handling to check sanitization"
@agent-Explore "medium: Find file upload validation code"
```

### @agent-Plan: Feature Design & Implementation Planning

**Purpose:** Design new features, plan implementations, and create roadmaps.

**Best used for:**
- ✅ Designing new feature architecture
- ✅ Breaking down complex tasks
- ✅ Creating implementation roadmaps
- ✅ Planning refactoring approaches
- ✅ Designing API endpoints
- ✅ Planning test strategies

**Example use cases:**
```bash
# Feature planning
@agent-Plan "medium: Design Follow model with counter caches"
@agent-Plan "medium: Create implementation plan for hashtags system"

# Complex features
@agent-Plan "very thorough: Create comprehensive remix editor implementation plan"
@agent-Plan "very thorough: Design feed algorithm with trending and caching"

# Testing strategies
@agent-Plan "quick: Create test plan for Like functionality"
@agent-Plan "medium: Design system test scenarios for remix flow"

# Performance optimization
@agent-Plan "medium: Create caching strategy for trending GIFs using Redis"
@agent-Plan "medium: Plan database query optimizations for feed algorithm"

# Security planning
@agent-Plan "medium: Design rate limiting strategy for all public endpoints"
@agent-Plan "medium: Create security checklist based on OWASP top 10"

# Migration planning
@agent-Plan "quick: Plan migration to add hashtags table"
@agent-Plan "medium: Create migration plan from React to ViewComponents"
```

---

## Thoroughness Levels

Each agent accepts a thoroughness parameter that controls the depth of analysis:

### "quick" - Fast Exploration
**When to use:**
- Simple file location lookups (1-2 files)
- Checking if a gem/library is installed
- Finding a specific model or controller
- Quick pattern checks

**Example:**
```bash
@agent-Explore "quick: Find the Gif model location"
@agent-Explore "quick: Is PgSearch configured?"
@agent-Plan "quick: Plan migration to add like_count column"
```

**Time:** ~1-2 minutes

### "medium" - Standard Analysis (Default)
**When to use:**
- Feature exploration across multiple files
- Understanding system architecture
- Planning standard features
- Code organization analysis
- Most day-to-day development tasks

**Example:**
```bash
@agent-Explore "medium: Show all controllers and their endpoints"
@agent-Explore "medium: Analyze the authentication system"
@agent-Plan "medium: Design collections feature with associations"
@agent-Plan "medium: Create implementation plan for trending algorithm"
```

**Time:** ~3-5 minutes

### "very thorough" - Deep Analysis
**When to use:**
- Complex architectural decisions
- Major refactoring planning
- Security audits
- Performance optimization across entire system
- Understanding complex feature interactions

**Example:**
```bash
@agent-Explore "very thorough: Analyze the entire authentication and authorization system"
@agent-Explore "very thorough: Find all GIF processing code and dependencies"
@agent-Plan "very thorough: Design comprehensive remix editor with Canvas API"
@agent-Plan "very thorough: Create complete performance optimization roadmap"
```

**Time:** ~5-10 minutes

---

## Usage Patterns

### Pattern 1: Feature Development Workflow

**Step 1: Explore existing patterns**
```bash
@agent-Explore "medium: Find similar model implementations to understand the pattern"
@agent-Explore "quick: Find all existing associations on the User model"
```

**Step 2: Plan implementation**
```bash
@agent-Plan "medium: Design Follow model following existing patterns"
@agent-Plan "quick: Plan the database migration for follows table"
```

**Step 3: Implement based on agent guidance**
(Use the insights from the agents to write your code)

**Step 4: Plan testing**
```bash
@agent-Explore "quick: Find model test examples with associations"
@agent-Plan "quick: Create test plan for Follow model"
```

### Pattern 2: Bug Investigation

**Step 1: Locate relevant code**
```bash
@agent-Explore "medium: Search for code related to [bug description]"
@agent-Explore "quick: Find test files covering this functionality"
```

**Step 2: Analyze the issue**
```bash
@agent-Explore "medium: Show all code paths that could affect [feature]"
```

**Step 3: Plan the fix**
```bash
@agent-Plan "quick: Create debugging strategy and fix approach"
@agent-Plan "quick: Plan regression test to prevent future occurrences"
```

### Pattern 3: Performance Optimization

**Step 1: Identify bottlenecks**
```bash
@agent-Explore "medium: Find all database queries in controllers"
@agent-Explore "medium: Search for N+1 query issues"
@agent-Explore "medium: Locate caching implementations to identify gaps"
```

**Step 2: Plan optimizations**
```bash
@agent-Plan "medium: Create caching strategy for frequently accessed data"
@agent-Plan "medium: Plan database query optimizations with specific indexes"
```

### Pattern 4: Security Audit

**Step 1: Discover vulnerabilities**
```bash
@agent-Explore "medium: Search for all user input handling"
@agent-Explore "medium: Find authentication and authorization checks"
@agent-Explore "medium: Locate any direct SQL queries"
```

**Step 2: Plan remediation**
```bash
@agent-Plan "medium: Create security checklist and remediation plan"
@agent-Plan "medium: Design rate limiting strategy for all endpoints"
```

---

## Example Workflows by Feature Area

### Workflow: Adding Social Features (Follows, Collections, Hashtags)

#### Phase 1: Exploration
```bash
# Understand current structure
@agent-Explore "medium: Find all model files and their associations"
@agent-Explore "quick: Locate the Like model to understand many-to-many pattern"
@agent-Explore "quick: Find counter_cache implementations"
```

#### Phase 2: Planning
```bash
# Design each model
@agent-Plan "medium: Design Follow model with counter caches and associations"
@agent-Plan "medium: Design Collection model with join table pattern"
@agent-Plan "medium: Design Hashtag model with trending functionality"
```

#### Phase 3: Implementation
(Implement based on agent recommendations)

#### Phase 4: Testing
```bash
@agent-Explore "quick: Find model test examples to understand the pattern"
@agent-Plan "medium: Create comprehensive test plan for social features"
```

---

### Workflow: Building the Remix Editor

#### Phase 1: Deep Exploration
```bash
# Gather requirements
@agent-Explore "very thorough: Find all GIF processing code, file upload handling, and JavaScript libraries"
@agent-Explore "medium: Locate existing Stimulus controllers to understand the pattern"
@agent-Explore "quick: Find Vite Rails configuration for adding JavaScript libraries"
```

#### Phase 2: Comprehensive Planning
```bash
@agent-Plan "very thorough: Design comprehensive remix editor implementation with Canvas API, GIF.js integration, and S3 upload flow"
@agent-Plan "medium: Plan the user interface components for the editor"
@agent-Plan "medium: Create testing strategy for Canvas-based remix editor"
```

#### Phase 3: Implementation & Testing
(Implement the complex feature with ongoing agent assistance)

```bash
# During implementation
@agent-Explore "quick: How is ActiveStorage direct upload configured?"
@agent-Plan "quick: Design error handling for GIF generation failures"
```

---

### Workflow: Implementing Feed Algorithm

#### Phase 1: Exploration
```bash
@agent-Explore "medium: Find existing Gif model scopes and query patterns"
@agent-Explore "quick: Locate existing Sidekiq job patterns and Redis configuration"
@agent-Explore "medium: Find the Gif model and its engagement counter columns"
```

#### Phase 2: Algorithm Design
```bash
@agent-Plan "medium: Design trending score calculation job with Redis caching strategy"
@agent-Plan "medium: Create feed algorithm with trending, recent, and recommended GIFs"
@agent-Plan "quick: Plan monitoring strategy for feed performance"
```

#### Phase 3: Implementation
```bash
# During implementation
@agent-Explore "quick: Find existing Redis caching examples"
@agent-Plan "quick: Design fallback strategy if Redis is unavailable"
```

---

### Workflow: Performance Tuning

#### Phase 1: Identify Issues
```bash
@agent-Explore "medium: Find all database queries in controllers looking for N+1 issues"
@agent-Explore "medium: Search for missing indexes on frequently queried columns"
@agent-Explore "medium: Locate all caching implementations to identify gaps"
```

#### Phase 2: Plan Optimizations
```bash
@agent-Plan "medium: Create caching strategy for trending GIFs using Redis"
@agent-Plan "medium: Plan database query optimizations for feed algorithm"
@agent-Plan "medium: Design CDN integration for static assets"
```

#### Phase 3: Validate
```bash
@agent-Plan "quick: Create performance benchmarking plan for changes"
```

---

### Workflow: Security Hardening

#### Phase 1: Audit Current State
```bash
@agent-Explore "medium: Search for all user input handling to check sanitization"
@agent-Explore "medium: Find file upload validation code"
@agent-Explore "medium: Locate authentication and authorization checks"
@agent-Explore "medium: Search for any direct SQL queries that might be vulnerable"
```

#### Phase 2: Plan Improvements
```bash
@agent-Plan "medium: Create security checklist based on OWASP top 10"
@agent-Plan "medium: Plan rate limiting strategy for all public endpoints"
@agent-Plan "medium: Design content security policy headers"
```

---

## Quick Reference Card

**Copy-paste these commands as needed throughout development:**

### Initial Codebase Exploration
```bash
@agent-Explore "medium: Analyze overall application structure and current tech stack"
@agent-Explore "medium: Show all models, associations, and database schema"
@agent-Explore "quick: Find all API endpoints and controllers"
```

### Before Building New Features
```bash
# Find existing patterns
@agent-Explore "quick: Find [Model/Controller/Job] to understand the pattern"

# Plan implementation
@agent-Plan "medium: Design [Feature Name] following existing codebase patterns"
```

### For Complex Features (Remix Editor, Feed, Real-time)
```bash
@agent-Explore "very thorough: Find all code related to [feature area]"
@agent-Plan "very thorough: Create comprehensive implementation plan for [feature]"
```

### Performance & Security
```bash
@agent-Explore "medium: Find all database queries and check for N+1 issues"
@agent-Explore "medium: Search for security vulnerabilities in user input handling"
@agent-Plan "medium: Create performance optimization roadmap"
```

### Testing & Debugging
```bash
@agent-Explore "quick: Find test files for [feature] to understand testing pattern"
@agent-Explore "medium: Search for code related to [bug description]"
@agent-Plan "quick: Create test plan for [new feature]"
```

### Quick Checks
```bash
@agent-Explore "quick: Is [gem/library] installed and configured?"
@agent-Explore "quick: Find the [specific file/class] location"
@agent-Explore "quick: Show me how [existing feature] is implemented"
```

---

## Best Practices

### Choosing the Right Agent

**Use @agent-Explore when you need to:**
- Understand what already exists
- Find code locations
- Analyze existing patterns
- Review code structure
- Discover testing approaches

**Use @agent-Plan when you need to:**
- Design something new
- Create implementation steps
- Plan architectural changes
- Strategize refactoring
- Design testing approaches

### Choosing the Right Thoroughness

**Quick (1-2 minutes):**
- Single file lookups
- Simple yes/no questions
- Configuration checks
- Pattern confirmation

**Medium (3-5 minutes) - DEFAULT:**
- Feature exploration
- Implementation planning
- Standard development tasks
- Most day-to-day work

**Very Thorough (5-10 minutes):**
- Complex architectural decisions
- Major refactoring planning
- Complete system analysis
- Critical feature design

### Writing Effective Prompts

**Good prompts are:**
- ✅ Specific about what you need
- ✅ Include context when necessary
- ✅ Mention specific files/models if known
- ✅ Clear about the goal

**Examples:**

**Bad:**
```bash
@agent-Explore "find stuff about users"
```

**Good:**
```bash
@agent-Explore "quick: Find the User model and show its associations"
```

**Bad:**
```bash
@agent-Plan "make a follow feature"
```

**Good:**
```bash
@agent-Plan "medium: Design Follow model with counter caches following existing Like model pattern"
```

---

## Pro Tip

Throughout the documentation, look for 🤖 icons indicating feature-specific agent prompts. Use these to get targeted help for specific implementations.

---

**Remember:** Agents are your AI pair programmers. Use them early and often to understand the codebase, plan features, and avoid mistakes!
