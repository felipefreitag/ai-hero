"use client";

import { useChat } from "@ai-sdk/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { StickToBottom } from "use-stick-to-bottom";
import type { Message } from "ai";

interface ChatProps {
  userName: string;
  chatId: string;
  isNewChat: boolean;
  initialMessages: Message[];
}

export const ChatPage = ({ userName, chatId, isNewChat, initialMessages }: ChatProps) => {
  const router = useRouter();
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    initialMessages,
    body: {
      chatId,
      isNewChat,
    },
  });

  // Redirect to the new chat URL when a new chat is created
  useEffect(() => {
    if (isNewChat && messages.length > 0) {
      router.push(`?id=${chatId}`);
    }
  }, [isNewChat, messages.length, chatId, router]);

  return (
    <>
      <div className="flex flex-1 flex-col">
        <StickToBottom
          className="mx-auto w-full max-w-[65ch] flex-1 min-h-0 relative [&>div]:overflow-y-auto [&>div]:p-4 [&>div]:scrollbar-thin [&>div]:scrollbar-track-gray-800 [&>div]:scrollbar-thumb-gray-600 [&>div]:hover:scrollbar-thumb-gray-500"
          resize="smooth"
          initial="smooth"
          role="log"
          aria-label="Chat messages"
        >
          <StickToBottom.Content className="flex flex-col">
            {messages.map((message, index) => {
              return (
                <ChatMessage
                  key={message.id || index}
                  message={message}
                  userName={userName}
                />
              );
            })}
          </StickToBottom.Content>
        </StickToBottom>

        <div className="border-t border-gray-700">
          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-[65ch] p-4"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Say something..."
                autoFocus
                aria-label="Chat input"
                disabled={isLoading}
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal isOpen={false} onClose={() => undefined} />
    </>
  );
};
