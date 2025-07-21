import type { Message } from "ai";
import {
  streamText,
  type TelemetrySettings,
} from "ai";
import { z } from "zod";
import { model } from "~/models";
import { searchSerper, type SerperTool } from "~/serper";
import { bulkCrawlWebsites } from "~/crawler";
import { cacheWithRedis } from "~/server/redis/redis";

export const streamFromDeepSearch = (opts: {
  messages: Message[];
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}) =>
  streamText({
    model,
    messages: opts.messages,
    maxSteps: 10,
    system: `You are a helpful AI assistant with access to web search and page scraping capabilities. 

CURRENT DATE AND TIME: ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleString('en-US', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})

IMPORTANT: When users ask for "up to date", "current", "latest", or "recent" information, always consider this current date in your search queries and responses. Use date-specific search terms when relevant (e.g., "2025", "today", "this week").

IMPORTANT: You MUST always use BOTH tools for every question:
1. FIRST use the searchWeb tool to find current information
2. THEN use the scrapePages tool to get the full content from the search results

Available tools:
1. **searchWeb**: Search the web for current information using search queries
2. **scrapePages**: Get the full content of web pages - YOU MUST ALWAYS USE THIS after searching

Workflow for every question:
1. Use searchWeb to find relevant URLs
2. Use scrapePages with ALL the URLs from the search results to get complete content
3. Provide comprehensive answers based on the full scraped content

When providing answers:
1. ALWAYS include clickable links to your sources using markdown format: [text](url)
2. For each fact or recommendation you mention, include a link to the source where you found that information
3. Use the exact URLs from the search results you receive
4. Make the linked text descriptive (e.g., "according to TripAdvisor" or "as reported by Food & Wine")

Example format:
- [Restaurant Name](https://example.com): Description with rating from [TripAdvisor](https://tripadvisor.com/specific-page)

Never provide information without including the source links from your search results.`,
    tools: {
      searchWeb: {
        parameters: z.object({
          query: z.string().describe("The query to search the web for"),
        }),
        execute: async ({ query }, { abortSignal }: { abortSignal?: AbortSignal }) => {
          /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-assignment */
          const results = await searchSerper(
            { q: query, num: 3 },
            abortSignal,
          ) as SerperTool.SearchResult;

          return results.organic.map((result: SerperTool.OrganicResult) => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
            date: result.date,
          }));
          /* eslint-enable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-assignment */
        },
      },
      scrapePages: {
        parameters: z.object({
          urls: z.array(z.string()).describe("Array of URLs to scrape for full content"),
        }),
        execute: cacheWithRedis(
          "scrapePages",
          async ({ urls }: { urls: string[] }) => {
            const results = await bulkCrawlWebsites({ urls });
            
            if (results.success) {
              return results.results.map((result) => ({
                url: result.url,
                success: true,
                content: result.result.data,
              }));
            } else {
              return results.results.map((result) => ({
                url: result.url,
                success: result.result.success,
                content: result.result.success ? result.result.data : undefined,
                error: result.result.success ? undefined : result.result.error,
              }));
            }
          }
        ),
      },
    },
    onFinish: opts.onFinish,
    experimental_telemetry: opts.telemetry,
  });

export async function askDeepSearch(messages: Message[]) {
  const result = streamFromDeepSearch({
    messages,
    onFinish: () => {
      // just a stub
    },
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}