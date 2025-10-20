// import { updateDeepSearchMessageProgress } from "@/actions/deep-search.actions";
import {
  saveDeepSearchSources,
  createDeepSearchStep,
  updateDeepSearchStepReasoning,
  updateAssistantMessageContent,
} from "@/actions/deep-search.actions";
import { openai } from "@ai-sdk/openai";
import { generateObject, tool, UIMessageStreamWriter } from "ai";
import Exa from "exa-js";
import z from "zod";
import { DeepSearchStepType } from "@/types/deep-search";
import { randomUUID } from "crypto";

export const exa = new Exa(process.env.EXA_API_KEY!);

// export async function runProgressUpdater(
//   sessionId: string,
//   messageId: string,
//   writer: UIMessageStreamWriter
// ) {
//   writer.write({
//     type: "data-deepSearchDataPart",
//     id: `deep-search-${messageId}`,
//     data: {
//       progress: 0,
//       text: "",
//       state: "streaming",
//       type: "deep-search",
//     },
//   });

//   await updateDeepSearchMessageProgress(
//     sessionId,
//     messageId,
//     0,
//     false,
//     true // isDeepSearchInitiated = true
//   );

//   const totalDuration = 2 * 60 * 1000; // 2 minutes
//   const updateInterval = 10 * 1000; // 10 seconds
//   const steps = Math.floor(totalDuration / updateInterval);

//   for (let i = 1; i <= steps; i++) {
//     await new Promise((resolve) => setTimeout(resolve, updateInterval));

//     const progress = Math.min(99, Math.floor((i / steps) * 100));

//     try {
//       // Update database
//       await updateDeepSearchMessageProgress(
//         sessionId,
//         messageId,
//         progress,
//         false
//       );

//       // Stream progress update to client
//       writer.write({
//         type: "data-deepSearchDataPart",
//         id: `deep-search-${messageId}`,
//         data: {
//           progress,
//           messageId,
//           isDeepSearchInitiated: true,
//         },
//       });

//       console.log(`Progress streamed: ${progress}% for message ${messageId}`);
//     } catch (err) {
//       console.error("Failed to update progress:", err);
//       break; // Stop on error
//     }
//   }

//   // Mark as completed
//   await updateDeepSearchMessageProgress(sessionId, messageId, 100, true);

//   // Send final completion update
//   writer.write({
//     type: "data-deepSearchDataPart",
//     id: `deep-search-${messageId}`,
//     data: {
//       progress: "100",
//       text: "",
//       state: "done",
//       type: "deep-search",
//     },
//   });
// }

export function getTools(
  writer: UIMessageStreamWriter,
  sessionId: string,
  messageId: string
) {
  // sentiment analysis tool
  const sentimentAnalysisTool = tool({
    description:
      "ALWAYS call this FIRST to analyze the user's query and determine the research approach. This is mandatory for every query.",
    inputSchema: z.object({
      prompt: z.string().min(1, "Text cannot be empty"),
      reasoning: z
        .string()
        .optional()
        .describe("Optional reasoning text from main agent"),
    }),
    execute: async ({ prompt, reasoning }) => {
      const step = await createDeepSearchStep({
        sessionId,
        messageId,
        stepType: DeepSearchStepType.analyze,
        reasoningText: reasoning || "Analysing query...",
        executed: false,
        input: { prompt },
      });

      const stepEventId = randomUUID();

      writer.write({
        type: "data-deepSearchDataPart",
        id: `deep-search-data-${stepEventId}`,
        data: {
          id: `deep-search-data-${stepEventId}`,
          progress: 0,
          messageId,
          text: reasoning,
          isDeepSearchInitiated: true,
        },
      });

      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `deep-search-reasoning-${stepEventId}`,
        data: {
          id: `deep-search-reasoning-${stepEventId}`,
          stepId: step?.id,
          reasoningText: reasoning || "Analysing query...",
          reasoningType: "analysis",
          search: [],
        },
      });

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        system: "You generate three notifications for a messages app.",
        prompt,
        schema: z.object({
          isDeepSearchNeeded: z.boolean(),
          needMoreInfo: z.boolean(),
          sentiment: z.enum(["conversational", "neutral", "formal"]),
          reasoningText: z.string(),
        }),
      });

      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `deep-search-reasoning-${stepEventId}`,
        data: {
          id: `deep-search-reasoning-${stepEventId}`,
          stepId: step?.id,
          reasoningText: object.reasoningText || "Analysing query...",
          reasoningType: "analysis",
          search: [],
        },
      });

      if (step) {
        await updateDeepSearchStepReasoning(step.id, object.reasoningText);
      }

      return object;
    },
  });

  // research planner tool
  const researchPlannerTool = tool({
    description: "Generate steps for deep search based on the given query.",
    inputSchema: z.object({
      query: z.string().min(1, "Query cannot be empty"),
    }),
    execute: async ({ query }) => {
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        system:
          "You are an assistant that generates detailed steps for deep search tasks.",
        prompt: `Generate a list of steps to perform a deep search for the following query: "${query}"`,
        schema: z.object({
          steps: z.array(z.string()),
          isDeepSearchInitiated: z.boolean(),
          reasoningText: z.string(),
        }),
      });

      writer.write({
        type: "data-deepSearchDataPart",
        id: `deep-search-steps-${messageId}`,
        data: {
          progress: 0,
          messageId,
          isDeepSearchInitiated: true,
        },
      });

      return result.toJsonResponse();
    },
  });

  const webSearchTool = tool({
    description:
      "Search the web for up-to-date information. MANDATORY: Call this tool for EVERY user query to gather relevant sources and information.",
    inputSchema: z.object({
      reasoningText: z
        .string()
        .optional()
        .describe("Optional reasoning text from main agent"),
      query: z.string().min(1).max(100).describe("The search query"),
    }),
    execute: async ({ query }) => {
      const step = await createDeepSearchStep({
        sessionId,
        messageId,
        stepType: DeepSearchStepType.search,
        reasoningText: `Searching the web for: "${query}"`,
        executed: false,
        input: { query },
      });

      const stepEventId = randomUUID();

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

      const searchResults = mockResults;

      // Comment out actual Exa call
      // const { results } = await exa.searchAndContents(query, {
      //   livecrawl: "auto",
      //   numResults: 2,
      // });
      // const searchResults = results;

      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `deep-search-reasoning-${stepEventId}`,
        data: {
          stepId: step?.id,
          reasoningText: `Found ${searchResults.length} relevant sources for "${query}"`,
          reasoningType: "search",
          search: searchResults.map((result) => ({
            title: result.title,
            url: result.url,
            favicon: result.favicon || "",
          })),
        },
      });

      // Stream each source individually with unique IDs
      for (const result of searchResults) {
        const sourceEventId = randomUUID();
        writer.write({
          type: "data-deepSearchSourcePart",
          id: `deep-search-source-${sourceEventId}`,
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

      // Save sources to DB with stepId to link them to this specific step
      if (step) {
        await saveDeepSearchSources(
          messageId,
          searchResults.map((result) => ({
            name: result.title || "Untitled",
            url: result.url,
            favicon: result.favicon,
            content: result.text,
            images: result.image ? [result.image] : undefined,
            publishedDate: result.publishedDate
              ? new Date(result.publishedDate)
              : undefined,
          })),
          step.id // Pass stepId to link sources to this step
        );
      }

      if (step) {
        await updateDeepSearchStepReasoning(
          step.id,
          `Searched for "${query}" and found ${searchResults.length} sources.`
        );
      }

      return searchResults.map((result) => ({
        title: result.title,
        url: result.url,
        content: result.text.slice(0, 1000),
        image: result.image,
        favicon: result.favicon,
        publishedDate: result.publishedDate,
      }));
    },
  });

  const analyseAndEvaluateTool = tool({
    description: "Analyse and evaluate the gathered information",
    inputSchema: z.object({
      reasoningText: z
        .string()
        .optional()
        .describe("Optional reasoning text from main agent"),
      data: z.string().min(1).describe("The data to be analysed"),
    }),
    execute: async ({ data, reasoningText }) => {
      const step = await createDeepSearchStep({
        sessionId,
        messageId,
        stepType: DeepSearchStepType.evaluate,
        reasoningText: reasoningText || "Analysing gathered information...",
        executed: false,
        input: { data },
      });

      const stepEventId = randomUUID();

      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `deep-search-reasoning-${stepEventId}`,
        data: {
          id: `deep-search-reasoning-${stepEventId}`,
          stepId: step?.id,
          reasoningText: reasoningText || "Analysing gathered information...",
          reasoningType: "evaluation",
          search: [],
        },
      });
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        prompt: `Analyse and evaluate the following information:\n\n${data}\n\nProvide a concise summary highlighting the key points and insights.`,
        schema: z.object({
          text: z.string(),
          reasoningText: z.string(),
          evaluateText: z.string(),
        }),
      });

      if (step) {
        await updateDeepSearchStepReasoning(
          step.id,
          result.object.reasoningText
        );
      }

      return result.toJsonResponse();
    },
  });

  const generateReportTool = tool({
    description: "Generate a comprehensive report based on the analysis",
    inputSchema: z.object({
      reasoningText: z
        .string()
        .optional()
        .describe("Optional reasoning text from main agent"),
      analysis: z
        .string()
        .min(1)
        .describe("The analysis to base the report on"),
    }),
    execute: async ({ analysis, reasoningText }) => {
      const step = await createDeepSearchStep({
        sessionId,
        messageId,
        stepType: DeepSearchStepType.report,
        reasoningText: reasoningText || "Generating comprehensive report...",
        executed: false,
        input: { analysis },
      });

      const stepEventId = randomUUID();

      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `deep-search-reasoning-${stepEventId}`,
        data: {
          id: `deep-search-reasoning-${stepEventId}`,
          stepId: step?.id,
          reasoningText: reasoningText || "Generating comprehensive report...",
          reasoningType: "report",
          search: [],
        },
      });

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        prompt: `Based on the following analysis, generate a comprehensive report:\n\n${analysis}\n\nThe report should be well-structured and cover all key aspects.`,
        schema: z.object({
          reportText: z.string(),
        }),
      });

      const reportEventId = randomUUID();

      writer.write({
        type: "data-deepSearchReportPart",
        id: `deep-search-report-${reportEventId}`,
        data: {
          id: `deep-search-report-${reportEventId}`,
          content: object.reportText,
        },
      });

      // Save report to message content
      await updateAssistantMessageContent(messageId, object.reportText);

      if (step) {
        await updateDeepSearchStepReasoning(
          step.id,
          "Report generated successfully."
        );
      }

      return object;
    },
  });

  return {
    sentimentAnalysisTool,
    researchPlannerTool,
    webSearchTool,
    analyseAndEvaluateTool,
    generateReportTool,
  };
}
