import { and, desc, eq } from "drizzle-orm";
import type { Message } from "ai";
import { db } from "./index";
import { chats, messages } from "./schema";

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: Message[];
}) => {
  const { userId, chatId, title, messages: chatMessages } = opts;

  // Check if chat exists for any user
  const existingChat = await db
    .select()
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  if (existingChat.length === 0) {
    // Create new chat
    await db.insert(chats).values({
      id: chatId,
      userId,
      title,
    });
  } else {
    // Verify the chat belongs to the current user
    if (existingChat[0]?.userId !== userId) {
      throw new Error(`Chat ${chatId} does not belong to user ${userId}`);
    }
    
    // Update existing chat title and updatedAt
    await db
      .update(chats)
      .set({ 
        title,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, chatId));
  }

  // Delete all existing messages for this chat
  await db.delete(messages).where(eq(messages.chatId, chatId));

  // Insert new messages
  if (chatMessages.length > 0) {
    await db.insert(messages).values(
      chatMessages.map((message, index) => ({
        chatId,
        role: message.role,
        parts: message.parts,
        order: index,
      }))
    );
  }
};

export const getChat = async (chatId: string, userId: string) => {
  const chat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  if (chat.length === 0) {
    return null;
  }

  const chatMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.order);

  return {
    ...chat[0],
    messages: chatMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      parts: msg.parts,
      content: "",
    })) as Message[],
  };
};

export const getChats = async (userId: string) => {
  return await db
    .select()
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));
};
