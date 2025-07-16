import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";

export type MessagePart = NonNullable<
  Message["parts"]
>[number];

interface ChatMessageProps {
  message: Message;
  userName: string;
}

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

export const ChatMessage = ({ message, userName }: ChatMessageProps) => {
  const isAI = message.role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>

        <div className="prose prose-invert max-w-none">
          {Array.isArray(message.parts) && message.parts.length > 0 ? (
            message.parts.map((part, index) => {
              switch (part.type) {
                case "text":
                  return <Markdown key={index}>{part.text}</Markdown>;
                case "tool-invocation":
                  return (
                    <div key={index} className="mb-4 rounded-lg bg-gray-700 p-3">
                      <div className="text-sm font-semibold text-blue-400 mb-2">
                        Tool: {part.toolInvocation.toolName}
                      </div>
                      {part.toolInvocation.state === "partial-call" && (
                        <div className="text-gray-400">Calling...</div>
                      )}
                      {part.toolInvocation.state === "call" && (
                        <div>
                          <div className="text-gray-400 text-sm mb-1">Arguments:</div>
                          <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                            {JSON.stringify(part.toolInvocation.args, null, 2)}
                          </pre>
                        </div>
                      )}
                      {part.toolInvocation.state === "result" && (
                        <div>
                          <div className="text-gray-400 text-sm mb-1">Arguments:</div>
                          <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto mb-2">
                            {JSON.stringify(part.toolInvocation.args, null, 2)}
                          </pre>
                          <div className="text-gray-400 text-sm mb-1">Result:</div>
                          <pre className="text-xs bg-gray-800 p-2 rounded overflow-x-auto">
                            {JSON.stringify(part.toolInvocation.result, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                default:
                  return null;
              }
            })
          ) : (
            <Markdown>{message.content}</Markdown>
          )}
        </div>
      </div>
    </div>
  );
};
