import { uniferoWebSearchResponse } from "@/types/unifero-search";

const uniferoSearchUrl = process.env.UNIFERO_WEB_SEARCH_URL!;

export async function uniferoWebSearch(query: string, limit = 3) {
  const response = await fetch(uniferoSearchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "search",
      query: query,
      limit,
    }),
  });

  if (!response.ok) {
    throw new Error(`Web search failed with status ${response.status}`);
  }

  const data = await response.json();
  return data as uniferoWebSearchResponse;
}
