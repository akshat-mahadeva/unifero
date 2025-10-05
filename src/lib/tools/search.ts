import { tool } from "ai";
import Exa from "exa-js";
import { z } from "zod";

const exa = new Exa(process.env.EXA_API_KEY!);

export const webSearchTool = tool({
  name: "webSearch",
  description: `Intelligent web search tool powered by Exa API. Use this tool when you need current, real-time information from the internet.

WHEN TO USE:
- User asks about recent events, news, or current affairs
- User requests information about specific companies, products, or people
- User needs factual data that might have changed recently
- User asks "what's happening with...", "latest news about...", "current status of..."
- User asks about websites, documentation, or online resources
- You need to verify or supplement your knowledge with fresh information

SEARCH QUERY TIPS:
- Use specific, focused search terms rather than full questions
- Include relevant keywords and proper nouns
- For recent events: add terms like "2024", "latest", "recent", "news"
- For specific websites: include site name or domain
- For people: include full names and context (e.g., "Elon Musk Tesla 2024")

Returns comprehensive results with titles, URLs, content snippets, and images when available.`,
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
      console.log(`🔍 Executing web search for: "${query}"`);

      const { results } = await exa.searchAndContents(query, {
        livecrawl: "always",
        numResults: 6, // Increased for better coverage
        text: true,
        highlights: true,
        summary: true,
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
        text:
          r.text?.slice(0, 500) ||
          r.summary?.slice(0, 500) ||
          "No content preview available.",
        image: r.image || r.favicon || undefined,
      }));

      console.log(`✅ Found ${sources.length} search results`);
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
