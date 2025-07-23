import { generateObject } from "ai";
import { model } from "~/models";
import { type SystemContext } from "./system-context";
import { z } from 'zod'

export interface SearchAction {
  type: "search";
  query: string;
}

export interface ScrapeAction {
  type: "scrape";
  urls: string[];
}

export interface AnswerAction {
  type: "answer";
}

export type Action =
  | SearchAction
  | ScrapeAction
  | AnswerAction;

const actionSchema = z.object({
  type: z
    .enum(["search", "scrape", "answer"])
    .describe(
      `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL.
      - 'answer': Answer the user's question and complete the loop.`,
    ),
  query: z
    .string()
    .describe(
      "The query to search for. Required if type is 'search'.",
    )
    .optional(),
  urls: z
    .array(z.string())
    .describe(
      "The URLs to scrape. Required if type is 'scrape'.",
    )
    .optional(),
});

export const getNextAction = async (
  context: SystemContext,
  userQuestion: string,
) => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `You are a helpful AI assistant that can search the web, scrape URLs, or answer questions. 

Your goal is to help answer the user's question by determining the next best action to take. You have access to three actions:
1. 'search' - Search the web for information relevant to the user's question
2. 'scrape' - Get full content from URLs you've found in search results
3. 'answer' - Provide a final answer when you have enough information

CURRENT DATE AND TIME: ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleString('en-US', { timeZone: 'UTC', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})

When searching, make sure your queries are relevant to the user's specific question.`,
    prompt: `User's question: "${userQuestion}"

Based on this context, choose the next action:
1. If you need more information to answer the user's question, use 'search' with a relevant query
2. If you have URLs from search results that need to be scraped for full content, use 'scrape' with those URLs
3. If you have enough information to answer the user's question, use 'answer'

Remember:
- Only use 'search' if you need more information about the user's specific question
- Only use 'scrape' if you have URLs that need to be scraped for complete content
- Use 'answer' when you have enough information to provide a complete answer to the user's question

Here is the context from previous actions:

${context.getQueryHistory()}

${context.getScrapeHistory()}
    `,
  });

  return result.object;
};
