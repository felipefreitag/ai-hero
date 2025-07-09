# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Hero is an open-source educational platform for learning AI engineering. The repository contains:

- **Examples**: Self-contained code samples demonstrating AI concepts (in `/examples/`)
- **Courses**: Structured course material, particularly the "DeepSearch in TypeScript" course (in `/courses/`)
- **Articles**: Technical articles and documentation (in `/articles/`)

## Common Commands

### Development
```bash
# Install dependencies
pnpm install

# Run a specific example (e.g., vercel-ai-sdk example 01)
pnpm run example v 01

# Run all examples in watch mode
pnpm run all-examples

# Run the example runner script
pnpm run example

# Lint TypeScript and ESLint
pnpm run lint
```

### Content Management
```bash
# Watch articles for changes during development
pnpm run articles:dev

# Generate article feedback
pnpm run articles:feedback

# Concatenate articles
pnpm run articles:concat

# Reorder examples and run lint
pnpm run reorder
```

### Internal Tools
```bash
# Add lesson to course structure
pnpm run add-lesson

# Generate embeddings from datasets
pnpm run embed-datasets

# Manage shortlinks
pnpm run shortlinks:update
pnpm run shortlinks:generate
pnpm run shortlinks:sync
```

## Architecture

### Examples Structure
- **`examples/_shared/`**: Common utilities and models used across examples
  - `models.ts`: Pre-configured AI models (Anthropic, OpenAI, local models)
  - `utils.ts`: Utility functions and type helpers
  - `components/`: Shared React components
  - `dev-server/`: Development server utilities

- **`examples/vercel-ai-sdk/`**: Comprehensive examples using the Vercel AI SDK
- **`examples/model-context-protocol/`**: MCP (Model Context Protocol) examples
- **`examples/agents/`**: Agent-based AI examples
- **`examples/_templates/`**: Template structure for new examples

### Model Configuration
The project uses a centralized model configuration system in `examples/_shared/models.ts`:
- Supports Anthropic Claude models, OpenAI models, and local models via LM Studio
- Implements file system caching for model responses
- Provides environment variable switching between local and cloud models

### Course Structure
- **`courses/01-deepsearch-in-typescript/`**: Primary course with progressive applications
- Each course day has an associated app in `00-apps/` showing the implementation at that stage
- Course material follows a specific format with "Steps to complete", "The exercise is finished when", and "Not required yet" sections

### Testing and Evaluation
- Uses **Evalite** framework for AI model evaluations
- Each example can have corresponding `.eval.ts` files
- Test files follow the pattern `*.eval.ts` for evaluation scripts

## Development Patterns

### Example Structure
Each example follows this pattern:
```
example-name/
├── main.ts          # Main implementation
├── readme.md        # Documentation
├── article.md       # Optional article content
└── *.eval.ts        # Optional evaluation tests
```

### File Naming
- Use kebab-case for directories and most files
- TypeScript files use camelCase
- Examples marked as TODO have `-TODO` suffix
- Evaluation files end with `.eval.ts`

### Environment Variables
Required environment variables:
- `OPENAI_API_KEY`: For OpenAI models
- `ANTHROPIC_API_KEY`: For Anthropic models
- `USE_LOCAL_MODEL`: Set to use local models instead of cloud models
- `LOCALHOST_OVERRIDE`: For custom localhost configuration

## Content Guidelines

### Writing Style
The project follows specific writing guidelines defined in `.cursor/rules/writing-style.mdc`:
- Conversational but technical tone
- Practical, no-nonsense approach
- Clear section headers and structure
- Use of Mermaid diagrams for flowcharts
- Focus on decision points and trade-offs

### Course Format
Course articles follow a specific format with three required sections:
- **Steps to complete**: Instructions for LLM/automated systems
- **The exercise is finished when**: Exit conditions
- **Not required yet**: Steps to avoid doing prematurely

## Repository Organization

- **`/examples/`**: Self-contained learning examples
- **`/courses/`**: Structured course materials
- **`/articles/`**: Standalone technical articles
- **`/internal/`**: Repository management and tooling scripts
- **`/node_modules/`**: Dependencies (managed by pnpm)

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Package Manager**: pnpm
- **AI SDKs**: Vercel AI SDK, Anthropic SDK, OpenAI SDK
- **Evaluation**: Evalite framework
- **Frontend**: React with Tailwind CSS (for UI examples)
- **Development**: tsx for TypeScript execution, Vite for bundling