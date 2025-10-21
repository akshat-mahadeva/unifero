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
      "Analyze query to check if deep research needed. Call first always.",
    inputSchema: z.object({
      query: z.string().describe("User's question"),
      reasoning: z.string().optional().describe("Optional reasoning"),
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
        system: `Decide if query needs deep web search.

NEEDS DEEP SEARCH:
- Recent events/news (2024-2025)
- Multiple sources needed
- Research/deep investigation
- Phrases like "deep search", "research", "report"

ANSWER DIRECTLY:
- Greetings
- Simple facts
- About yourself

Default to deep search if unsure.`,
        prompt: `Query: "${query}"`,
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
    description: "Search web for info. Call only if deep search needed.",
    inputSchema: z.object({
      query: z.string().max(100).describe("Search query"),
      originalQuery: z.string().describe("Original question"),
      numberOfResults: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe("Results count (default 2)"),
    }),
    execute: async ({ query, originalQuery, numberOfResults }) => {
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

      const safeNumberOfResults = numberOfResults ?? 2;
      const initialResponse = await uniferoWebSearch(
        query,
        safeNumberOfResults > 5 ? 5 : safeNumberOfResults
      );

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
    description: "Synthesize search results. Call after all searches.",
    inputSchema: z.object({
      originalQuery: z.string(),
      findings: z.string().describe("Combined search results"),
      reasoning: z.string().optional().describe("Optional reasoning"),
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

Findings:
${findings.slice(0, 2000)}

Extract 3-5 key insights.`,
        schema: z.object({
          insights: z.array(z.string()).min(2).max(5),
          synthesis: z.string().max(250),
        }),
      });

      if (step) {
        await updateDeepSearchStepReasoning(
          step.id,
          object.synthesis || "Analysing results..."
        );

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
    description: "Create final response from synthesis. Call last.",
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
        prompt: `Answer: "${originalQuery}"

Insights:
${insights.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}

Synthesis: ${synthesis}

Provide clear response with markdown.`,
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
