import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { z } from "zod";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { model } from "~/models";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/crawler";
import { cacheWithRedis } from "~/server/redis/redis";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { requests, users } from "~/server/db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { upsertChat, getChat } from "~/server/db/queries";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

export const maxDuration = 60;

// Rate limit configuration
const DAILY_REQUEST_LIMIT = 5;

export async function POST(request: Request) {
  // Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Get user data to check if they are an admin
  const [user] = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  // Check rate limit for non-admin users
  if (!user.isAdmin) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [requestCount] = await db
      .select({ count: count() })
      .from(requests)
      .where(
        and(
          eq(requests.userId, userId),
          gte(requests.requestedAt, today)
        )
      );

    if (requestCount && requestCount.count >= DAILY_REQUEST_LIMIT) {
      return new Response("Daily request limit exceeded", { status: 429 });
    }
  }

  // Record the request
  await db.insert(requests).values({
    userId,
  });

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId: string;
    isNewChat: boolean;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages, chatId, isNewChat } = body;
      
      // If this is an existing chat, verify it belongs to the current user
      if (!isNewChat) {
        const existingChat = await getChat(chatId, userId);
        if (!existingChat) {
          throw new Error(`Chat ${chatId} not found or does not belong to user ${userId}`);
        }
      }
      
      // Create the chat immediately with the user's message
      // to protect against broken streams
      const userMessage = messages[messages.length - 1];
      const chatTitle = userMessage?.content?.slice(0, 50) ?? "New Chat";
      
      await upsertChat({
        userId,
        chatId: chatId,
        title: chatTitle,
        messages,
      });

      // Create Langfuse trace
      const trace = langfuse.trace({
        sessionId: chatId,
        name: "chat",
        userId: session.user.id,
      });

      const result = streamText({
        model,
        messages,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "agent",
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
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
        maxSteps: 10,
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }, { abortSignal }) => {
              const results = await searchSerper(
                { q: query, num: 3 },
                abortSignal,
              );

              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
                date: result.date,
              }));
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
        onFinish: async ({ response }) => {
          try {
            const responseMessages = response.messages;
            
            // Merge the original messages with the response messages
            const updatedMessages = appendResponseMessages({
              messages,
              responseMessages,
            });
            
            // Save the complete chat with all messages to the database
            await upsertChat({
              userId,
              chatId: chatId,
              title: chatTitle,
              messages: updatedMessages,
            });
            
            // Flush Langfuse trace
            await langfuse.flushAsync();
          } catch (error) {
            console.error('Error saving chat:', error);
          }
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
