import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
} from "ai";
import { z } from "zod";
import { model } from "~/models";
import { searchSerper } from "~/serper";

export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    messages: Array<Message>;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages } = body;

      const result = streamText({
        model,
        messages,
        system: `You are a helpful AI assistant with access to web search. 

IMPORTANT: You MUST always use the searchWeb tool to find current information before answering any question.

When providing answers:
1. ALWAYS include clickable links to your sources using markdown format: [text](url)
2. For each fact or recommendation you mention, include a link to the source where you found that information
3. Use the exact URLs from the search results you receive
4. Make the linked text descriptive (e.g., "according to TripAdvisor" or "as reported by Food & Wine")

Example format:
- [Restaurant Name](https://example.com): Description with rating from [TripAdvisor](https://tripadvisor.com/specific-page)

Never provide information without including the source links from your search results.`,
        maxSteps: 10,
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }, { abortSignal }) => {
              const results = await searchSerper(
                { q: query, num: 10 },
                abortSignal,
              );

              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
              }));
            },
          },
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
