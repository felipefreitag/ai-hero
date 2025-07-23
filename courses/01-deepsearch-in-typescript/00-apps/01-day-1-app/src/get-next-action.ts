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
) => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `
    You are a helpful AI assistant that can search the web, scrape URLs, or answer questions. Your goal is to determine the next best action to take based on the current context.
    `,
    prompt: `Based on this context, choose thenext action:
1. If you need more information, use 'search' with a relevant query
2. If you have URLs that need to be scraped, use 'scrape' with those URLs
3. If you have enough information to answer the question, use 'answer'

Remember:
- Only use 'search' if you need more information
- Only use 'scrape' if you have URLs that need to be scraped
- Use 'answer' when you have enough information to provide a complete answer

Here is the context:

${context.getQueryHistory()}

${context.getScrapeHistory()}
    `,
  });

  return result.object;
};
