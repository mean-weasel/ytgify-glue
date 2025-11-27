# Contributing to YTgify

Thank you for your interest in contributing to the YTgify Firefox Extension! This guide will help you get started with development and ensure your contributions meet our quality standards.

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 10.x or higher
- Firefox Developer Edition (recommended) or Firefox browser

### Setup

1. Fork and clone the repository:

```bash
git clone https://github.com/[your-username]/ytgify.git
cd ytgify
```

2. Install dependencies:

```bash
npm install
```

3. Start development mode:

```bash
npm run dev
```

4. Load the extension in Firefox:
   - Open `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select `dist/manifest.json`

Or use automatic loading:

```bash
npm run dev:firefox
```

## 📝 Development Workflow

### Available Scripts

- `npm run dev` - Start webpack in watch mode
- `npm run dev:firefox` - Build and open Firefox Developer Edition
- `npm run build` - Build production extension
- `npm run lint:code` - Run ESLint
- `npm run lint` - Validate extension with web-ext
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run validate` - Run full validation suite (typecheck, lint, unit tests)

### Testing Commands

**Selenium E2E Tests:**
- `npm run test:selenium:mock` - Mock E2E tests with localhost videos (CI-safe)
- `npm run test:selenium:mock:headed` - Mock E2E with visible browser
- `npm run test:selenium:real` - Real E2E tests against YouTube (required before PR)
- `npm run test:selenium:real:headed` - Real E2E with visible browser

**Why Local Testing?** Testing Firefox extensions that interact with YouTube videos cannot be reliably done in GitHub Actions due to:

- YouTube blocking CI server IPs
- Video playback requiring real browser environments
- Regional content and cookie consent variations
- Selenium WebDriver limitations in CI

### Code Style

We use ESLint and TypeScript for code quality. Before submitting a PR:

1. **Run linting**: `npm run lint:code`
2. **Fix linting issues**: `npm run lint:fix`
3. **Check types**: `npm run typecheck`

### Testing

All new features and bug fixes should include tests:

1. **Run tests**: `npm test`
2. **Coverage requirement**: Maintain at least 60% code coverage

Test files should be placed in `tests/unit/` following the same structure as `src/`.

## 🔄 Pull Request Process

### Before Creating a PR

1. **Create a feature branch**:

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** following our coding standards

3. **Run validation**:

```bash
npm run validate
npm run test:selenium:real
```

4. **Write meaningful commit messages**:
   - Use present tense ("Add feature" not "Added feature")
   - Keep first line under 50 characters
   - Reference issues and pull requests liberally

### Creating a PR

1. **Push your branch** to your fork
2. **Create a Pull Request** against the `main` branch
3. **Fill out the PR template** completely
4. **Wait for CI checks** to pass

### PR Requirements

All PRs must:

- ✅ Pass all CI checks (linting, tests, type checking, build)
- ✅ Maintain or improve code coverage (minimum 60%)
- ✅ Include tests for new functionality
- ✅ Update documentation if needed
- ✅ Have a clear description of changes
- ✅ Reference any related issues

## 🏗️ Architecture Guidelines

### Project Structure

```
src/
├── background/     # Firefox event page
├── content/        # Content scripts for YouTube
├── popup/          # Extension popup UI
├── lib/            # Shared libraries and utilities
├── types/          # TypeScript type definitions
└── components/     # React components
```

### Key Principles

1. **Firefox Manifest V3**: All code must be compatible with Firefox WebExtensions
2. **React Components**: Use functional components with hooks
3. **TypeScript**: Use proper typing, avoid `any`
4. **Message Passing**: Use typed messages for cross-component communication
5. **Error Handling**: Always handle errors gracefully with user feedback

### Firefox APIs

- Use `browser.runtime` for message passing (Promise-based)
- Use `browser.storage.local` for persistent data
- Use `browser.tabs` for tab management
- Follow Firefox WebExtensions best practices
- All APIs return Promises (no callbacks)

## 🐛 Reporting Issues

### Before Filing an Issue

1. Search existing issues to avoid duplicates
2. Try to reproduce with the latest version
3. Check if it's a Firefox/YouTube update issue

### Filing an Issue

Include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Firefox version
- Console errors (if any)
- Screenshots/GIFs (if applicable)

## 💡 Feature Requests

We welcome feature suggestions! Please:

1. Check existing issues/PRs first
2. Describe the use case clearly
3. Explain why it would benefit users
4. Consider implementation complexity

## 🔒 Security

For security vulnerabilities, please email directly instead of creating a public issue. Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## 📚 Additional Resources

- [Firefox Extension Documentation](https://extensionworkshop.com/)
- [WebExtensions API Reference](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Project README](README.md)

## ❓ Questions?

Feel free to:

- Open a discussion in GitHub Discussions
- Ask in existing issues
- Reach out to maintainers

Thank you for contributing! 🎉
