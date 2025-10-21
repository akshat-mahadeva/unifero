import {
  saveDeepSearchSources,
  createDeepSearchStep,
  updateDeepSearchStepReasoning,
} from "@/actions/deep-search.actions";
import { openai } from "@ai-sdk/openai";
import { generateObject, generateText, tool, UIMessageStreamWriter } from "ai";
// import Exa from "exa-js";
import z from "zod";
import { DeepSearchStepType } from "@/types/deep-search";
import { randomUUID } from "crypto";
import { createProgressManager } from "./progress-manager";
import { tavily } from "@tavily/core";
import { uniferoWebSearch } from "../tools/uniferoSearch";

// export const exa = new Exa(process.env.EXA_API_KEY!);

export const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export function getTools(
  writer: UIMessageStreamWriter,
  sessionId: string,
  messageId: string
) {
  const progressManager = createProgressManager(messageId, sessionId);

  // Tool 1: Analyze query to determine approach
  const analyzeQueryTool = tool({
    description:
      "Analyze the user's query to determine if deep research is needed or if a simple response is sufficient. MUST be called first for every query.",
    inputSchema: z.object({
      query: z.string().describe("The user's original question"),
      reasoning: z
        .string()
        .optional()
        .describe("Optional reasoning for analysis"),
    }),
    execute: async ({ query, reasoning }) => {
      const step = await createDeepSearchStep({
        sessionId,
        messageId,
        stepType: DeepSearchStepType.analyze,
        reasoningText: reasoning || "Analyzing query...",
        executed: false,
        input: { query },
      });

      const stepEventId = randomUUID();

      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `reasoning-${stepEventId}`,
        data: {
          id: `reasoning-${stepEventId}`,
          stepId: step?.id,
          reasoningText: reasoning || "Analyzing query...",
          reasoningType: "analysis",
          search: [],
        },
      });

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        system: `Analyze if this query requires deep web research or can be answered directly.

NEEDS DEEP SEARCH:
- Current/recent events or news
- Questions requiring multiple authoritative sources
- Research topics needing comprehensive analysis
- Explicit requests for detailed investigation or deep search
- Questions about recent developments (2024-2025)
- Explicit phrases like "do a deep search", "research this", "generate a report"
- Any query that seems to want detailed, sourced information

CAN ANSWER DIRECTLY (only if clearly trivial):
- Greetings and casual conversation (e.g., "hello", "how are you?")
- Questions about yourself as an AI
- Very simple factual queries with stable answers

Default to deep search for any uncertainty or research-oriented queries.`,
        prompt: `Query: "${query}"\n\nAnalyze this query.`,
        schema: z.object({
          needsDeepSearch: z.boolean(),
          searchQueries: z
            .array(z.string())
            .max(3)
            .optional()
            .describe("If deep search needed, 2-3 specific search queries"),
        }),
      });

      // Update step reasoning
      if (step) {
        await updateDeepSearchStepReasoning(
          step.id,
          "Steps: " + (object.searchQueries?.join(", ") || "Generating Steps")
        );
      }

      // Mark analysis step as complete
      if (step) {
        await (await progressManager).completeStep(step.id);
        await (await progressManager).emitProgress(writer, "Analysis complete");
      }

      return {
        needsDeepSearch: object.needsDeepSearch,
        ...(object.searchQueries && { searchQueries: object.searchQueries }),
      };
    },
  });

  const webSearchTool = tool({
    description:
      "Search the web for current information. Only call if analyzeQueryTool determined deep search is needed.",
    inputSchema: z.object({
      query: z.string().max(100).describe("Specific search query"),
      originalQuery: z.string().describe("User's original question"),
    }),
    execute: async ({ query, originalQuery }) => {
      const step = await createDeepSearchStep({
        sessionId,
        messageId,
        stepType: DeepSearchStepType.search,
        reasoningText: `Searching: ${query}`,
        executed: false,
        input: { query, originalQuery },
      });

      const stepEventId = randomUUID();

      // Execute Exa search
      let searchResults;

      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `deep-search-reasoning-${stepEventId}`,
        data: {
          stepId: step?.id,
          reasoningText: `Searching the web for: "${query}"`,
          reasoningType: "search",
        },
      });

      const initialResponse = await uniferoWebSearch(query, 5);

      // check the response title is not empty
      const response = initialResponse.results.filter(
        (res) => res.title && res.title.trim() !== ""
      );
      // eslint-disable-next-line prefer-const
      searchResults = response.map((r) => ({
        title: r.title,
        url: r.url,
        favicon: r.favicon || r.og_image || "",
        text: r.content,
        image: r.og_image || undefined,
        publishedDate: undefined,
      }));

      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `reasoning-${stepEventId}`,
        data: {
          stepId: step?.id,
          reasoningText: `Found ${searchResults.length} sources`,
          reasoningType: "search",
          search: searchResults.map((r) => ({
            title: r.title,
            url: r.url,
            favicon: r.favicon || "",
          })),
        },
      });

      for (const result of searchResults) {
        const sourceEventId = randomUUID();
        writer.write({
          type: "data-deepSearchSourcePart",
          id: `source-${sourceEventId}`,
          data: {
            stepId: step?.id,
            name: result.title,
            url: result.url,
            content: result.text,
            favicon: result.favicon,
            images: result.image ? [result.image] : undefined,
          },
        });
      }

      // Save to database
      if (step) {
        await saveDeepSearchSources(
          messageId,
          searchResults.map((r) => ({
            name: r.title || "Untitled",
            url: r.url,
            favicon: r.favicon,
            content: r.text ?? undefined,
            images: r.image ? [r.image] : undefined,
            publishedDate: undefined,
          })),
          step.id
        );

        await updateDeepSearchStepReasoning(
          step.id,
          `Found ${searchResults.length} sources`
        );

        // Mark step as complete and emit progress
        await (await progressManager).completeStep(step.id);
        await (await progressManager).emitProgress(writer, "Search completed");
      }

      return {
        sources: searchResults.map((r) => ({
          title: r.title,
          url: r.url,
          content: r.text?.slice(0, 1500) || "",
        })),
        searchQuery: query,
        originalQuery,
      };
    },
  });

  // Tool 3: Synthesize findings
  const synthesizeTool = tool({
    description:
      "Analyze and synthesize all search results. Call after all searches complete.",
    inputSchema: z.object({
      originalQuery: z.string(),
      findings: z.string().describe("All search results combined"),
      reasoning: z
        .string()
        .optional()
        .describe("Optional reasoning for synthesis"),
    }),
    execute: async ({ originalQuery, findings, reasoning }) => {
      const step = await createDeepSearchStep({
        sessionId,
        messageId,
        stepType: DeepSearchStepType.evaluate,
        reasoningText: reasoning || "Synthesizing findings...",
        executed: false,
        input: { originalQuery, findings },
      });

      const stepEventId = randomUUID();

      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `reasoning-${stepEventId}`,
        data: {
          stepId: step?.id,
          reasoningText: reasoning || "Synthesizing findings...",
          reasoningType: "evaluation",
          search: [],
        },
      });

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        prompt: `Question: "${originalQuery}"

Research findings:
${findings.slice(0, 2000)}

Extract 3-5 key insights that directly answer the question.`,
        schema: z.object({
          insights: z.array(z.string()).min(2).max(5),
          synthesis: z.string().max(250),
        }),
      });

      if (step) {
        await updateDeepSearchStepReasoning(step.id, object.synthesis);

        // Mark step as complete and emit progress
        await (await progressManager).completeStep(step.id);
        await (
          await progressManager
        ).emitProgress(writer, "Synthesis complete");
      }

      return {
        insights: object.insights,
        synthesis: object.synthesis,
        originalQuery,
      };
    },
  });

  // Tool 4: Generate final report
  const generateReportTool = tool({
    description:
      "Create comprehensive response based on synthesis. Call this last to complete deep search.",
    inputSchema: z.object({
      originalQuery: z.string(),
      synthesis: z.string(),
      insights: z.array(z.string()),
    }),
    execute: async ({ originalQuery, synthesis, insights }) => {
      const step = await createDeepSearchStep({
        sessionId,
        messageId,
        stepType: DeepSearchStepType.report,
        reasoningText: "Generating report...",
        executed: false,
        input: { originalQuery, synthesis, insights },
      });

      const stepEventId = randomUUID();

      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `reasoning-${stepEventId}`,
        data: {
          stepId: step?.id,
          reasoningText: "Creating comprehensive report",
          reasoningType: "report",
          search: [],
        },
      });

      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: `Create a comprehensive response to: "${originalQuery}"

Key insights:
${insights.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}

Synthesis: ${synthesis}

Format as clear, informative response with markdown structure.`,
      });

      // Stream report
      const reportEventId = randomUUID();
      writer.write({
        type: "data-deepSearchReportPart",
        id: `report-${reportEventId}`,
        data: {
          type: "deep-search-report",
          id: `report-${reportEventId}`,
          reportText: text,
        },
      });

      if (step) {
        await updateDeepSearchStepReasoning(step.id, "Report completed", {
          report: text,
        });

        // Mark step as complete and emit final progress
        await (await progressManager).completeStep(step.id);
        await (await progressManager).markComplete();
        await (await progressManager).emitProgress(writer, "Complete", "done");
      }

      return {
        report: text,
        completed: true,
      };
    },
  });

  return {
    analyzeQueryTool,
    webSearchTool,
    synthesizeTool,
    generateReportTool,
  };
}
