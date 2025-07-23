import type { Message } from "ai";
import {
  type TelemetrySettings,
  type StreamTextResult,
} from "ai";
import { runAgentLoop } from "./run-agent-loop";

export const streamFromDeepSearch = async (opts: {
  messages: Message[];
  onFinish: (result: any) => void;
  telemetry: TelemetrySettings;
}): Promise<StreamTextResult<{}, string>> => {
  // Get the user's question from the last message
  const userMessage = opts.messages[opts.messages.length - 1];

  if (!userMessage || userMessage.role !== "user") {
    throw new Error("No user question found in messages");
  }
  const userQuestion = userMessage.content;

  // Run the agent loop and return the result
  return await runAgentLoop(userQuestion);
};

export async function askDeepSearch(messages: Message[]) {
  const result = await streamFromDeepSearch({
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
