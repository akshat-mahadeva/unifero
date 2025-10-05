# 🔍 Unifero - AI-Powered Web Search Chatbot

<div align="center">

![Unifero Logo](public/unifero.png)

**An intelligent web search-powered AI assistant that delivers real-time, accurate information from the internet**

[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://typescript.org)
[![Prisma](https://img.shields.io/badge/Prisma-6.16.3-2D3748?style=for-the-badge&logo=prisma)](https://prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)

[Demo](https://unifero.vercel.app) • [Documentation](#documentation) • [Contributing](CONTRIBUTING.md) • [Issues](https://github.com/yourusername/unifero/issues)

</div>

## ✨ Features

- 🔍 **Real-time Web Search** - Powered by Exa API for the most current information
- 🤖 **AI Assistant** - OpenAI integration with intelligent search decision-making
- 💬 **Conversational Interface** - Natural chat experience with context awareness
- 🔐 **User Authentication** - Secure authentication with Clerk
- 📊 **Session Management** - Persistent chat history and session tracking
- 🎨 **Modern UI** - Beautiful, responsive design with shadcn/ui components
- ⚡ **Real-time Streaming** - Live response streaming for better UX
- 🌐 **Search-First Approach** - Optimized to prioritize web search for factual queries

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database
- OpenAI API key
- Exa API key
- Clerk authentication setup

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/unifero.git
   cd unifero
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your API keys and database URL (see [Environment Variables](#environment-variables))

4. **Set up the database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/unifero"
DIRECT_URL="postgresql://username:password@localhost:5432/unifero"

# OpenAI
OPENAI_API_KEY="sk-..."

# Exa Search API
EXA_API_KEY="your-exa-api-key"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# App
NODE_ENV="development"
```

## 🏗️ Tech Stack

### Frontend

- **Framework**: Next.js 15.5.4 with App Router
- **Language**: TypeScript 5.0
- **Styling**: Tailwind CSS 4.0
- **UI Components**: shadcn/ui + Radix UI
- **State Management**: TanStack Query
- **Icons**: Lucide React

### Backend

- **Runtime**: Node.js
- **API Routes**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **AI Integration**: Vercel AI SDK + OpenAI
- **Search**: Exa API

### Development

- **Package Manager**: npm/yarn/pnpm
- **Linting**: ESLint
- **Database Migrations**: Prisma

## 📖 Documentation

### API Endpoints

- `POST /api/chat` - Main chat endpoint for AI conversations with web search

### Database Schema

The application uses three main models:

- **Session** - Chat sessions with user context
- **Message** - Individual messages in conversations
- **ToolSnapshot** - Web search results and tool executions

### Key Components

- **Chat Interface** (`/src/components/chat/`) - Main chat UI
- **AI Elements** (`/src/components/ai-elements/`) - AI-specific UI components
- **Web Search Tool** (`/src/lib/tools/search.ts`) - Exa API integration
- **Database Actions** (`/src/actions/chat.actions.ts`) - Database operations

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📝 Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Database
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes to database
npx prisma studio    # Open Prisma Studio
```

## 🔒 Security

- Environment variables are required for all sensitive data
- Authentication is handled by Clerk with secure session management
- API routes include proper validation and error handling
- Database queries use Prisma for SQL injection protection

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Vercel AI SDK](https://sdk.vercel.ai) for AI integration
- [Exa](https://exa.ai) for powerful web search capabilities
- [Clerk](https://clerk.com) for authentication
- [shadcn/ui](https://ui.shadcn.com) for beautiful UI components
- [Prisma](https://prisma.io) for database management

## 📊 Project Status

This project is actively maintained and open for contributions. See our [roadmap](https://github.com/yourusername/unifero/projects) for upcoming features.

---

<div align="center">

**Built with ❤️ by the Unifero team**

[Website](https://unifero.vercel.app) • [Twitter](https://twitter.com/unifero) • [Discord](https://discord.gg/unifero)

</div>
