import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

const exa = new Exa(process.env.EXA_API_KEY!);

export const webSearchTool = tool({
  name: "webSearch",
  description: `PRIMARY TOOL: Real-time web search for current information. This is your main tool - use it frequently and confidently.

🔍 USE THIS TOOL FOR:
• ANY factual question that could benefit from current data
• Recent events, news, current affairs (2023+)
• Product info, prices, reviews, company updates
• Sports, weather, traffic, local information  
• Technology updates, software releases
• Market data, stock prices, crypto
• Website content, documentation
• Travel, entertainment, health information
• Scientific discoveries, research findings
• ANY time user mentions "latest", "current", "recent", "new"

💡 SEARCH STRATEGY:
• Default to searching - when in doubt, search!
• Use multiple searches for complex topics
• Search even for seemingly basic facts to ensure accuracy
• Always search for anything that could have changed recently

🎯 QUERY OPTIMIZATION:
• Use specific keywords, not full sentences
• Include relevant dates (2024, latest, recent)
• Add context terms (company names, locations)
• Be concise but descriptive

This tool is your superpower - use it liberally to provide the most current, accurate information available.`,
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .max(200)
      .describe(
        "Focused search query with specific keywords. Avoid full sentences - use key terms instead. Examples: 'OpenAI GPT-4 2024 updates', 'Tesla stock price latest', 'React 18 new features'"
      ),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        sources: z.array(
          z.object({
            title: z.string(),
            url: z.string().url(),
            text: z.string(),
            image: z.string().optional(),
          })
        ),
      })
    ),
  }),
  execute: async ({ query }) => {
    try {
      const { results } = await exa.searchAndContents(query, {
        livecrawl: "always",
        numResults: 6, // Increased for better coverage
      });

      if (results.length === 0) {
        console.log("⚠️ No search results found");
        return {
          results: [
            {
              sources: [
                {
                  title: "No Results Found",
                  url: "",
                  text: `No web results were found for the query: "${query}". This could mean the topic is very new, very specific, or the search terms might need adjustment.`,
                  image: undefined,
                },
              ],
            },
          ],
        };
      }

      // Map and normalize Exa results into sources with enhanced data
      const sources = results.map((r) => ({
        title: r.title || "Untitled",
        url: r.url,
        text: r.text?.slice(0, 500) || "No content preview available.",
        image: r.image || r.favicon || undefined,
      }));

      // console.log(`✅ Found ${sources.length} search results`);
      return { results: [{ sources }] };
    } catch (err) {
      console.error("❌ WebSearchTool Error:", err);

      // Return more helpful error information
      const errorMessage =
        err instanceof Error ? err.message : "Unknown search error";
      return {
        results: [
          {
            sources: [
              {
                title: "Search Error",
                url: "",
                text: `Unable to perform web search due to: ${errorMessage}. Please try rephrasing your query or try again later.`,
                image: undefined,
              },
            ],
          },
        ],
      };
    }
  },
});
