import { streamText, type StreamTextResult } from "ai";
import { model } from "~/models";
import { SystemContext } from "./system-context";

export const answerQuestion = (
  context: SystemContext,
  userQuestion: string,
  options?: { isFinal?: boolean }
): StreamTextResult<{}, string> => {
  const isFinal = options?.isFinal ?? false;
  
  return streamText({
    model,
    system: `You are a helpful AI assistant that provides comprehensive answers based on web search and scraping results.

CURRENT DATE AND TIME: ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleString('en-US', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})

${isFinal ? 
  "IMPORTANT: This is your final attempt to answer the question. You may not have all the information you need, but you must make your best effort to provide a helpful answer based on what you have gathered." :
  "Provide a comprehensive answer based on the information you have gathered from web searches and scraping."
}

When providing answers:
1. ALWAYS include clickable links to your sources using markdown format: [text](url)
2. For each fact or recommendation you mention, include a link to the source where you found that information
3. Use the exact URLs from the search results you receive
4. Make the linked text descriptive (e.g., "according to TripAdvisor" or "as reported by Food & Wine")

Example format:
- [Restaurant Name](https://example.com): Description with rating from [TripAdvisor](https://tripadvisor.com/specific-page)

Never provide information without including the source links from your search results.`,
    prompt: `User's question: "${userQuestion}"

Here is all the context I have gathered:

${context.getQueryHistory()}

${context.getScrapeHistory()}

Please provide a comprehensive answer to the user's question based on this information.`,
  });
};