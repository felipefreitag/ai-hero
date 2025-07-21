import { evalite } from "evalite";
import { askDeepSearch } from "~/deep-search";
import type { Message } from "ai";
import { Factuality } from "~/factuality-scorer";

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: string; expected: string }[]> => {
    return [
      {
        input: "What is the latest version of TypeScript?",
        expected: "The current TypeScript version is 5.8.3",
      },
      {
        input: "What are the main features of Next.js 15?",
        expected: `React 19 Support: Full support for React 19 including new hooks like useActionState, useFormStatus, and useOptimistic.
Caching Improvements: GET Route Handlers and Client Router Cache no longer cached by default, with opt-in caching available.
Async Request APIs: Request-specific APIs like headers, cookies, params, and searchParams are now asynchronous.
<Form> Component: New component enhances HTML forms with prefetching, client-side navigation, and progressive enhancement.
Turbopack Dev (Stable): Turbopack is now stable for development with performance and stability improvements.
Static Route Indicator: Visual indicator shows static routes during development.
instrumentation.js API (Stable): Provides server lifecycle observability.
TypeScript Support: Next.js now supports TypeScript for next.config.ts files.
ESLint 9 Support: Includes support for ESLint 9.
Enhanced Security: Improved Server Actions security with unguessable endpoints.
Optimized Bundling: Enhanced bundling of external packages for better performance.`,
      },
    ];
  },
  task: async (input) => {
    const messages: Message[] = [
      {
        id: "1",
        role: "user",
        content: input,
      },
    ];
    return askDeepSearch(messages);
  },
  scorers: [
    {
      name: "Contains Links",
      description:
        "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        const containsLinks = /\[.*?\]\(.*?\)/.test(output);

        return containsLinks ? 1 : 0;
      },
    },
    Factuality,
  ],
});
