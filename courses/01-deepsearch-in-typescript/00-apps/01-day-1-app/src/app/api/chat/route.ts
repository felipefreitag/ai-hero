import type { Message } from "ai";
import {
  streamText,
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { z } from "zod";
import { model } from "~/models";
import { searchSerper } from "~/serper";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { requests, users } from "~/server/db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { upsertChat, getChat } from "~/server/db/queries";

export const maxDuration = 60;

// Rate limit configuration
const DAILY_REQUEST_LIMIT = 1;

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
    chatId?: string;
  };

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const { messages, chatId } = body;
      
      // If chatId is provided, verify it belongs to the current user
      if (chatId) {
        const existingChat = await getChat(chatId, userId);
        if (!existingChat) {
          throw new Error(`Chat ${chatId} not found or does not belong to user ${userId}`);
        }
      }
      
      // Generate a new chat ID if not provided
      const currentChatId = chatId ?? crypto.randomUUID();
      
      // Create the chat immediately with the user's message
      // to protect against broken streams
      const userMessage = messages[messages.length - 1];
      const chatTitle = userMessage?.content?.slice(0, 50) ?? "New Chat";
      
      await upsertChat({
        userId,
        chatId: currentChatId,
        title: chatTitle,
        messages,
      });

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
              chatId: currentChatId,
              title: chatTitle,
              messages: updatedMessages,
            });
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
