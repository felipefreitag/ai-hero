import { z } from "zod";
import { searchSerper, type SerperTool } from "~/serper";
import { bulkCrawlWebsites } from "~/crawler";
import { cacheWithRedis } from "~/server/redis/redis";
import { env } from "~/env";
import { SystemContext } from "./system-context";
import { getNextAction } from "./get-next-action";
import { answerQuestion } from "./answer-question";

export const searchWeb = async (query: string, abortSignal?: AbortSignal) => {
  /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-assignment */
  const results = await searchSerper(
    { q: query, num: env.SEARCH_RESULTS_COUNT },
    abortSignal,
  ) as SerperTool.SearchResult;

  return results.organic.map((result: SerperTool.OrganicResult) => ({
    title: result.title,
    link: result.link,
    snippet: result.snippet,
    date: result.date,
  }));
  /* eslint-enable @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-unsafe-assignment */
};

export const scrapeUrl = cacheWithRedis(
  "scrapePages",
  async (urls: string[]) => {
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
);

export const runAgentLoop = async (userQuestion: string, abortSignal?: AbortSignal) => {
  // A persistent container for the state of our system
  const ctx = new SystemContext();

  // A loop that continues until we have an answer
  // or we've taken 10 actions
  while (!ctx.shouldStop()) {
    // We choose the next action based on the state of our system
    const nextAction = await getNextAction(ctx);

    // We execute the action and update the state of our system
    if (nextAction.type === "search") {
      const results = await searchWeb(nextAction.query!, abortSignal);
      ctx.reportQueries([{
        query: nextAction.query!,
        results: results.map(r => ({
          date: r.date || "",
          title: r.title,
          url: r.link,
          snippet: r.snippet,
        })),
      }]);
    } else if (nextAction.type === "scrape") {
      const results = await scrapeUrl(nextAction.urls!);
      ctx.reportScrapes(results.map(r => ({
        url: r.url,
        result: r.content || ("error" in r ? r.error : undefined) || "Failed to scrape",
      })));
    } else if (nextAction.type === "answer") {
      return answerQuestion(ctx, userQuestion);
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  return answerQuestion(ctx, userQuestion, { isFinal: true });
};
