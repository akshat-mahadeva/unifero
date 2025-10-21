# Contributing to Unifero

We love your input! We want to make contributing to Unifero as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 🚀 Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Pull Request Process

1. **Fork the repo** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Set up environment**: Copy `.env.example` to `.env.local` and fill in required values
4. **Set up database**: Run `npx prisma generate && npx prisma db push`
5. **Make your changes** and ensure they follow our coding standards
6. **Test your changes**: Ensure the app runs without errors
7. **Update documentation** if you changed APIs or added features
8. **Submit a pull request**!

## 🏗️ Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key
- **Unifero CLI endpoint** (for web search functionality)
- Clerk account for authentication

**Note**: The Unifero CLI is our custom web search tool. For development, you can:

- Use our hosted endpoint: `https://unifero-cli.vercel.app/process`
- Or set up your own instance from [unifero-cli](https://github.com/yourusername/unifero-cli)

### Local Development

1. **Clone your fork**:

   ```bash
   git clone https://github.com/yourusername/unifero.git
   cd unifero
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Environment setup**:

   ```bash
   cp .env.example .env.local
   # Fill in your API keys and database URL
   ```

4. **Database setup**:

   ```bash
   npx prisma generate
   npx prisma db push
   ```

### Unifero CLI Setup

For full development access to search features, you'll need the Unifero CLI:

1. **Clone the CLI repository**:

   ```bash
   git clone https://github.com/yourusername/unifero-cli.git
   cd unifero-cli
   npm install
   ```

2. **Set up the CLI**:

   ```bash
   npm run dev  # This will start the CLI server
   ```

3. **Update your .env.local** in the main project:
   ```env
   UNIFERO_WEB_SEARCH_URL="http://localhost:3001/process"  # CLI dev server
   ```

**Alternative**: Use our hosted CLI endpoint for basic development:

```env
UNIFERO_WEB_SEARCH_URL="https://unifero-cli.vercel.app/process"
```

## 🔬 Understanding the Deep Search Architecture

Unifero uses an advanced multi-step research system powered by our custom Unifero CLI tool. Here's how it works:

### Research Workflow

1. **Query Analysis** (`analyzeQueryTool`) - AI determines if deep research is needed
2. **Parallel Web Search** (`webSearchTool`) - Multiple searches using Unifero CLI
3. **Synthesis** (`synthesizeTool`) - AI combines and analyzes findings
4. **Report Generation** (`generateReportTool`) - Creates comprehensive responses

### Key Files

- `src/lib/agent/deep-search.ts` - Main research orchestration
- `src/lib/tools/uniferoSearch.ts` - Unifero CLI integration
- `src/actions/deep-search.actions.ts` - Database operations
- `src/types/deep-search.ts` - Type definitions

### Unifero CLI Tool

Our web search is powered by the **Unifero CLI** - an open-source web scraping and search tool. Contributors can help improve:

- **Search algorithms** - Better result ranking and relevance
- **Web scraping** - Improved data extraction and parsing
- **Performance** - Faster search and caching mechanisms
- **New sources** - Integration with additional data providers

**Contributing to Unifero CLI**: Check out [unifero-cli](https://github.com/yourusername/unifero-cli) for the separate repository.

## �📝 Coding Standards

### Code Style

- We use **TypeScript** for type safety
- Follow **ESLint** rules (run `npm run lint`)
- Use **Prettier** for consistent formatting
- Write **meaningful commit messages**

### Component Guidelines

- Use **functional components** with hooks
- Follow the existing **file structure**
- Use **shadcn/ui components** when possible
- Implement **proper error handling**
- Add **TypeScript types** for all props and functions

### API Guidelines

- Validate all **input parameters**
- Use **proper HTTP status codes**
- Implement **comprehensive error handling**
- Follow **RESTful conventions**
- Add **rate limiting** for production endpoints

## 🚀 Getting Started with Development

### Quick Setup for Contributors

1. **Environment Setup**:

   ```bash
   git clone https://github.com/yourusername/unifero.git
   cd unifero
   npm install
   cp .env.example .env.local
   # Fill in your API keys
   ```

2. **Database & Start**:
   ```bash
   npx prisma generate && npx prisma db push
   npm run dev
   ```

### Understanding the Codebase

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with Prisma ORM
- **AI Layer**: Vercel AI SDK with custom tools and agents
- **Search**: Custom Unifero CLI tool for web scraping
- **UI**: shadcn/ui components with Radix UI primitives

### Development Workflow

1. **Pick an issue** from our [GitHub Issues](https://github.com/yourusername/unifero/issues)
2. **Create a branch**: `git checkout -b feature/your-feature-name`
3. **Make changes** following our coding standards
4. **Test thoroughly** - manual testing required currently
5. **Submit PR** with clear description and screenshots if UI changes

### Testing Your Changes

Since we don't have automated tests yet, please:

- Test in multiple browsers (Chrome, Firefox, Safari)
- Test on different screen sizes
- Test error scenarios and edge cases
- Verify database operations work correctly
- Test both regular chat and deep search modes

## 🧪 Testing

Currently, we don't have automated tests set up, but we encourage:

- **Manual testing** of your changes
- **Cross-browser compatibility** testing
- **Mobile responsiveness** verification
- **Error scenario** testing

## 📋 Issue Guidelines

### Bug Reports

When filing a bug report, please include:

**Required Information:**

- **Browser and version**
- **Operating system**
- **Node.js version**
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)

**Template:**

```markdown
**Bug Description:**
A clear description of what the bug is.

**To Reproduce:**

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior:**
What you expected to happen.

**Screenshots:**
Add screenshots to help explain your problem.

**Environment:**

- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Node.js version: [e.g. 18.17.0]
```

### Feature Requests

We welcome feature requests! Please provide:

- **Clear description** of the feature
- **Use case** and why it would be valuable
- **Proposed implementation** (if you have ideas)
- **Mockups or examples** (if applicable)

**Deep Search Feature Template:**

```markdown
**Feature: [Brief title]**

**Problem:**
What problem does this solve in the deep search workflow?

**Proposed Solution:**
How should this feature work?

**Technical Details:**

- Which tool/agent would this affect? (analyzeQueryTool, webSearchTool, etc.)
- Any new dependencies needed?
- Performance considerations?

**Example Usage:**
Describe how users would interact with this feature.
```

## 🎯 Areas for Contribution

We especially welcome contributions in these areas:

### High Priority

- 🧪 **Testing infrastructure** (unit tests, integration tests)
- 🔍 **Search improvements** (better query processing, result ranking in Unifero CLI)
- 🤖 **AI Agent enhancements** (improve reasoning, add new tools, optimize workflows)
- 🎨 **UI/UX enhancements** (accessibility, mobile optimization)
- 📊 **Performance optimizations** (caching, lazy loading, streaming improvements)

### Medium Priority

- 🌐 **Internationalization** (i18n support)
- 🔌 **Plugin system** (extensible tool integration for custom AI capabilities)
- 📈 **Analytics and monitoring** (usage tracking, error reporting)
- 🎛️ **Admin dashboard** (user management, system health monitoring)
- 🔬 **Deep Search features** (new research modes, advanced filtering, source verification)

### Nice to Have

- 📱 **Mobile app** (React Native or Progressive Web App)
- 🤖 **AI model alternatives** (Claude, Gemini, local models integration)
- 🔊 **Voice interface** (speech-to-text, text-to-speech)
- 📊 **Advanced search features** (filters, date ranges, custom sources)
- 🛠️ **Unifero CLI improvements** (new search providers, better parsing, API enhancements)

## 📚 Documentation Contributions

Documentation improvements are always welcome:

- **API documentation** improvements
- **Setup guides** for different environments
- **Tutorial content** for new users
- **Code comments** and inline documentation
- **README** updates and clarifications

## 🐛 Security Issues

If you find a security vulnerability, do **NOT** open an issue. Email us directly at security@unifero.dev instead.

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**

- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

## 🏷️ Commit Message Guidelines

Use clear and meaningful commit messages:

```bash
feat: add web search result caching
fix: resolve authentication redirect issue
docs: update API documentation
style: format code with prettier
refactor: simplify search query processing
test: add unit tests for chat actions
chore: update dependencies
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## 🎉 Recognition

Contributors will be recognized in:

- **README.md** contributors section
- **Release notes** for significant contributions
- **Project discussions** and announcements

## 💬 Community

- **GitHub Discussions**: For general questions and discussions
- **GitHub Issues**: For bug reports and feature requests
- **Discord**: [Join our Discord](https://discord.gg/unifero) for real-time chat
- **Twitter**: Follow [@unifero](https://twitter.com/unifero) for updates

### Getting Help

- **Beginners**: Start with [good first issues](https://github.com/yourusername/unifero/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- **Deep Search**: Check issues labeled `deep-search` or `ai-agent`
- **Documentation**: Help improve our docs - they're always needed!
- **Discord Channels**:
  - `#general` - General discussion
  - `#development` - Technical discussions
  - `#deep-search` - AI and search algorithm discussions
  - `#contributors` - Getting started and contribution help

### Recognition

Contributors will be recognized in:

- **README.md** contributors section
- **Release notes** for significant contributions
- **Project discussions** and announcements
- **Discord contributor role** for active contributors

## 📞 Need Help?

- Check existing **GitHub Issues** and **Discussions**
- Join our **Discord** for community support
- For complex questions, open a **new Discussion**

---

**Thank you for contributing to Unifero!** 🙏

Your contributions help make Unifero better for everyone. We appreciate your time and effort in improving this project.
