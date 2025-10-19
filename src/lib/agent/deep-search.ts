// import { updateDeepSearchMessageProgress } from "@/actions/deep-search.actions";
import { openai } from "@ai-sdk/openai";
import { generateObject, tool, UIMessageStreamWriter } from "ai";
import Exa from "exa-js";
import z from "zod";

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

export function getTools(writer: UIMessageStreamWriter, messageId: string) {
  // sentiment analysis tool
  const sentimentAnalysisTool = tool({
    description: "Analyze the sentiment of the given text.",
    inputSchema: z.object({
      prompt: z.string().min(1, "Text cannot be empty"),
      reasoning: z
        .string()
        .optional()
        .describe("Optional reasoning text from main agent"),
    }),
    execute: async ({ prompt, reasoning }) => {
      writer.write({
        type: "data-deepSearchDataPart",
        id: `deep-search-sentiment-${messageId}`,
        data: {
          id: `deep-search-sentiment-${messageId}`,
          progress: 0,
          messageId,
          text: reasoning,
          isDeepSearchInitiated: true,
        },
      });

      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `deep-search-reasoning-${messageId}`,
        data: {
          id: `deep-search-reasoning-${messageId}`,
          reasoningText: reasoning || "Analysing query...",
          reasoningType: "analysis",
        },
      });

      const { object } = await generateObject({
        model: openai("gpt-3.5-turbo"),
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
        id: `deep-search-reasoning-${messageId}`,
        data: {
          id: `deep-search-reasoning-${messageId}`,
          reasoningText: object.reasoningText || "Analysing query...",
          reasoningType: "analysis",
        },
      });

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
        model: openai("gpt-3.5-turbo"),
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
    description: "Search the web for up-to-date information",
    inputSchema: z.object({
      reasoningText: z
        .string()
        .optional()
        .describe("Optional reasoning text from main agent"),
      query: z.string().min(1).max(100).describe("The search query"),
    }),
    execute: async ({ query }) => {
      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `deep-search-reasoning-search-${messageId}`,
        data: {
          id: `deep-search-reasoning-search-${messageId}`,
          reasoningText: `Searching the web for: "${query}"`,
          reasoningType: "search",
        },
      });
      const { results } = await exa.searchAndContents(query, {
        livecrawl: "auto",
        numResults: 2,
      });

      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `deep-search-reasoning-search-${messageId}`,
        data: {
          id: `deep-search-reasoning-search-${messageId}`,
          search: results.map((result) => ({
            title: result.title,
            url: result.url,
            favicon: result.favicon,
          })),
          reasoningType: "search",
        },
      });

      writer.write({
        type: "data-deepSearchSourcePart",
        id: `deep-search-source-search-${messageId}`,
        data: {
          id: `deep-search-source-search-${messageId}`,
          sources: results.map((result) => ({
            id: result.id,
            title: result.title,
            url: result.url,
            favicon: result.favicon,
            text: result.text,
            image: result.image,
            publishedDate: result.publishedDate,
          })),
        },
      });

      return results.map((result) => ({
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
      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `deep-search-reasoning-analysis-${messageId}`,
        data: {
          id: `deep-search-reasoning-analysis-${messageId}`,
          reasoningText: reasoningText || "Analysing gathered information...",
          reasoningType: "analysis",
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
      writer.write({
        type: "data-deepSearchReasoningPart",
        id: `deep-search-reasoning-analysis-${messageId}`,
        data: {
          id: `deep-search-reasoning-analysis-${messageId}`,
          reasoningText: reasoningText || "Analysing gathered information...",
          reasoningType: "analysis",
        },
      });

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        prompt: `Based on the following analysis, generate a comprehensive report:\n\n${analysis}\n\nThe report should be well-structured and cover all key aspects.`,
        schema: z.object({
          reportText: z.string(),
        }),
      });
      writer.write({
        type: "data-deepSearchReportPart",
        id: `deep-search-report-${messageId}`,
        data: {
          id: `deep-search-report-${messageId}`,
          content: object.reportText,
        },
      });

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
