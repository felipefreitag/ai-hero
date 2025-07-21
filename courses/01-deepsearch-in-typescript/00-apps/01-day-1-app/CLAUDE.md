# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Day 1 DeepSearch app.

## Project Overview

This is the Day 1 application from the DeepSearch in TypeScript course. It's a Next.js application that demonstrates building a basic AI-powered search chat interface with authentication and database persistence.

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **AI**: Vercel AI SDK (`ai` for backend, `@ai-sdk/react` for frontend)
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis with ioredis
- **Authentication**: NextAuth.js v5 beta
- **Styling**: Tailwind CSS with Geist font
- **Package Manager**: pnpm

## Common Commands

### Development
```bash
# Install dependencies
pnpm install

# Start development server with turbo
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm run start

# Preview production build
pnpm run preview
```

### Database Management
```bash
# Push schema changes to database
pnpm run db:push

# Generate migration files
pnpm run db:generate

# Run migrations
pnpm run db:migrate

# Open Drizzle Studio
pnpm run db:studio
```

### Code Quality
```bash
# Lint and type check
pnpm run check

# Lint only
pnpm run lint

# Fix linting issues
pnpm run lint:fix

# Type check only
pnpm run typecheck

# Format code
pnpm run format:write

# Check formatting
pnpm run format:check
```

### Infrastructure
```bash
# Start PostgreSQL database (requires Docker)
./start-database.sh

# Start Redis server (requires Docker)
./start-redis.sh

# Test Redis connection
node test-redis.js
```

## Important Files & Architecture

### Core Application Files
- **`src/app/page.tsx`** - Server-side page for authentication and server requests
- **`src/app/chat.tsx`** - Client-side chat interface using `useChat` hook
- **`src/app/api/chat/route.ts`** - API route for `streamText` implementation
- **`src/app/layout.tsx`** - Root layout component

### Configuration & Types
- **`src/models.ts`** - AI model declarations and configuration
- **`src/serper.ts`** - Serper API integration for search functionality
- **`src/types.ts`** - General-purpose TypeScript types
- **`src/utils.ts`** - General-purpose utility functions
- **`src/env.js`** - Type-safe environment variable validation

### Database Layer
- **`src/server/db/schema.ts`** - Drizzle ORM schema definitions
- **`src/server/db/queries.ts`** - Database helper functions and queries
- **`src/server/db/index.ts`** - Database connection setup

### Authentication
- **`src/server/auth/index.ts`** - Authentication functions (`signIn`, `signOut`, `auth`)
- **`src/server/auth/config.ts`** - NextAuth.js configuration
- **`src/app/api/auth/[...nextauth]/route.ts`** - NextAuth.js API routes

### Components
- **`src/components/auth-button.tsx`** - Authentication button component
- **`src/components/chat-message.tsx`** - Chat message display component
- **`src/components/error-message.tsx`** - Error message display component
- **`src/components/sign-in-modal.tsx`** - Sign-in modal component

### Infrastructure
- **`src/server/redis/redis.ts`** - Redis client configuration

## Environment Variables

Required environment variables (configure in `.env`):
- **`REDIS_URL`** - Redis connection URL
- **`DATABASE_URL`** - PostgreSQL database URL
- **`AUTH_SECRET`** - NextAuth.js secret (required in production)
- **`NODE_ENV`** - Environment mode (development/test/production)

## Development Setup

1. **Install dependencies**: `pnpm install`
2. **Install Docker Desktop** for database services
3. **Start database**: `./start-database.sh`
4. **Start Redis**: `./start-redis.sh`
5. **Configure environment**: Create `.env` file with required variables
6. **Push database schema**: `pnpm run db:push`
7. **Start development**: `pnpm run dev`

## File Naming Conventions

- **Components**: Use dash-case (e.g., `auth-button.tsx`)
- **API Routes**: Follow Next.js App Router conventions
- **Database files**: Use camelCase for functions, PascalCase for schemas
- **Configuration files**: Use standard naming (e.g., `drizzle.config.ts`)

## Development Guidelines

### Code Organization
- Place reusable components in `src/components/`
- Keep database operations in `src/server/db/`
- Authentication logic goes in `src/server/auth/`
- API routes follow Next.js App Router structure

### Database Operations
- Always use `pnpm run db:push` after schema changes
- Use helper functions from `src/server/db/queries.ts`
- Follow Drizzle ORM patterns for type safety

### Authentication
- Use `auth()` function for server-side authentication checks
- Implement `signIn` and `signOut` functions from `src/server/auth/index.ts`
- NextAuth.js v5 beta is configured for Discord authentication

### AI Integration
- Use Vercel AI SDK for both backend (`ai`) and frontend (`@ai-sdk/react`)
- Model configurations should be in `src/models.ts`
- Search functionality integrates with Serper API

## Development Behavior

After completing any task, always ask the user if they would like to ask any follow-up questions about the code that has just been added. Provide 3 example follow-up questions to help guide the conversation.

## Important Warnings

- Never try to run the dev server on this project. Ask me to run it if needed. Check if it's running on port 3000 before asking.

## Future Enhancements (from TODO)

- Handle anonymous requests with IP-based rate limiting
- Implement chunking system for crawled information
- Add 'edit' and 'rerun from here' buttons
- Add evaluation system
- Handle conversations longer than context window with summarization
- Implement LLM follow-up question generation

## Execution Guidelines

- Do not run evals, ask the user to do it