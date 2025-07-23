import type { Message } from "ai";
import {
  createDataStreamResponse,
  appendResponseMessages,
} from "ai";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { streamFromDeepSearch } from "~/deep-search";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { requests, users } from "~/server/db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { upsertChat, getChat } from "~/server/db/queries";
import { checkRateLimit, recordRateLimit, type RateLimitConfig } from "~/server/rate-limit";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

export const maxDuration = 60;

// Rate limit configuration
const DAILY_REQUEST_LIMIT = 5;

// Global rate limit configuration
const chatRateLimitConfig: RateLimitConfig = {
  maxRequests: 1,
  maxRetries: 3,
  windowMs: 20_000, // 20 seconds
  keyPrefix: "chat",
};

export async function POST(request: Request) {
  // Check global rate limit
  const rateLimitCheck = await checkRateLimit(chatRateLimitConfig);

  if (!rateLimitCheck.allowed) {
    console.log("Rate limit exceeded, waiting...");
    const isAllowed = await rateLimitCheck.retry();
    // If the rate limit is still exceeded after retries, return a 429
    if (!isAllowed) {
      return new Response("Rate limit exceeded", {
        status: 429,
      });
    }
  }

  // Record the request in the global rate limit
  await recordRateLimit(chatRateLimitConfig);

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
      
      // Create Langfuse trace for chat operations
      const trace = langfuse.trace({
        sessionId: chatId,
        name: "chat",
        userId: session.user.id,
      });
      
      // If this is an existing chat, verify it belongs to the current user
      if (!isNewChat) {
        const chatVerificationSpan = trace.span({
          name: "chat-verification",
          input: { chatId, userId },
        });
        
        const existingChat = await getChat(chatId, userId);
        
        chatVerificationSpan.end({
          output: { chatExists: !!existingChat },
        });
        
        if (!existingChat) {
          throw new Error(`Chat ${chatId} not found or does not belong to user ${userId}`);
        }
      }
      
      // Create the chat immediately with the user's message
      // to protect against broken streams
      const userMessage = messages[messages.length - 1];
      const chatTitle = userMessage?.content?.slice(0, 50) ?? "New Chat";
      
      const initialChatUpsertSpan = trace.span({
        name: "initial-chat-upsert",
        input: { userId, chatId, title: chatTitle, messageCount: messages.length },
      });
      
      await upsertChat({
        userId,
        chatId: chatId,
        title: chatTitle,
        messages,
      });
      
      initialChatUpsertSpan.end({
        output: { success: true },
      });

      // 1. Wait for the result
      const result = await streamFromDeepSearch({
        messages,
        telemetry: {
          isEnabled: true,
          functionId: "agent",
          metadata: {
            langfuseTraceId: trace.id,
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
            const finalChatUpsertSpan = trace.span({
              name: "final-chat-upsert",
              input: { userId, chatId, title: chatTitle, messageCount: updatedMessages.length },
            });
            
            await upsertChat({
              userId,
              chatId: chatId,
              title: chatTitle,
              messages: updatedMessages,
            });
            
            finalChatUpsertSpan.end({
              output: { success: true },
            });
            
            // Flush Langfuse trace
            await langfuse.flushAsync();
          } catch (error) {
            console.error('Error saving chat:', error);
          }
        },
      });

      // 2. Once the result is ready, merge it into the data stream
      result.mergeIntoDataStream(dataStream);
    },
    onError: (e) => {
      console.error(e);
      return "Oops, an error occured!";
    },
  });
}
