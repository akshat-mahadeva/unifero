// import { updateDeepSearchMessageProgress } from "@/actions/deep-search.actions";
import {
  saveDeepSearchSources,
  createDeepSearchStep,
  updateDeepSearchStepReasoning,
  enableDeepSearch,
  updateDeepSearchMessageProgress,
} from "@/actions/deep-search.actions";
import { openai } from "@ai-sdk/openai";
import { generateObject, generateText, tool, UIMessageStreamWriter } from "ai";
import Exa from "exa-js";
import z from "zod";
import { DeepSearchStepType } from "@/types/deep-search";
import { randomUUID } from "crypto";

export const exa = new Exa(process.env.EXA_API_KEY!);

// Progress calculation helper
export class ProgressCalculator {
  private phases = {
    analysis: { weight: 15 },
    research: { weight: 40 },
    synthesis: { weight: 25 },
    report: { weight: 20 },
  };

  private currentProgress = 0;
  private totalSearches = 1;
  private completedSearches = 0;

  setTotalSearches(count: number) {
    this.totalSearches = Math.max(1, count);
  }

  getAnalysisProgress(): number {
    this.currentProgress = this.phases.analysis.weight;
    return this.currentProgress;
  }

  getSearchProgress(): number {
    this.completedSearches++;
    const searchProgress =
      (this.completedSearches / this.totalSearches) *
      this.phases.research.weight;
    this.currentProgress = this.phases.analysis.weight + searchProgress;
    return Math.floor(this.currentProgress);
  }

  getSynthesisProgress(): number {
    this.currentProgress =
      this.phases.analysis.weight +
      this.phases.research.weight +
      this.phases.synthesis.weight;
    return Math.floor(this.currentProgress);
  }

  getReportProgress(): number {
    return 100;
  }
}

export function getTools(
  writer: UIMessageStreamWriter,
  sessionId: string,
  messageId: string,
  progressCalc: ProgressCalculator
) {
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
      console.log("[ANALYZE] Starting query analysis...");

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

      console.log(
        `[ANALYZE] Result: ${object.needsDeepSearch ? "DEEP SEARCH" : "SIMPLE"}`
      );

      // Update step reasoning
      if (step) {
        await updateDeepSearchStepReasoning(
          step.id,
          "Steps: " + (object.searchQueries?.join(", ") || "Generating Steps")
        );
      }

      // If deep search needed, enable it and set progress
      if (object.needsDeepSearch) {
        await enableDeepSearch(sessionId, messageId);

        const searchCount = object.searchQueries?.length || 1;
        progressCalc.setTotalSearches(searchCount);

        const progress = progressCalc.getAnalysisProgress();
        await updateDeepSearchMessageProgress(
          sessionId,
          messageId,
          progress,
          false
        );

        writer.write({
          type: "data-deepSearchDataPart",
          id: `data-${stepEventId}`,
          data: {
            id: `data-${stepEventId}`,
            progress,
            messageId,
            text: "Deep search initiated",
            isDeepSearchInitiated: true,
          },
        });

        writer.write({
          type: "data-deepSearchReasoningPart",
          id: `reasoning-${stepEventId}`,
          data: {
            id: `reasoning-${stepEventId}`,
            stepId: step?.id,
            reasoningText:
              "Generating Steps: " + object.searchQueries?.join(", "),
            reasoningType: "analysis",
            search: [],
          },
        });
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
      console.log(`[SEARCH] Executing search: "${query}"`);
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

      // Mock Exa results for testing
      const mockResults = [
        {
          id: 1,
          title: "OpenAI Research Paper",
          url: "https://openai.com/research/gpt-4",
          favicon:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSobT6Nq7W-FJnK5lLapZlwySLwB0W4sKCYDg&s",
          text: "Detailed analysis of GPT-4 capabilities.",
          image: undefined,
          publishedDate: "2024-02-20",
        },

        {
          id: 2,
          title: "Google DeepMind",
          url: "https://deepmind.google/",
          favicon: "https://www.google.com/favicon.ico",
          text: "Advancements in AI and machine learning.",
          image: undefined,
          publishedDate: "2024-01-15",
        },
      ];

      // eslint-disable-next-line prefer-const
      searchResults = mockResults;

      // Comment out actual Exa call
      // const { results } = await exa.searchAndContents(query, {
      //   livecrawl: "auto",
      //   numResults: 2,
      // });
      // const searchResults = results;

      // Stream sources to UI
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
            content: r.text,
            images: r.image ? [r.image] : undefined,
            publishedDate: r.publishedDate
              ? new Date(r.publishedDate)
              : undefined,
          })),
          step.id
        );

        await updateDeepSearchStepReasoning(
          step.id,
          `Found ${searchResults.length} sources`
        );
      }

      // Update progress
      const progress = progressCalc.getSearchProgress();
      await updateDeepSearchMessageProgress(
        sessionId,
        messageId,
        progress,
        false
      );

      writer.write({
        type: "data-deepSearchDataPart",
        id: `data-${stepEventId}`,
        data: {
          id: `data-${stepEventId}`,
          progress,
          messageId,
          text: `Search completed`,
          isDeepSearchInitiated: true,
        },
      });

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
      console.log("[SYNTHESIZE] Analyzing findings...");

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
      }

      // Stream updated reasoning
      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `reasoning-final-${stepEventId}`,
        data: {
          stepId: step?.id,
          reasoningText: object.synthesis,
          reasoningType: "evaluation",
          search: [],
        },
      });

      // Update progress
      const progress = progressCalc.getSynthesisProgress();
      await updateDeepSearchMessageProgress(
        sessionId,
        messageId,
        progress,
        false
      );

      writer.write({
        type: "data-deepSearchDataPart",
        id: `data-${stepEventId}`,
        data: {
          id: `data-${stepEventId}`,
          progress,
          messageId,
          text: "Synthesis complete",
          isDeepSearchInitiated: true,
        },
      });

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
      console.log("[REPORT] Generating final report...");

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
      }

      // Stream updated reasoning
      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `reasoning-final-${stepEventId}`,
        data: {
          stepId: step?.id,
          reasoningText: "Report completed",
          reasoningType: "report",
          search: [],
        },
      });

      // Final progress
      const progress = progressCalc.getReportProgress();
      await updateDeepSearchMessageProgress(
        sessionId,
        messageId,
        progress,
        true
      );

      writer.write({
        type: "data-deepSearchDataPart",
        id: `data-final-${reportEventId}`,
        data: {
          id: `data-final-${reportEventId}`,
          progress: 100,
          messageId,
          text: "Complete",
          state: "done",
          isDeepSearchInitiated: true,
        },
      });

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
